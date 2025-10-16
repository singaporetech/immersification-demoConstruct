import asyncio
import concurrent.futures
import os
import shutil
# from colorama import Fore, Back, Style

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse

from database.mongoDB import documentSchemas, documentUtilities, documentWriter
# from ..utililites import modelIOTools

# from ..websocketCommunications import websocketHandler
from editingClientSessioning import editingServer

# Generic functions inmport
from utililites import directoryTools

from reconstruction.rtabmap.rtabmapReconstruction import runRtabmapReconstruction, runPostReconstruction

from database.mongoDB import types

router = APIRouter(tags=["reconstructionRouter"])

executor = concurrent.futures.ThreadPoolExecutor()

@router.post("/uploaddataset/{captureID}")
async def upload_dataset(captureID: str, file: UploadFile = File(...)):
    try:
        if file.filename:
            databaseInputFileName = file.filename.split(".")
            databaseInputFileName = databaseInputFileName[0]
            # Get iteration ID
            iterationID = databaseInputFileName.split("-")
            iterationID = iterationID[1]

            # Create all necessary folders for storing files first
            capturePathRoot = "captures/" + captureID
            if not os.path.exists(capturePathRoot):
                directoryTools.create_directory(capturePathRoot)

            datasetPathRoot = capturePathRoot + "/datasets"
            if not os.path.exists(datasetPathRoot):
                directoryTools.create_directory(datasetPathRoot)

            modelPathRoot = capturePathRoot + "/models"
            if not os.path.exists(modelPathRoot):
                directoryTools.create_directory(modelPathRoot)

            iterationModelPathRoot = modelPathRoot + "/" + iterationID
            if not os.path.exists(iterationModelPathRoot):
                directoryTools.create_directory(iterationModelPathRoot)

            #Create temp folder to store before pre-processing.
            tempModelPathRoot = modelPathRoot + "/-1"
            if not os.path.exists(tempModelPathRoot):
                directoryTools.create_directory(tempModelPathRoot)

            # Copy database file to dataset folder for saving
            with open(f"{datasetPathRoot}/{file.filename}", "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Try run reconstruction
            try:
                # Run reconstruction operation
                loop = asyncio.get_running_loop()
                resultsReconstruction = await loop.run_in_executor(
                    executor,
                    runRtabmapReconstruction, datasetPathRoot, tempModelPathRoot, modelPathRoot, databaseInputFileName, captureID, iterationID,
                )

            except Exception as e:
                # Handle a specific error related to the reconstruction process
                return JSONResponse(status_code=500, content={"error": f"Reconstruction failed: {e}"})

            #  Try run post-processing for reconstruction
            try:
                # If reconstruction successful, run post processing
                if resultsReconstruction["success"]:
                    #Run post-processing.
                    loop = asyncio.get_running_loop()
                    resultsPost = await loop.run_in_executor(
                        executor, runPostReconstruction, tempModelPathRoot, modelPathRoot, iterationID, "obj", False
                    )
                else:
                    print("Reconstruct failed!")

                # If postprocessing successful, write to MongoDB
                if resultsPost["success"]:
                    db_filter = {'data_uid': captureID}
                    collect_type = types.CollectionType.RECONSTRUCTIONS

                    model_data_doc = documentUtilities.get_unique_document(
                        collect_type,
                        {'data_uid': captureID}
                        )

                    #Create document for new model data since it does not exist.
                    if model_data_doc is None:
                        model_data = documentSchemas.ModelData_Document(data_uid=captureID)
                        documentWriter.upload_unique_object(
                            collect_type,
                            model_data,
                            db_filter
                        )

                    #Create document for iteration.
                    # Will always run no matter if it is a new capture (1st iteration) or new iteration (2nd or higher iteration)
                    model_object = documentSchemas.ModelObject_Document(
                        data_ref_id=captureID,
                        version=iterationID,
                        filetype=resultsPost["file_type"],
                        has_thumbnail=resultsPost["has_thumbnail"],
                        model_filename=iterationID,
                        thumbnail_filename="thumbnail.png"
                    )
                    documentWriter.upload_unique_object(
                        collect_type,
                        model_object,
                        {"ref_id": captureID, "version": iterationID}
                    )

                    print("Registering capture and iteration to database...")
                    print("Caputre ID:" + captureID)
                    print("Iteration ID:" + iterationID)

                    await editingServer.EditingServer._broadcast_new_reconstruction(captureID)

            except Exception as e:
                # Handle a specific error related to the reconstruction process
                return JSONResponse(status_code=500, content={"error": f"Dataset Post-processing for reconstruction failed: {e}"})

            # Return success response after successful reconstruction
            return {"Database file Name": file.filename}

    except FileNotFoundError as e:
        # Handle file not found errors
        return JSONResponse(status_code=404, content={"error": f"File not found: {e}"})

    except OSError as e:
        # Handle other file operation errors (e.g., permission issues)
        return JSONResponse(status_code=500, content={"error": f"File operation error: {e}"})

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

@router.post("/uploadIndividualOBJ")
async def upload_individual_obj(captureID: str, modelFile: UploadFile = File(...), materialFile: UploadFile = File(...), textureFile: UploadFile = File(...)):
    try:
        if modelFile.filename and textureFile.filename:
            captureRawName, captureExt = os.path.splitext(modelFile.filename)
            # captureExt = captureExt[1]

            mtlRawName, mtlExt = os.path.splitext(materialFile.filename)
            # mtlExt = textureExt[1]

            textureRawName, textureExt = os.path.splitext(textureFile.filename)
            # textureExt = textureExt[1]

            # Get capture ID
            captureID = captureID #captureRawName.split("-")
            # captureID = iterationID[0]

            # Get iteration ID
            iterationID = captureRawName # captureRawName.split("-")
            # iterationID = iterationID[1]

            # Create all necessary folders for storing files first
            capturePathRoot = "captures/" + captureID
            if not os.path.exists(capturePathRoot):
                directoryTools.create_directory(capturePathRoot)

            datasetPathRoot = capturePathRoot + "/datasets"
            if not os.path.exists(datasetPathRoot):
                directoryTools.create_directory(datasetPathRoot)

            modelPathRoot = capturePathRoot + "/models"
            if not os.path.exists(modelPathRoot):
                directoryTools.create_directory(modelPathRoot)

            iterationModelPathRoot = modelPathRoot + "/" + iterationID
            if not os.path.exists(iterationModelPathRoot):
                directoryTools.create_directory(iterationModelPathRoot)

            #Create temp folder to store before pre-processing.
            tempModelPathRoot = modelPathRoot + "/-1"
            if not os.path.exists(tempModelPathRoot):
                directoryTools.create_directory(tempModelPathRoot)

            # Copy model and textures file to each folder
            with open(f"{tempModelPathRoot}/{modelFile.filename}", "wb") as buffer:
                shutil.copyfileobj(modelFile.file, buffer)

            with open(f"{tempModelPathRoot}/{materialFile.filename}", "wb") as buffer:
                shutil.copyfileobj(materialFile.file, buffer)

            with open(f"{tempModelPathRoot}/{textureFile.filename}", "wb") as buffer:
                shutil.copyfileobj(textureFile.file, buffer)

            copysuccessful = {
                "success": (
                    os.path.exists(f"{tempModelPathRoot}/{modelFile.filename}") and
                    os.path.exists(f"{tempModelPathRoot}/{materialFile.filename}") and
                    os.path.exists(f"{tempModelPathRoot}/{textureFile.filename}")
                )
            }
            # # Try run reconstruction
            # try:
            #     # Run reconstruction operation
            #     loop = asyncio.get_running_loop()
            #     resultsReconstruction = await loop.run_in_executor(
            #         executor,
            #         runRtabmapReconstruction, datasetPathRoot, tempModelPathRoot, modelPathRoot, captureVersionFullString, captureID, iterationID,
            #     )

            # except Exception as e:
            #     # Handle a specific error related to the reconstruction process
            #     return JSONResponse(status_code=500, content={"error": f"Reconstruction failed: {e}"})

            #  Try running post-processing for reconstruction
            try:
                # If reconstruction successful, run post processing
                if copysuccessful["success"]:
                    print("Upload files successful")

                    #Run post-processing.
                    loop = asyncio.get_running_loop()
                    resultsPost = await loop.run_in_executor(
                        executor, runPostReconstruction, tempModelPathRoot, modelPathRoot, iterationID, "obj", False
                    )

                else:
                    print("Files upload failed!")

                # If postprocessing successful, write to MongoDB
                if resultsPost["success"]:
                    db_filter = {'data_uid': captureID}
                    collect_type = types.CollectionType.RECONSTRUCTIONS

                    model_data_doc = documentUtilities.get_unique_document(
                        collect_type,
                        {'data_uid': captureID}
                        )

                    #Create document for new model data since it does not exist.
                    if model_data_doc is None:
                        model_data = documentSchemas.ModelData_Document(data_uid=captureID)
                        documentWriter.upload_unique_object(
                            collect_type,
                            model_data,
                            db_filter
                        )

                    #Create document for iteration.
                    # Will always run no matter if it is a new capture (1st iteration) or new iteration (2nd or higher iteration)
                    model_object = documentSchemas.ModelObject_Document(
                        data_ref_id=captureID,
                        version=iterationID,
                        filetype=resultsPost["file_type"],
                        has_thumbnail=resultsPost["has_thumbnail"],
                        model_filename=iterationID,
                        thumbnail_filename="thumbnail.png"
                    )
                    documentWriter.upload_unique_object(
                        collect_type,
                        model_object,
                        {"ref_id": captureID, "version": iterationID}
                    )

                    print("Registering capture and iteration to database...")
                    print("Caputre ID:" + captureID)
                    print("Iteration ID:" + iterationID)

                    await editingServer.EditingServer._broadcast_new_reconstruction(captureID)

            except Exception as e:
                # Handle a specific error related to the reconstruction process
                return JSONResponse(status_code=500, content={"error": f"OBJ Post-processing for reconstruction failed: {e}"})

            # Return success response after successful reconstruction
            return {"Database file Name": modelFile.filename}

    except FileNotFoundError as e:
        # Handle file not found errors
        return JSONResponse(status_code=404, content={"error": f"File not found: {e}"})

    except OSError as e:
        # Handle other file operation errors (e.g., permission issues)
        return JSONResponse(status_code=500, content={"error": f"File operation error: {e}"})

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

@router.post("/uploadIndividualGLB")
async def upload_individual_glb(captureID: str, modelFile: UploadFile = File(...)):
    try:
        if modelFile.filename:
            captureRawName, captureExt = os.path.splitext(modelFile.filename)
            # captureExt = captureExt[1]

            # Get capture ID
            captureID = captureID #captureRawName.split("-")
            # captureID = iterationID[0]

            # Get iteration ID
            iterationID = captureRawName # captureRawName.split("-")
            # iterationID = iterationID[1]

            # Create all necessary folders for storing files first
            capturePathRoot = "captures/" + captureID
            if not os.path.exists(capturePathRoot):
                directoryTools.create_directory(capturePathRoot)

            datasetPathRoot = capturePathRoot + "/datasets"
            if not os.path.exists(datasetPathRoot):
                directoryTools.create_directory(datasetPathRoot)

            modelPathRoot = capturePathRoot + "/models"
            if not os.path.exists(modelPathRoot):
                directoryTools.create_directory(modelPathRoot)

            iterationModelPathRoot = modelPathRoot + "/" + iterationID
            if not os.path.exists(iterationModelPathRoot):
                directoryTools.create_directory(iterationModelPathRoot)

            #Create temp folder to store before pre-processing.
            tempModelPathRoot = modelPathRoot + "/-1"
            if not os.path.exists(tempModelPathRoot):
                directoryTools.create_directory(tempModelPathRoot)

            # Copy model and textures file to each folder
            with open(f"{tempModelPathRoot}/{modelFile.filename}", "wb") as buffer:
                shutil.copyfileobj(modelFile.file, buffer)

            copysuccessful = {
                "success": (
                    os.path.exists(f"{tempModelPathRoot}/{modelFile.filename}")
                )
            }

            #  Try running post-processing for reconstruction
            try:
                # If reconstruction successful, run post processing
                if copysuccessful["success"]:
                    print("Upload files successful")

                    #Run post-processing.
                    loop = asyncio.get_running_loop()
                    resultsPost = await loop.run_in_executor(
                        executor, runPostReconstruction, tempModelPathRoot, modelPathRoot, iterationID, "glb", False
                    )

                else:
                    print("Files upload failed!")

                # If postprocessing successful, write to MongoDB
                if resultsPost["success"]:
                    db_filter = {'data_uid': captureID}
                    collect_type = types.CollectionType.RECONSTRUCTIONS

                    model_data_doc = documentUtilities.get_unique_document(
                        collect_type,
                        {'data_uid': captureID}
                        )

                    #Create document for new model data since it does not exist.
                    if model_data_doc is None:
                        model_data = documentSchemas.ModelData_Document(data_uid=captureID)
                        documentWriter.upload_unique_object(
                            collect_type,
                            model_data,
                            db_filter
                        )

                    #Create document for iteration.
                    # Will always run no matter if it is a new capture (1st iteration) or new iteration (2nd or higher iteration)
                    model_object = documentSchemas.ModelObject_Document(
                        data_ref_id=captureID,
                        version=iterationID,
                        filetype=resultsPost["file_type"],
                        has_thumbnail=resultsPost["has_thumbnail"],
                        model_filename=iterationID,
                        thumbnail_filename="thumbnail.png"
                    )
                    documentWriter.upload_unique_object(
                        collect_type,
                        model_object,
                        {"ref_id": captureID, "version": iterationID}
                    )

                    print("Registering capture and iteration to database...")
                    print("Caputre ID:" + captureID)
                    print("Iteration ID:" + iterationID)

                    await editingServer.EditingServer._broadcast_new_reconstruction(captureID)

            except Exception as e:
                # Handle a specific error related to the reconstruction process
                return JSONResponse(status_code=500, content={"error": f"GLB Post-processing for reconstruction failed: {e}"})

            # Return success response after successful reconstruction
            return {"Database file Name": modelFile.filename}

    except FileNotFoundError as e:
        # Handle file not found errors
        return JSONResponse(status_code=404, content={"error": f"File not found: {e}"})

    except OSError as e:
        # Handle other file operation errors (e.g., permission issues)
        return JSONResponse(status_code=500, content={"error": f"File operation error: {e}"})

    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

# @v2_router.post("/uploadmodelzip/{captureID}")
# async def upload_modelzip(captureID: str, file: UploadFile = File(...)):
#     if file.filename:
#         rootCapturePath = "captures/" + captureID
#         if not os.path.exists(rootCapturePath):
#             utils.create_directory(rootCapturePath)

#         modelPath = rootCapturePath + "/models"
#         if not os.path.exists(modelPath):
#             utils.create_directory(modelPath)

#         id = file.filename.split(".")
#         id = id[0]

#         with open(f"{modelPath}/{file.filename}", "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
#             await asyncio.to_thread(utils.unzip_file, f"{modelPath}/{file.filename}", f"{modelPath}/{id}")

#         loop = asyncio.get_running_loop()
#         results = await loop.run_in_executor(
#             executor, runPostReconstruction, modelPath, modelPath, id, "obj", False
#         )

#         if results["success"]:
#             db_filter = {'data_uid': captureID}
#             collect_type = db_types.CollectionType.RECONSTRUCTIONS

#             model_data_doc = document_reader.find_unique_document(
#                 collect_type,
#                 {'data_uid': captureID}
#                 )

#             #Create document for new model data since it does not exist.
#             if model_data_doc is None:
#                 model_data = document_schemas.ModelData_Document(data_uid=captureID)
#                 document_writer.upload_unique_object(
#                     collect_type,
#                     model_data,
#                     db_filter
#                 )

#             #Create document for model_object
#             model_object = document_schemas.ModelObject_Document(
#                 data_ref_id=captureID,
#                 version=id,
#                 filetype=results["file_type"],
#                 has_thumbnail=results["has_thumbnail"],
#                 model_filename=id,
#                 thumbnail_filename="thumbnail.png"
#             )
#             document_writer.upload_unique_object(
#                 collect_type,
#                 model_object,
#                 {"ref_id": captureID, "version": id}
#             )

#             await EditingServer._notify_new_reconstruction(captureID)

#         return {"Model zip Name": id}

# @v2_router.post("/uploadplyzip/{captureID}")
# async def upload_plyzip(captureID: str, file: UploadFile = File(...)):
#     if file.filename:
#         rootCapturePath = "captures/" + captureID
#         if not os.path.exists(rootCapturePath):
#             utils.create_directory(rootCapturePath)

#         plyPath = rootCapturePath + "/pointclouds"
#         if not os.path.exists(plyPath):
#             utils.create_directory(plyPath)

#         modelPath = rootCapturePath + "/models"
#         if not os.path.exists(modelPath):
#             utils.create_directory(modelPath)

#         id = file.filename.split(".")
#         id = id[0]

#         zipFilePath = f"{plyPath}/{file.filename}"
#         extractFilePath = f"{plyPath}/{id}"

#         with open(f"{plyPath}/{file.filename}", "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
#             await asyncio.to_thread(utils.unzip_file, zipFilePath, extractFilePath)

#         return {"Model zip Name": id}

# async def writeToDatabase(captureID: str, versionID: str, fileType: str, hasThumbnail: str):
#     #If Success, write data into mongodb
#     db_filter = {'data_uid': captureID}
#     collect_type = db_types.CollectionType.RECONSTRUCTIONS

#     model_data_doc = document_reader.find_unique_document(
#         collect_type,
#         {'data_uid': captureID}
#         )

#     #Create document for new model data since it does not exist.
#     if model_data_doc is None:
#         model_data = document_schemas.ModelData_Document(data_uid=captureID)
#         document_writer.upload_unique_object(
#             collect_type,
#             model_data,
#             db_filter
#         )

#     #Create document for model_object
#     model_object = document_schemas.ModelObject_Document(
#         data_ref_id=captureID,
#         version=versionID,
#         filetype=fileType,
#         has_thumbnail=hasThumbnail,
#         model_filename=id,
#         thumbnail_filename="thumbnail.png"
#     )
#     document_writer.upload_unique_object(
#         collect_type,
#         model_object,
#         {"ref_id": captureID, "version": versionID}
#     )

#     await EditingServer._notify_new_reconstruction(captureID)

# # # DEPRECATED. Previously used with Meshroom reconstruction.
# # @v2_router.post("/launchreconstruction/{captureID}")
# # async def launchreconstruction(captureID: str):

#     print( Back.WHITE + Fore.BLACK +
#         "*****************************************************************************\n"
#         + "                      Reconstruction Call Started"
#         + "\n*****************************************************************************"
#     + Style.RESET_ALL)

#     rootCapturePath = "captures/" + captureID
#     imagePath = rootCapturePath + "/images"
#     modelPath = rootCapturePath + "/models"

#     loop = asyncio.get_running_loop()
#     results = await loop.run_in_executor(
#         executor, run_Meshroom, captureID, modelPath, imagePath
#     )

#     #If Success, write data into mongodb
#     if results["success"]:
#         db_filter = {'data_uid': captureID}
#         collect_type = db_types.CollectionType.RECONSTRUCTIONS

#         model_data_doc = document_reader.find_unique_document(
#             collect_type,
#             {'data_uid': captureID}
#             )

#         #Create document for new model data since it does not exist.
#         if model_data_doc is None:
#             model_data = document_schemas.ModelData_Document(data_uid=captureID)
#             document_writer.upload_unique_object(
#                 collect_type,
#                 model_data,
#                 db_filter
#             )

#         #Create document for model_object
#         model_object = document_schemas.ModelObject_Document(
#             data_ref_id=captureID,
#             version=results["version"],
#             filetype=results["file_type"],
#             has_thumbnail=results["has_thumbnail"],
#             model_filename=results["version"],
#             thumbnail_filename="thumbnail.png"
#         )
#         document_writer.upload_unique_object(
#             collect_type,
#             model_object,
#             {"ref_id": captureID, "version": results["version"]}
#         )

#         await EditingServer._notify_new_reconstruction(captureID)

#     print( Back.WHITE + Fore.BLACK + "\n" +
#         "*****************************************************************************\n"
#         + "                        Reconstruction Call Ended"
#         + "\n*****************************************************************************"
#     + Style.RESET_ALL)

#     response = JSONResponse(
#         content={
#             "Edge Node Task": "3D Model Reconstruction",
#             "Success": results["success"],
#         }
#     )
#     return response

# # DEPRECATED. Previously used with Meshroom reconstruction.
# @v2_router.post("/launchreconstructionselective/{captureID}")
# async def launchreconstructionselective(captureID: str, imageIDs: List[str]):

#     print( Back.WHITE + Fore.BLACK +
#         "*****************************************************************************\n"
#         + "                   Reconstruction Selective Call Started"
#         + "\n*****************************************************************************"
#     + Style.RESET_ALL)

#     rootCapturePath = "captures/" + captureID
#     imagePath = rootCapturePath + "/images"
#     modelPath = rootCapturePath + "/models"

#     tempImagePath = rootCapturePath + "/_temp/images"

#     # Start off by creating a temp folder and copying images
#     if not os.path.exists(tempImagePath):
#         utils.create_directory(tempImagePath)

#     # Copy images
#     for imageID in imageIDs:
#         fileName = captureID + "-" + imageID + ".png"
#         sourceFilePath = imagePath + "/" + fileName
#         toTempFilepath = tempImagePath + "/" + fileName
#         if os.path.exists(sourceFilePath):
#             print(f"Copying '{fileName}'")
#             shutil.copy(sourceFilePath, toTempFilepath)
#         else:
#             print(f"Source image file '{sourceFilePath}' does not exist. ID and associated image will not be used for reconstruction")

#     #Set to use temp images folder
#     imagePath = tempImagePath

#     print(f"Images copied to temp folder. Reconstruction will use images located at '{imagePath}'.")

#     loop = asyncio.get_running_loop()
#     results = await loop.run_in_executor(
#         executor, run_Meshroom, captureID, modelPath, imagePath
#     )

#     #If Success, write data into mongodb
#     if results["success"]:
#         db_filter = {'data_uid': captureID}
#         collect_type = db_types.CollectionType.RECONSTRUCTIONS

#         model_data_doc = document_reader.find_unique_document(
#             collect_type,
#             {'data_uid': captureID}
#             )

#         #Create document for new model data since it does not exist.
#         if model_data_doc is None:
#             model_data = document_schemas.ModelData_Document(data_uid=captureID)
#             document_writer.upload_unique_object(
#                 collect_type,
#                 model_data,
#                 db_filter
#             )

#         #Create document for model_object
#         model_object = document_schemas.ModelObject_Document(
#             data_ref_id=captureID,
#             version=results["version"],
#             filetype=results["file_type"],
#             has_thumbnail=results["has_thumbnail"]
#         )
#         document_writer.upload_unique_object(
#             collect_type,
#             model_object,
#             {"ref_id": captureID, "version": results["version"]}
#         )

#         await EditingServer._notify_new_reconstruction(captureID)

#     if os.path.exists(imagePath):
#         utils.delete_directory(imagePath)

#     print( Back.WHITE + Fore.BLACK + "\n" +
#         "*****************************************************************************\n"
#         + "                  Reconstruction Selective Call Ended"
#         + "\n*****************************************************************************"
#     + Style.RESET_ALL)

#     response = JSONResponse(
#         content={
#             "Edge Node Task": "3D Model Reconstruction using Selective image",
#             "Success": results["success"],
#         }
#     )

#     return response