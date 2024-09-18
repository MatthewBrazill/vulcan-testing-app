# Imports
import re
import asyncpg
from ddtrace import tracer


@tracer.wrap(name="authenticator.helper", resource="validate")
async def validate(params, tests):
    for test in tests:
        if test[0] in params.keys():
            if re.search(test[1], params[test[0]]) == None:
                return False
    return True


@tracer.wrap(name="authenticator.database", resource="userDatabase")
async def userDatabase():
    database = await asyncpg.connect(host="user-database", port="5432", user="vulcan", password="yKCstvg4hrB9pmDP", database="vulcan_users")
    return database