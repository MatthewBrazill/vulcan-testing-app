import uvicorn
from auth import app
import ddtrace
import structlog
import logging
import os

# Configs
ddtrace.config.asyncpg['service'] = "user-database"
logging.basicConfig(
    filename='/logs/auth.log',
    encoding='utf-8'
)
logging.getLogger("auth").setLevel(logging.DEBUG)
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.EventRenamer("message"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.stdlib.LoggerFactory()
)

if __name__ == "__main__":
    certPath = os.environ["CERT_FOLDER"]
    uvicorn.run(app, host="0.0.0.0", port=2884, ssl_certfile=f"{certPath}/cert.pem", ssl_keyfile=f"{certPath}/key.pem")