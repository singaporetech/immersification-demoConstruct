from colorama import Fore, Back, Style

from fastapi import APIRouter, File
from fastapi.responses import FileResponse, JSONResponse

from utililites import modelIOTools

# from editingClientSessioning import  editingClientServer

router = APIRouter(tags=["editingClientSessioningRouter"])

@router.get("/editing/{type}/{fileName}")
async def downloadEditingAsset(type: str, fileName: str):
    try:
        path = (
            "./"
            + "assets"
            + "/"
            + "editing"
            + "/"
            + type
            + "/"
            + fileName
        )
        return FileResponse(path)

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})
    
@router.get("/downloadTexture/{modelName}/textures/{modelVersion}/{fileName}")
async def download_ModelTexture(modelName: str, modelVersion: str, fileName: str):
    try:
        path = (
            "./"
            + modelIOTools.captureDirectory
            + "/"
            + modelName
            + "/models/"
            + modelVersion
            + "/"
            + fileName
        )
        return FileResponse(path)

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

@router.get("/loadAsset/model/{modelName}")
async def load_babylonjs_asset(modelName: str):
    try:
        path = (
            "./"
            + "assets"
            + "/"
            + "Models"
            + "/"
            + modelName
        )
        return FileResponse(path)

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

@router.get("/models/{captureID}/{modelID}/{fileName}")
def download_model(captureID: str, modelID: str, fileName: str):
    try:
        path = "captures/" 
        + captureID 
        + "/models/" 
        + modelID 
        + "/" 
        + fileName

        response = FileResponse(path)
        # response.headers["Access-Control-Allow-Origin"] = "http://192.168.1.97:3000"
        return response
    
    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

# TODO: this API below and the above API are exactly the same.
# To figure out why this new API was created, 
# and if the older one is still needed or we can just use the old one

@router.get("/downloadModel/{modelName}/models/{modelVersion}/{fileName}")
async def download_model_by_version(modelName: str, modelVersion: str, fileName: str):
    try:
        path = (
            "./"
            + modelIOTools.captureDirectory
            + "/"
            + modelName
            + "/models/"
            + modelVersion
            + "/"
            + fileName
        )
        return FileResponse(path)

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

