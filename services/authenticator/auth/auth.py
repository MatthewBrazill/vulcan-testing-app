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
@app.post("/auth")
async def auth(request: Request) -> JSONResponse:

    body = await request.json()
    if await validate(body, [["apiKey", "^[a-f0-9]{32}$"], ["username", "^[a-zA-Z]{1,32}$"], ["password", "^.{1,64}$"]]) == False:
        return JSONResponse(content={"perms": "no_auth"}, status_code=400)

    database = await userDatabase()
    if "apiKey" in body.keys():
        user = await database.fetch("SELECT * FROM apikeys WHERE apikey = $1", body["apiKey"])
        if user != None and len(user) == 1:
            return JSONResponse(content={"perms": user[0].get("permissions")}, status_code=200)

    elif "username" in body.keys():
        user = await database.fetch("SELECT * FROM users WHERE username = $1", body["username"])
        if user != None and len(user) == 1 and user[0].get("password") == body["password"]:
            return JSONResponse(content={"perms": user[0].get("permissions")}, status_code=200)

    return JSONResponse(content={"perms": "no_auth"}, status_code=200)