"""
This file defines classes to represent a document stored on MongoDB.
While it is appropriate to json serialize classes without using a schema in this script,
documents that don't have a exact class representation (from another script or wherever) can be defined here.
"""
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, StringConstraints, constr

from editingClientSessioning.roomObjects.meshInstance import MeshInstance
from editingClientSessioning.roomObjects.markerInstance import MarkerInstance

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

# class ModelRoom_Document(BaseModel):
#     data_uid: constr(to_lower=True)
#     room_id: int = 0
#     name: str = "New Room",
#     description: str = "dover_courtyard",
#     authors: str = "N/A",
#     created_date: str = "00/00/00",
#     modified_date: str = "00/00/00",
#     mesh_dict: dict[int, MeshInstance] = {},
#     mesh_creation_count: int = 0,
#     marker_dict: dict[int, MarkerInstance] = {},
#     marker_creation_count: int = 0,
#     # annotation_dict: dict[int, AnnotationInstance] = {},
#     # annotation_count: int = 0,

#     class Config:
#         json_encoders = {ObjectId: str}