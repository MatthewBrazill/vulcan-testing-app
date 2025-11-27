# Imports
import re
import asyncpg


async def validate(params, tests):
    for test in tests:
        if test[0] in params.keys():
            if re.search(test[1], params[test[0]]) == None:
                return False
    return True


async def userDatabase():
    database = await asyncpg.connect(host="pupgres.database", port="5432", user="vulcan", password="yKCstvg4hrB9pmDP", database="vulcan_users")
    return database