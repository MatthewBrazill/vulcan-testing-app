import uvicorn
from auth import app
import ddtrace
import os

# Datadog Configs
ddtrace.config.asyncpg['service'] = "user-database"

if __name__ == "__main__":
    certPath = os.environ["CERT_FOLDER"]
    uvicorn.run(app, host="0.0.0.0", port=2884, ssl_certfile=f"{certPath}/cert.pem", ssl_keyfile=f"{certPath}/key.pem")