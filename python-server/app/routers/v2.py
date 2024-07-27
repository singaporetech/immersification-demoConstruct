import asyncio
import concurrent.futures
import json
import os
import shutil
from colorama import Fore, Back, Style

from fastapi import APIRouter, File, UploadFile, WebSocket
from fastapi.responses import FileResponse, JSONResponse

from .. import model_io, utils
from ..modules.websocket_communications import WebsocketHandler
from ..modules.client_servers.editing_server import EditingServer
from ..reconstruction import run_Meshroom, run_Rtabmap_Reconstruction, runPostReconstruction
from app.blender_util import utils as blend_utils

from .. import server_endpoint_tester

from ..modules.model_database import document_writer, document_reader, document_schemas
from ..modules.model_database import types as db_types

from typing import List

v2_router = APIRouter(tags=["V2"])

executor = concurrent.futures.ThreadPoolExecutor()

@v2_router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # global uploadCount

    if file.filename:
        captureID = file.filename.split("-")
        captureID = captureID[0]

        rootCapturePath = "captures/" + captureID
        if not os.path.exists(rootCapturePath):
            utils.create_directory(rootCapturePath)

        imagePath = rootCapturePath + "/images"
        if not os.path.exists(imagePath):
            utils.create_directory(imagePath)

        modelPath = rootCapturePath + "/models"
        if not os.path.exists(modelPath):
            utils.create_directory(modelPath)

        # create_directory(imagesPath)

        with open(f"{imagePath}/{file.filename}", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"file Name": file.filename}

