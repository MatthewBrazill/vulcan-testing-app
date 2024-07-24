#!/usr/bin/python3

# Imports
from helpers import validate
from helpers import userDatabase
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from ddtrace import tracer
import traceback
import structlog

# Configs
app = FastAPI()
logger = structlog.get_logger()

# Routes
@app.post("/authenticate")
async def auth(request: Request) -> JSONResponse:
    try:
        body = await request.json()
        if await validate(body, [["username", r"^[a-zA-Z]{1,32}$"], ["pwhash", r"^.{1,64}$"]]) == False:
            return JSONResponse(content={"authenticated": False}, status_code=400)

        database = await userDatabase()
        user = await database.fetch("SELECT password FROM users WHERE username = $1", body["username"])
        if len(user) == 1:
            if body["password"] == user[0].get("pwHash"):
                logger.debug("authenticated user '" + body["username"] + "'", username=body["username"])
                return JSONResponse(content={"authenticated": True}, status_code=200)

        logger.warn("authentication failed for '" + body["username"] + "'", username=body["username"])
        return JSONResponse(content={"authenticated": False}, status_code=401)
    
    except Exception as err:
        logger.error("authenticator encountered an error trying to authenticate '" + body["username"] + "'", username=body["username"], error=err)
        span = tracer.current_span()
        span.set_tag("error.message", err)
        span.set_tag("error.stack", traceback.format_exc())
        return JSONResponse(content={"authenticated": False}, status_code=500)


@app.post("/authorize")
    span = tracer.current_span()
    try:
        body = await request.json()
        database = await userDatabase()
        if "apiKey" in body.keys():
            span.set_tag("authorized_using", "apikey")
            if await validate(body, [["apiKey", "^[a-f0-9]{32}$"]]) == False:
                return JSONResponse(content={"permissions": "none"}, status_code=400)
            
            logger.debug("authorizing using api key")
            user = await database.fetch("SELECT permissions FROM apikeys WHERE apikey = $1", body["apiKey"])
            if len(user) == 1:
                return JSONResponse(content={"permissions": user[0].get("permissions")}, status_code=200)
            logger.warn("authorization failed for key '" + "****" + body["apiKey"][-4:] + "'", api_key="****" + body["apiKey"][-4:])

        if "username" in body.keys():
            span.set_tag("authorized_using", "username")
            if await validate(body, [["username", "^[a-zA-Z]{1,32}$"]]) == False:
                return JSONResponse(content={"permissions": "none"}, status_code=400)
            
            logger.debug("authorizing using username")
            user = await database.fetch("SELECT permissions FROM users WHERE username = $1", body["username"])
            if len(user) == 1:
                return JSONResponse(content={"permissions": user[0].get("permissions")}, status_code=200)
            logger.warn("authorization failed for '" + body["username"] + "'", username=body["username"])

        return JSONResponse(content={"permissions": "none"}, status_code=403)
    
    except Exception as err:
        span.set_tag("error.message", err)
        span.set_tag("error.stack", traceback.format_exc())
        if "apiKey" in body.keys():
            logger.error("authenticator encountered an error trying to authorize key '" + "****" + body["apiKey"][-4:] + "'", api_key="****" + body["apiKey"][-4:], error=err)
        if "username" in body.keys():
            logger.error("authenticator encountered an error trying to authorize '" + body["username"] + "'", username=body["username"], error=err)
        
        return JSONResponse(content={"permissions": "none"}, status_code=500)