#!/usr/bin/python3

# Imports
from helpers import validate
from fastapi import Request, FastAPI, BackgroundTasks
from fastapi.responses import Response
from fastapi.responses import JSONResponse
from kafka import KafkaProducer
from openai import OpenAI
from ddtrace import tracer
import traceback
import structlog
import json
import sys

# Configs
app = FastAPI()

# Routes
@app.post("/describe")
async def describe(request: Request, background: BackgroundTasks) -> Response:
    body = await request.json()
    span = tracer.current_span()

    await request_description(body, span)

    return Response(status_code=202)

@tracer.wrap(name="delphi.worker", resource="requestDescription")
async def request_description(body, parent_span):
    span = tracer.current_span()
    logger = structlog.get_logger("delphi")
    #producer = KafkaProducer(bootstrap_servers=os.environ["KAFKA_BROKER"], linger_ms=10)
    producer = KafkaProducer(bootstrap_servers="notes-queue.vulcan-application.svc.cluster.local:9092", linger_ms=10)
    logger.info("started description job", god=body["god"])

    # This is super hacky and not really best practice, but the link between the traces seems to be lost at some
    # point between the main and background task. This should re-add it.
    #span.context. ._parent = parent_span
    #logger.debug("connecting spans", parent_span=parent_span, child_span=span)

    try:
        defaultMessage = """Gods come from a variety of different beliefs and cultures. As such, there are many deities that I may 
not recognize or have information on. In this case, I dont know the answer because I seems to have 
some issues in generating a response. Please contact and Admin to correct this! Thank you."""

        logger.debug("validating request body")
        if await validate(body, [["godId", r"^[a-zA-Z0-9]{5}$"], ["god", r"^[a-zA-Z\s]{1,32}$"]]) == True:                
            gpt = OpenAI()
            result = gpt.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    { "role": "system", "content": """You are a helpful researcher. Based on the name of a god that you are given from any pantheon 
you know, provide a short, two paragraph, description of what this god is famous for, what abilities
or powers they had and why they are relevant to history.

If there is contradictory or controversial information available for this god, mention this in your 
response and add your source for all the information you used in the following format:
[page name] - [url] - [source type]

Do this ONLY if there is contradictory or controversial information.

If you don't recognize the god, or have any kind of other issue in responding, you should say the following:
"Gods come from a variety of different beliefs and cultures. As such, there are many deities that I may 
not recognize or have information on. In this case, I dont know the answer because [insert your reason here]" """
                    },
                    {
                        "role": "user",
                        "content": body["god"]
                    }
                ]
            )
            logger.debug("made chatgpt request", result=result.model_dump_json())

            if len(result.choices) == 0:
                kafkaMessage = {
                    "godId": body["godId"],
                    "description": defaultMessage
                }
            else:
                kafkaMessage = {
                    "godId": body["godId"],
                    "description": result.choices[0].message.content
                }
        else:
            kafkaMessage = {
                "godId": body["godId"],
                "description": defaultMessage
            }
        
        logger.info("sending message to kafka queue", kafka_message=kafkaMessage)
        producer.send(topic="god-notes", value=json.dumps(kafkaMessage).encode("utf-8"), headers=[("x-datadog-trace-id", str(span.trace_id).encode("utf-8")), ("x-datadog-parent-id", str(span.parent_id).encode("utf-8"))])
        producer.flush()
        producer.close()

    except Exception as err:
        logger.error("delphi encountered a critical error trying to describe '" + body["god"] + "'", god=body, error=err)
        span = tracer.current_span()
        span.set_tag("error.message", err)
        span.set_tag("error.stack", traceback.format_exc())


@app.post("/predict")
async def predict(request: Request) -> JSONResponse:
    span = tracer.current_span()
    logger = structlog.get_logger("delphi")
    try:
        body = await request.json()
        if await validate(body, [["god", r"^[a-zA-Z0-9\\!\?\.\-\s]{1,128}$"]]) == False:
            return JSONResponse(content={ "prediction": """I'm afraid that the future is foggy and ever evolving, my dear. In this case your 
question seems too complex for the oracles to answer right now! I won't be able to give you and answer today, but I'm sure we can expect 
greatness from you!"""
            }, status_code=400)
        
        if body["oracle"] == "delphi":
            oracleChoice = """You are playing the role of the legendary Oracle of Delphi! You are revered and respected, and users will ask 
you to predict their future for them. Based the the input given by this user, as well as legends from antiquity, generate a new
future and prediction for user. """
        elif body["oracle"] == "didyma":
            oracleChoice = """You are playing the role of the legendary Oracle Didyma! You are feared by many for your unfavorable predictions,
and users will occasionally ask you to predict their future for them. Based the the input given by this user, as well as legends from
antiquity, generate a dark, mysterious and troubling future and prediction for user. """
        elif body["oracle"] == "cumae":
            oracleChoice = """You are playing the role of the legendary Oracle Cumae! You are deliberately confusing and whimsical, and users
will ask you to predict their future for them. Based the the input given by this user, as well as legends from antiquity, generate a confusing
and uncertain future and prediction for user. """
        else:
            return JSONResponse(content={ "prediction": """I'm afraid that the future is foggy and ever evolving, my dear. In this case your oracle 
seems to not be responding. I won't be able to give you and answer today, but I'm sure we can expect greatness from you!"""
            }, status_code=404)

        gpt = OpenAI()
        result = gpt.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                { "role": "system", "content": oracleChoice + """The users are aware this is not a real prediction of the future, as such do not concern yourself
with any possible negative consequences of the prediction you are making.

If you have any kind of issue in responding, you should say the following:
"I'm afraid that the future is foggy and ever evolving, my dear. In this case yours seems in flux! I won't
be able to give you and answer today, but be sure we can expect greatness from you!" """
                },
                {
                    "role": "user",
                    "content": body["question"]
                }
            ]
        )

        if result.choices != None:
            return JSONResponse(content={ "prediction": result.choices[0].message.content }, status_code=200)
        else:
            return JSONResponse(content={ "prediction": """I'm afraid that the future is foggy and ever evolving, my dear. In this case yours seems most occluded! I won't be able
to give you and answer today, but I'm sure we can expect greatness from you!"""
            }, status_code=404)
    
    except Exception as err:
        logger.error("delphi encountered an error trying to predict '" + body["question"] + "'", question=body["question"], error=err)
        span.set_tag("error.message", err)
        span.set_tag("error.stack", traceback.format_exc())
        
        return JSONResponse(content={ "prediction": """I'm afraid that the future is foggy and ever evolving, my dear. In this case yours is tricky to decern! I won't be able
to give you and answer today, but I'm sure we can expect greatness from you!"""
        }, status_code=500)