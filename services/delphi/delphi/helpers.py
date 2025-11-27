# Imports
import re


async def validate(params, tests):
    for test in tests:
        if test[0] in params.keys():
            if type(params[test[0]]) is list:
                for item in params[test[0]]:
                    if re.search(test[1], item) == None:
                        return False
            else:
                if re.search(test[1], params[test[0]]) == None:
                    return False
    return True