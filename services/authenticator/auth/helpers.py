# Imports
import re
from ddtrace import tracer

@tracer.wrap(name="authenticator.helpers", resource="validate")
def validate(params, tests):
    for test in tests:
        if test[0] in params.keys():
            if re.search(test[1], params[test[0]]) == None:
                return False
    return True