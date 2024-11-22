# Imports
import re
from ddtrace import tracer


@tracer.wrap(name="delphi.helper", resource="validate")
async def validate(params, tests):
    for test in tests:
        if test[0] in params.keys():
            if params[test[0]].isinstance(list):
                for item in params[test[0]]:
                    if re.search(test[1], item) == None:
                        return False
            else:
                if re.search(test[1], params[test[0]]) == None:
                    return False
    return True