@v2_router.post("/uploaddataset/{captureID}")
async def upload_dataset(captureID: str, file: UploadFile = File(...)):

    if file.filename:
        databaseInputFileName = file.filename.split(".")
        databaseInputFileName = databaseInputFileName[0]
        # Get iteration ID
        iterationID = databaseInputFileName.split("-")
        iterationID = iterationID[1]

        # Create all necessary folders for storing files first
        capturePathRoot = "captures/" + captureID
        if not os.path.exists(capturePathRoot):
            utils.create_directory(capturePathRoot)
        
        datasetPathRoot = capturePathRoot + "/datasets"
        if not os.path.exists(datasetPathRoot):
            utils.create_directory(datasetPathRoot)

        modelPathRoot = capturePathRoot + "/models"
        if not os.path.exists(modelPathRoot):
            utils.create_directory(modelPathRoot)

        iterationModelPathRoot = modelPathRoot + "/" + iterationID
        if not os.path.exists(iterationModelPathRoot):
            utils.create_directory(iterationModelPathRoot)

        #Create temp folder to store before pre-processing.
        tempModelPathRoot = modelPathRoot + "/-1"
        if os.path.exists(tempModelPathRoot) == False:
            utils.create_directory(tempModelPathRoot)
            
        # Copy database file to dataset folder for saving
        with open(f"{datasetPathRoot}/{file.filename}", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run reconstruction operation
        loop = asyncio.get_running_loop()
        resultsReconstruction = await loop.run_in_executor(
            executor, 
            run_Rtabmap_Reconstruction, datasetPathRoot, tempModelPathRoot, modelPathRoot, databaseInputFileName, captureID, iterationID,
        )

        # If reconstruction successful, run post processing
        if resultsReconstruction["success"] == True:
            #Run post-processing.
            loop = asyncio.get_running_loop()
            resultsPost = await loop.run_in_executor(
                executor, runPostReconstruction, tempModelPathRoot, modelPathRoot, iterationID, "obj", False
            )
            
            # If postprocessing successul, write to MongoDB
            if resultsPost["success"] == True:
                db_filter = {'data_uid': captureID}
                collect_type = db_types.CollectionType.RECONSTRUCTIONS

                model_data_doc = document_reader.find_unique_document(
                    collect_type,
                    {'data_uid': captureID}
                    )
                    
                #Create document for new model data since it does not exist.
                if model_data_doc == None:
                    model_data = document_schemas.ModelData_Document(data_uid=captureID)
                    document_writer.upload_unique_object(
                        collect_type,
                        model_data,
                        db_filter
                    )
                
                #Create document for iteration. 
                # Will always run no matter if it is a new capture (1st iteration) or new iteration (2nd or higher iteration)
                model_object = document_schemas.ModelObject_Document(
                    data_ref_id=captureID, 
                    version=iterationID, 
                    filetype=resultsPost["file_type"],
                    has_thumbnail=resultsPost["has_thumbnail"],
                    model_filename=iterationID,
                    thumbnail_filename="thumbnail.png"
                )
                document_writer.upload_unique_object(
                    collect_type,
                    model_object,
                    {"ref_id": captureID, "version": iterationID}
                )

                print("Registering capture and iteration to database...")
                print("Caputre ID:" + captureID)
                print("Iteration ID:" + iterationID)

                await EditingServer._notify_new_reconstruction(captureID)

        return {"Database file Name": file.filename}

@v2_router.post("/uploadmodelzip/{captureID}")
async def upload_modelzip(captureID: str, file: UploadFile = File(...)):

    if file.filename:
        rootCapturePath = "captures/" + captureID
        if not os.path.exists(rootCapturePath):
            utils.create_directory(rootCapturePath)

        modelPath = rootCapturePath + "/models"
        if not os.path.exists(modelPath):
            utils.create_directory(modelPath)

        id = file.filename.split(".")
        id = id[0]

        with open(f"{modelPath}/{file.filename}", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            await asyncio.to_thread(utils.unzip_file, f"{modelPath}/{file.filename}", f"{modelPath}/{id}")
        
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(
            executor, runPostReconstruction, modelPath, modelPath, id, "obj", False
        )
        
        if results["success"] == True:
            db_filter = {'data_uid': captureID}
            collect_type = db_types.CollectionType.RECONSTRUCTIONS

            model_data_doc = document_reader.find_unique_document(
                collect_type,
                {'data_uid': captureID}
                )
                
            #Create document for new model data since it does not exist.
            if model_data_doc == None:
                model_data = document_schemas.ModelData_Document(data_uid=captureID)
                document_writer.upload_unique_object(
                    collect_type,
                    model_data,
                    db_filter
                )

            #Create document for model_object
            model_object = document_schemas.ModelObject_Document(
                data_ref_id=captureID, 
                version=id, 
                filetype=results["file_type"],
                has_thumbnail=results["has_thumbnail"],
                model_filename=id,
                thumbnail_filename="thumbnail.png"
            )
            document_writer.upload_unique_object(
                collect_type,
                model_object,
                {"ref_id": captureID, "version": id}
            )

            await EditingServer._notify_new_reconstruction(captureID)
            
        return {"Model zip Name": id}
    
@v2_router.post("/uploadplyzip/{captureID}")
async def upload_plyzip(captureID: str, file: UploadFile = File(...)):
    if file.filename:
        rootCapturePath = "captures/" + captureID
        if not os.path.exists(rootCapturePath):
            utils.create_directory(rootCapturePath)

        plyPath = rootCapturePath + "/pointclouds"
        if not os.path.exists(plyPath):
            utils.create_directory(plyPath)

        modelPath = rootCapturePath + "/models"
        if not os.path.exists(modelPath):
            utils.create_directory(modelPath)

        id = file.filename.split(".")
        id = id[0]

        zipFilePath = f"{plyPath}/{file.filename}"
        extractFilePath = f"{plyPath}/{id}"

        with open(f"{plyPath}/{file.filename}", "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            await asyncio.to_thread(utils.unzip_file, zipFilePath, extractFilePath)

        return {"Model zip Name": id}

async def writeToDatabase(captureID: str, versionID: str, fileType: str, hasThumbnail: str):
    #If Success, write data into mongodb
    db_filter = {'data_uid': captureID}
    collect_type = db_types.CollectionType.RECONSTRUCTIONS

    model_data_doc = document_reader.find_unique_document(
        collect_type,
        {'data_uid': captureID}
        )
        
    #Create document for new model data since it does not exist.
    if model_data_doc == None:
        model_data = document_schemas.ModelData_Document(data_uid=captureID)
        document_writer.upload_unique_object(
            collect_type,
            model_data,
            db_filter
        )

    #Create document for model_object
    model_object = document_schemas.ModelObject_Document(
        data_ref_id=captureID, 
        version=versionID, 
        filetype=fileType,
        has_thumbnail=hasThumbnail,
        model_filename=id,
        thumbnail_filename="thumbnail.png"
    )
    document_writer.upload_unique_object(
        collect_type,
        model_object,
        {"ref_id": captureID, "version": versionID}
    )

    await EditingServer._notify_new_reconstruction(captureID)

@v2_router.post("/launchreconstruction/{captureID}")
async def launchreconstruction(captureID: str):
    
    print( Back.WHITE + Fore.BLACK +
        "*****************************************************************************\n"
        + "                      Reconstruction Call Started" 
        + "\n*****************************************************************************"
    + Style.RESET_ALL)

    rootCapturePath = "captures/" + captureID
    imagePath = rootCapturePath + "/images"
    modelPath = rootCapturePath + "/models"

    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        executor, run_Meshroom, captureID, modelPath, imagePath
    )

    #If Success, write data into mongodb
    if results["success"] == True:
        db_filter = {'data_uid': captureID}
        collect_type = db_types.CollectionType.RECONSTRUCTIONS

        model_data_doc = document_reader.find_unique_document(
            collect_type,
            {'data_uid': captureID}
            )
        
        #Create document for new model data since it does not exist.
        if model_data_doc == None:
            model_data = document_schemas.ModelData_Document(data_uid=captureID)
            document_writer.upload_unique_object(
                collect_type,
                model_data,
                db_filter
            )

        #Create document for model_object
        model_object = document_schemas.ModelObject_Document(
            data_ref_id=captureID, 
            version=results["version"], 
            filetype=results["file_type"],
            has_thumbnail=results["has_thumbnail"],
            model_filename=results["version"],
            thumbnail_filename="thumbnail.png"
        )
        document_writer.upload_unique_object(
            collect_type,
            model_object,
            {"ref_id": captureID, "version": results["version"]}
        )
        
        await EditingServer._notify_new_reconstruction(captureID)

    print( Back.WHITE + Fore.BLACK + "\n" +
        "*****************************************************************************\n"
        + "                        Reconstruction Call Ended" 
        + "\n*****************************************************************************"
    + Style.RESET_ALL)

    response = JSONResponse(
        content={
            "Edge Node Task": "3D Model Reconstruction",
            "Success": results["success"],
        }
    )
    return response

@v2_router.post("/launchreconstructionselective/{captureID}")
async def launchreconstructionselective(captureID: str, imageIDs: List[str]):

    print( Back.WHITE + Fore.BLACK +
        "*****************************************************************************\n"
        + "                   Reconstruction Selective Call Started" 
        + "\n*****************************************************************************"
    + Style.RESET_ALL)

    rootCapturePath = "captures/" + captureID
    imagePath = rootCapturePath + "/images"
    modelPath = rootCapturePath + "/models"

    tempImagePath = rootCapturePath + "/_temp/images"
    
    # Start off by creating a temp folder and copying images
    if not os.path.exists(tempImagePath):
        utils.create_directory(tempImagePath)

    # Copy images
    for imageID in imageIDs:
        fileName = captureID + "-" + imageID + ".png"
        sourceFilePath = imagePath + "/" + fileName
        toTempFilepath = tempImagePath + "/" + fileName
        if os.path.exists(sourceFilePath):
            print(f"Copying '{fileName}'")
            shutil.copy(sourceFilePath, toTempFilepath)
        else:
            print(f"Source image file '{sourceFilePath}' does not exist. ID and associated image will not be used for reconstruction")
    
    #Set to use temp images folder
    imagePath = tempImagePath

    print(f"Images copied to temp folder. Reconstruction will use images located at '{imagePath}'.")

    loop = asyncio.get_running_loop()
    results = await loop.run_in_executor(
        executor, run_Meshroom, captureID, modelPath, imagePath
    )

    #If Success, write data into mongodb
    if results["success"] == True:
        db_filter = {'data_uid': captureID}
        collect_type = db_types.CollectionType.RECONSTRUCTIONS

        model_data_doc = document_reader.find_unique_document(
            collect_type,
            {'data_uid': captureID}
            )
        
        #Create document for new model data since it does not exist.
        if model_data_doc == None:
            model_data = document_schemas.ModelData_Document(data_uid=captureID)
            document_writer.upload_unique_object(
                collect_type,
                model_data,
                db_filter
            )

        #Create document for model_object
        model_object = document_schemas.ModelObject_Document(
            data_ref_id=captureID, 
            version=results["version"], 
            filetype=results["file_type"],
            has_thumbnail=results["has_thumbnail"]
        )
        document_writer.upload_unique_object(
            collect_type,
            model_object,
            {"ref_id": captureID, "version": results["version"]}
        )
        
        await EditingServer._notify_new_reconstruction(captureID)

    if os.path.exists(imagePath):
        utils.delete_directory(imagePath)

    print( Back.WHITE + Fore.BLACK + "\n" +
        "*****************************************************************************\n"
        + "                  Reconstruction Selective Call Ended" 
        + "\n*****************************************************************************"
    + Style.RESET_ALL)

    response = JSONResponse(
        content={
            "Edge Node Task": "3D Model Reconstruction using Selective image",
            "Success": results["success"],
        }
    )

    return response

@v2_router.get("/models/{captureID}/{modelID}/{fileName}")
def get_model(captureID: str, modelID: str, fileName: str):
    path = "captures/" + captureID + "/models/" + modelID + "/" + fileName

    response = FileResponse(path)
    response.headers["Access-Control-Allow-Origin"] = "http://192.168.1.97:3000"
    return response

@v2_router.get("/checkmodels/{captureID}/{modelID}/{extension}")
def get_ModelExist(captureID: str, modelID: str, extension: str):
    path = (
        "captures/" + captureID + "/models/" + modelID + "/" + modelID + "." + extension
    )
    check_file = os.path.isfile(path)

    response = JSONResponse(content={"exists": check_file})
    response.headers["Access-Control-Allow-Origin"] = "http://192.168.1.97:3000"
    return response

@v2_router.get("/loadAsset/model/{modelName}")
async def load_babylonjs_asset(modelName: str):
    path = (
        "./"
        + "Assets"
        + "/"
        + "Models"
        + "/"
        + modelName
    )
    return FileResponse(path)

@v2_router.get("/downloadModel/{modelName}/models/{modelVersion}/{fileName}")
async def download_model_by_version(modelName: str, modelVersion: str, fileName: str):
    path = (
        "./"
        + model_io.capture_directory
        + "/"
        + modelName
        + "/models/"
        + modelVersion
        + "/"
        + fileName
    )
    return FileResponse(path)

@v2_router.websocket("/start_websocket")
async def editingClient_websocket_endpoint(websocket: WebSocket):
    await WebsocketHandler.StartClientSocket(websocket)

from ..modules.client_servers import editing_server
from ..modules.client_servers import capture_server

@v2_router.on_event("startup")
async def startup_event():
    edit_server = editing_server.create_instance()
    edit_server.initialize()

    cap_server = capture_server.create_instance()
    cap_server.initialize()

    server_endpoint_tester.initialise()
    pass

@v2_router.on_event("shutdown")
async def shutdown_event():
    editing_server.shutdown_instance()
    capture_server.shutdown_instance()

# Testing only function
@v2_router.get("/getbabylon")
def get_babylon():
    path = "17.customization"

    response = FileResponse(path)

    return response(path)