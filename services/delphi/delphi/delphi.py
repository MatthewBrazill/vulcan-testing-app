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
import os

# Configs
app = FastAPI()

# Routes
@app.post("/describe")
async def describe(request: Request, background: BackgroundTasks) -> Response:
    body = await request.json()
    span = tracer.current_span()
    logger = structlog.get_logger("delphi")

    background.add_task(request_description, body, span.trace_id)
    logger.info("started description creation job", god=body["god"])

    return Response(status_code=202)

@tracer.wrap(name="delphi.worker", resource="request_description")
async def request_description(body, parent_id):
    span = tracer.current_span()
    logger = structlog.get_logger("delphi")

    # This is super hacky and not really best practice, but the link between the traces seems to be lost at some
    # point between the main and background task. This should re-add it.
    span._parent.parent_id = parent_id

    try:
        defaultMessage = """
            Gods come from a variety of different beliefs and cultures. As such, there are many deities that I may 
            not recognize or have information on. In this case, I dont know the answer because I seems to have
            some issues in generating a response. Please contact and Admin to correct this! Thank you.
        """

        if await validate(body, [["godId", r"^[a-zA-Z0-9]{5}$"], ["god", r"^[a-zA-Z\s]{1,32}$"]]) == True:                
            gpt = OpenAI()
            result = gpt.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    { "role": "system", "content": """
                        You are a helpful researcher. Based on the name of a god that you are given from any pantheon 
                        you know, provide a short, two paragraph, description of what this god is famous for, what abilities
                        or powers they had and why they are relevant to history.
                        
                        If there is contradictory or controversial information available for this god, mention this in your 
                        response and add your source for all the information you used in the following format:
                        [page name] - [url] - [source type]
                        
                        Do this ONLY if there is contradictory or controversial information.
                        
                        If you don't recognize the god, or have any kind of other issue in responding, you should say the following:
                        "Gods come from a variety of different beliefs and cultures. As such, there are many deities that I may 
                        not recognize or have information on. In this case, I dont know the answer because [insert your reason here]"
                    """ },
                    {
                        "role": "user",
                        "content": body["god"]
                    }
                ]
            )

            if result.choices == None:
                result = defaultMessage
            else:
                result = result.choices[0].message.content
        else:
            result = defaultMessage
        
        producer = KafkaProducer(bootstrap_servers=os.environ["KAFKA_BROKER"], linger_ms=10)
        producer.send("god-notes", bytes("{\"godId\":\""+body["godId"]+"\",\"description\":\""+result+"\"}", "utf-8"))
        producer.flush()

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
            return JSONResponse(content={ "prediction": """
                I'm afraid that the future is foggy and ever evolving, my dear. In this case yours seems in flux! I won't be able
                to give you and answer today, but I'm sure we can expect greatness from you!
            """}, status_code=400)

        gpt = OpenAI()
        result = gpt.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                { "role": "system", "content": """
                    You are playing the role of the legendary Oracle of Delphi! Revered and respected users will ask 
                    you to predict their future for them. Based the the input of gods chosen by this user, as well as
                    legends from these gods, generate a new future and prediction for user.
                 
                    The users are aware this is not a real prediction of the future, as such do not concern yourself
                    with any possible negative consequences of the prediction you are making.
                    
                    If you have any kind of issue in responding, you should say the following:
                    "I'm afraid that the future is foggy and ever evolving, my dear. In this case yours seems in flux! I won't
                    be able to give you and answer today, but be sure we can expect greatness from you!"
                """ },
                {
                    "role": "user",
                    "content": body["gods"]
                }
            ]
        )

        if result.choices != None:
            return JSONResponse(content={ "prediction": result.choices[0].message }, status_code=200)
        else:
            return JSONResponse(content={ "prediction": """
                I'm afraid that the future is foggy and ever evolving, my dear. In this case yours seems in flux! I won't be able
                to give you and answer today, but I'm sure we can expect greatness from you!
            """}, status_code=404)
    
    except Exception as err:
        logger.error("delphi encountered an error trying to predict '" + body["question"] + "'", question=body["question"], error=err)
        span.set_tag("error.message", err)
        span.set_tag("error.stack", traceback.format_exc())
        
        return JSONResponse(content={ "prediction": """
            I'm afraid that the future is foggy and ever evolving, my dear. In this case yours seems in flux! I won't be able
            to give you and answer today, but I'm sure we can expect greatness from you!
        """}, status_code=500)