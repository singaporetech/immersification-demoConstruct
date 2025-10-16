from fastapi import APIRouter, File
from fastapi.responses import JSONResponse

from database.mongoDB import documentUtilities, types

router = APIRouter(tags=["databaseRouter"])

@router.get("/checkmodels/{reconstructionID}/{versionID}/{extension}")
def check_reconstruction_registered(reconstructionID: str, versionID: str, extension: str):
    try:
        collect_type = types.CollectionType.RECONSTRUCTIONS

        model_data_doc = documentUtilities.check_unique_filter(
            collect_type,
            {'data_ref_id': reconstructionID,
             'version': versionID}
            )
            
        # Check if reconstrction and version is registered to DB.
        check_file = False
        
        if model_data_doc == 1:
            check_file = True

        response = JSONResponse(content={"exists": check_file})
        return response
    
    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

@router.get("/checkgaussian/{reconstructionID}/{versionID}")
def check_gaussian_registered(reconstructionID: str, versionID: str):
    try:
        collect_type = types.CollectionType.RECONSTRUCTIONS

        model_data_doc = documentUtilities.check_unique_filter(
            collect_type,
            {'data_ref_id': reconstructionID,
             'version': versionID,
             'filetype': ".splat"}
            )
            
        # Check if reconstrction and version is registered to DB.
        check_file = False
        
        if model_data_doc == 1:
            check_file = True

        response = JSONResponse(content={"exists": check_file})
        return response
    
    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})

@router.get("/checkmodellatest/{reconstructionID}")
def check_reconstruction_latest(reconstructionID: str):
    try:
        collect_type = types.CollectionType.RECONSTRUCTIONS

        latestIterationVersion = documentUtilities.check_latest_filter(
            collect_type,
            {'data_ref_id': reconstructionID}
            )

        response = JSONResponse(content={"latest iteration": latestIterationVersion})
        return response
    
    except Exception as e:
        # Catch any other unexpected errors
        return JSONResponse(status_code=500, content={"error": f"An error occurred: {e}"})