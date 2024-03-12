from fastapi import FastAPI
import uvicorn
from app.config import logger
from app import api
from app import analysis

app = FastAPI()
app.include_router(api.router)


@app.on_event("startup")
def startup_event():
    logger.info("Main.py: Starting application...")

    try:
        analysis.load_and_preprocess_data()
        logger.info("Main.py: Bookmarks data loaded...")
    except Exception as e:
        logger.error(
            f"Main.py: An error occurred while loading and preprocessing data: {e}"
        )


#
@app.on_event("shutdown")
def shutdown_event():
    logger.info("Main.py: Shutting down application...")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
