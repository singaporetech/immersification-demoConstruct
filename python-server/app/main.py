import uvicorn
from .server_globals import fastapi_app
from fastapi import FastAPI
from dotenv import dotenv_values
# from .routers.v1 import router as v1_router
from .routers.v2 import v2_router
from .routers.mongodb_config import mongodb_router
from .routers.mongodb_tests import mongodb_test_router

config = dotenv_values(".env")

fastapi_app = FastAPI()

@fastapi_app.get("/")
async def root():
    return {"message": "Welcome to demoConstruct"}

fastapi_app.include_router(v2_router)
fastapi_app.include_router(mongodb_router)
fastapi_app.include_router(mongodb_test_router)

if __name__ == "__main__":
    uvicorn.run(
        "app.main:fastapi_app", reload=True, host="0.0.0.0", port=8000, log_level="info"
    )
