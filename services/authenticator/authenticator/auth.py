#!/usr/bin/python3

# Imports
from helpers import validate
from helpers import userDatabase
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from ddtrace import tracer

# Datadog Configs
app = FastAPI()

# Routes
@app.post("/authenticate")
async def auth(request: Request) -> JSONResponse:

    body = await request.json()
    if await validate(body, [["username", "^[a-zA-Z]{1,32}$"], ["pwHash", "^.{1,64}$"]]) == False:
        return JSONResponse(content={"authenticated": False}, status_code=400)

    database = await userDatabase()
    user = await database.fetch("SELECT password FROM users WHERE username = $1", body["username"])
    if len(user) == 1:
        if body["password"] == user[0].get("pwHash"):
            return JSONResponse(content={"authenticated": True}, status_code=200)

    return JSONResponse(content={"authenticated": False}, status_code=401)


@app.post("/authorize")
async def auth(request: Request) -> JSONResponse:

    body = await request.json()
    database = await userDatabase()
    if "apiKey" in body.keys():
        if await validate(body, [["apiKey", "^[a-f0-9]{32}$"]]) == False:
            return JSONResponse(content={"permissions": "none"}, status_code=400)
        
        user = await database.fetch("SELECT permissions FROM apikeys WHERE apikey = $1", body["apiKey"])
        if len(user) == 1:
            return JSONResponse(content={"permissions": user[0].get("permissions")}, status_code=200)

    if "username" in body.keys():
        if await validate(body, [["username", "^[a-zA-Z]{1,32}$"]]) == False:
            return JSONResponse(content={"permissions": "none"}, status_code=400)
        
        user = await database.fetch("SELECT permissions FROM users WHERE username = $1", body["username"])
        if len(user) == 1:
            return JSONResponse(content={"permissions": user[0].get("permissions")}, status_code=200)

    return JSONResponse(content={"permissions": "none"}, status_code=403)