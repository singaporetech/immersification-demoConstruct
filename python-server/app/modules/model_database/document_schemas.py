"""
This file defines classes to represent a document stored on MongoDB.
While it is appropriate to json serialize classes without using a schema in this script,
documents that don't have a exact class representation (from another script or wherever) can be defined here.
"""
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, conint, constr, confloat
from datetime import datetime

class ModelData_Document(BaseModel):
    data_uid: constr(to_lower=True)
    name: Optional[str] = "New Model"
    authors: Optional[str] = "No Author"
    description: Optional[str] = "No Description"
    creation_date: Optional[str] = "Not Listed"

    class Config:
        json_encoders = {ObjectId: str}

class ModelObject_Document(BaseModel):
    data_ref_id: constr(to_lower=True)
    version: constr(max_length=8)
    filetype: constr(max_length=8)
    has_thumbnail: bool = False
    model_filename: str = None
    thumbnail_filename: str = None

    class Config:
        json_encoders = {ObjectId: str}