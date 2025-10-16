import os
from fastapi.responses import FileResponse
import uvicorn
from serverGlobals import fastapiServer
from fastapi import FastAPI
from dotenv import dotenv_values

# editing client
from fastapi.staticfiles import StaticFiles

# import routers
from reconstruction import reconstructionRouter
from database import databaseRouter, mongodbConfigRouter, mongodbTestsRouter
from editingClientSessioning import editingClientSessioningRouter
from networking import networkingRouter
from websocketCommunications import websocketRouter

config = dotenv_values(".env")

# Custom class used to safety check the type of file loaded and config accordingly.
# Used to ensure .js files are always loaded with the proper header.
class StaticFilesTypeCheck(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if path.endswith(".js"):
            response.headers["Content-Type"] = "application/javascript"
        return response

fastapiServer = FastAPI()

# Mount editing client (generated dist directory) containing built editing client app
fastapiServer.mount("/apps",
                  StaticFilesTypeCheck(directory="../editingClient", html=True),
                  name="apps")

# Just directly access editing client for now. TODO: May be replaced wih a home page or something
@fastapiServer.get("/")
async def serve_index():
    return FileResponse("../editingClient/index.html")

# To access editing client
@fastapiServer.get("/editing")
async def editing_client():
    return FileResponse("../editingClient/index.html")

fastapiServer.include_router(reconstructionRouter.router)
fastapiServer.include_router(databaseRouter.router)
fastapiServer.include_router(mongodbConfigRouter.router)
fastapiServer.include_router(mongodbTestsRouter.router)

fastapiServer.include_router(editingClientSessioningRouter.router)
fastapiServer.include_router(networkingRouter.router)
fastapiServer.include_router(websocketRouter.router)

def severStartUp():
    # Construct paths for SSL key and certificate in the parent folder
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ssl_keyfile = os.path.join(base_dir, "ssl-key.pem")
    ssl_certfile = os.path.join(base_dir, "ssl-cert.pem")

    uvicorn.run(
        "serverConfig:fastapiServer",
        reload=True,
        host="0.0.0.0",
        port=8000,
        # log_level="info"
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile
    )