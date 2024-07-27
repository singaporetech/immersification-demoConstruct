from typing import Any, TypeAlias
from enum import IntEnum
from pymongo.mongo_client import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
import pymongo

DocumentType: TypeAlias = Any | None

class CollectionType(IntEnum):
    ROOMS = 1
    RECONSTRUCTIONS = 2
    USERS = 3

MONGO_DB_URI = "mongodb://localhost:27017/"
MONGO_DB_NAME="democonstructdb"


mongo_client: MongoClient = None
mongo_database: Database = None
collections_dict: dict[CollectionType, Collection] = {}