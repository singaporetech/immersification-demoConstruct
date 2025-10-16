from pymongo import MongoClient
from typing import Dict
from fastapi import APIRouter
from database.mongoDB import types, modelValidation

router = APIRouter(tags=["mongodbConfigRouter"], prefix="/configdb")

def ping_mongodb_client(isPrinting = False) -> bool:
    try:
        types.mongo_client.admin.command("ping")
        if isPrinting:
            print("# Pinged MongoDB Server. Successfully connected!")
    except Exception as e:
        print("# MongDB ping failed with error: ", e)
        return False
    return True

@router.on_event("startup")
def startup_router():
    print("# Setting up MongoDB connection")

    types.mongo_client = MongoClient(types.MONGO_DB_URI)
    types.mongo_database = types.mongo_client[types.MONGO_DB_NAME]

    if ping_mongodb_client() == False:
        print("# MongoDB Connection Failed.")
    
    db = types.mongo_database

    types.collections_dict[types.CollectionType.RECONSTRUCTIONS] = db["reconstructions"]
    types.collections_dict[types.CollectionType.ROOMS] = db["rooms"]
    types.collections_dict[types.CollectionType.USERS] = db["users"]

    print("# MongoDB setup successful")

    # ping_client()

@router.on_event("shutdown")
def shutdown_router():
    print("# Shutting down MongoDB connection")

    types.mongo_database = None
    types.mongo_client.close()

@router.get("/ping")
def ping_client():
    if ping_mongodb_client():
        print("successful ping")
        return {"mongodb ping": "success"}
    
    print("failed ping")
    return {"mongodb ping": "fail"}

# TODO: Check if still in use
@router.get("/validate_reconstructions")
def validate_reconstructions(code: int = 0):
    modelValidation.validate_models()
    modelValidation.flush_and_regenerate_reconstructions()
    return {"msg": "Ok"}