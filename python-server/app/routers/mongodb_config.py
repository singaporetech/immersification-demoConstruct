from pymongo import MongoClient
from typing import Dict
from fastapi import APIRouter
from ..modules.model_database import document_writer
from ..modules.model_database import types as db_types
from ..modules.model_database import model_validation

mongodb_router = APIRouter(tags=["mongodb_config"], prefix="/configdb")

def ping_mongodb_client(isPrinting = False) -> bool:
    try:
        db_types.mongo_client.admin.command("ping")
        if isPrinting:
            print("# Pinged MongoDB Server. Successfully connected!")
    except Exception as e:
        print("# MongDB ping failed with error: ", e)
        return False
    return True

@mongodb_router.on_event("startup")
def startup_router():
    print("# Setting up MongoDB connection")

    db_types.mongo_client = MongoClient(db_types.MONGO_DB_URI)
    db_types.mongo_database = db_types.mongo_client[db_types.MONGO_DB_NAME]

    if ping_mongodb_client() == False:
        print("# MongoDB Connection Failed.")
    
    db = db_types.mongo_database

    db_types.collections_dict[db_types.CollectionType.RECONSTRUCTIONS] = db["reconstructions"]
    db_types.collections_dict[db_types.CollectionType.ROOMS] = db["rooms"]
    db_types.collections_dict[db_types.CollectionType.USERS] = db["users"]

    print("# MongoDB setup successful")

@mongodb_router.on_event("shutdown")
def shutdown_router():
    print("# Shutting down MongoDB connection")

    db_types.mongo_client.close()
    mongo_database = None

@mongodb_router.get("/ping")
def ping_client():
    if ping_mongodb_client():
        return {"mongodb ping": "success"}
    return {"mongodb ping": "fail"}

@mongodb_router.get("/validate_reconstructions")
def validate_reconstructions(code: int = 0):
    model_validation.validate_models()
    model_validation.flush_and_regenerate_reconstructions()
    return {"msg": "Ok"}