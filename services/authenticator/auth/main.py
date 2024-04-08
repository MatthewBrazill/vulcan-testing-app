import uvicorn
from auth import app
import ddtrace

# Datadog Configs
ddtrace.config.asyncpg['service'] = "user-database"

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=2884)