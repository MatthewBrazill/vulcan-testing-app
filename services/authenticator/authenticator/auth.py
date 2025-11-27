#!/usr/bin/python3

# Imports
from helpers import validate
from helpers import userDatabase
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
import bcrypt
import structlog
import os

# Configs
app = FastAPI()

# Routes
@app.post("/authenticate")
async def authenticate(request: Request) -> JSONResponse:
    logger = structlog.get_logger("auth")
    try:
        body = await request.json()
        if await validate(body, [["username", r"^[a-zA-Z0-9-]{1,32}$"], ["password", r"^.{1,64}$"]]) == False:
            return JSONResponse(content={"authenticated": False}, status_code=400)

        database = await userDatabase()
        user = await database.fetch("SELECT pwhash FROM users WHERE username = $1", body["username"])
        if len(user) == 1:
            pwBytes = (os.environ["PW_PEPPER"] + body["password"]).encode("utf-8")
            hashBytes = user[0].get("pwhash").encode("utf-8")
            if bcrypt.checkpw(password=pwBytes, hashed_password=hashBytes):
                logger.info("authenticated user '" + body["username"] + "'", username=body["username"])
                return JSONResponse(content={"authenticated": True}, status_code=200)

        database.close()
        logger.warn("authentication failed for '" + body["username"] + "'", username=body["username"])
        return JSONResponse(content={"authenticated": False}, status_code=401)
    
    except Exception as err:
        if database != None:
            database.close()
        logger.error("authenticator encountered an error trying to authenticate '" + body["username"] + "'", username=body["username"], error=err)
        return JSONResponse(content={"authenticated": False}, status_code=500)


@app.post("/authorize")
async def authorize(request: Request) -> JSONResponse:
    logger = structlog.get_logger("auth")
    try:
        body = await request.json()
        database = await userDatabase()
        if "apiKey" in body.keys():
            if await validate(body, [["apiKey", r"^[a-f0-9]{32}$"]]) == False:
                return JSONResponse(content={"permissions": "none"}, status_code=400)
            
            logger.debug("authorizing using api key")
            user = await database.fetch("SELECT permissions FROM apikeys WHERE apikey = $1", body["apiKey"])
            if len(user) == 1:
                logger.info("authorized '" + body["apiKey"] + "'", api_key="****" + body["apiKey"][-4:])
                return JSONResponse(content={"permissions": user[0].get("permissions")}, status_code=200)
            logger.warn("authorization failed for key '" + "****" + body["apiKey"][-4:] + "'", api_key="****" + body["apiKey"][-4:])

        if "username" in body.keys():
            if await validate(body, [["username", r"^[a-zA-Z0-9-]{1,32}$"]]) == False:
                return JSONResponse(content={"permissions": "none"}, status_code=400)
            
            logger.debug("authorizing using username")
            user = await database.fetch("SELECT permissions FROM users WHERE username = $1", body["username"])
            if len(user) == 1:
                logger.info("authorized '" + body["username"] + "'", username=body["username"])
                return JSONResponse(content={"permissions": user[0].get("permissions")}, status_code=200)
            logger.warn("authorization failed for '" + body["username"] + "'", username=body["username"])

        database.close()
        return JSONResponse(content={"permissions": "none"}, status_code=403)
    
    except Exception as err:
        if database != None:
            database.close()
        if "apiKey" in body.keys():
            logger.error("authenticator encountered an error trying to authorize key '" + "****" + body["apiKey"][-4:] + "'", api_key="****" + body["apiKey"][-4:], error=err)
        if "username" in body.keys():
            logger.error("authenticator encountered an error trying to authorize '" + body["username"] + "'", username=body["username"], error=err)
        
        return JSONResponse(content={"permissions": "none"}, status_code=500)