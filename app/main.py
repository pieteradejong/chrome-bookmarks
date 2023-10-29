from fastapi import FastAPI
import uvicorn
from app.config import logger
from app import api

app = FastAPI()
app.include_router(api.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Main.py: Starting application...")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Main.py: Shutting down application...")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
