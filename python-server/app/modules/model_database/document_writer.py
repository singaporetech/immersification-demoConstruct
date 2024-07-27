from .types import DocumentType, CollectionType, collections_dict
from .document_utils import check_unique_filter
from fastapi.encoders import jsonable_encoder
from pymongo.collection import Collection
from typing import Any


def upload_unique_object(collectionType: CollectionType, object: Any, filters: Any, overwrite: bool = False) -> bool:
    """
    This is a helper function to convert objects into a document.
    Uses filters to ensure object is unique in collection.
    Filter ideally uses a variables from the object as unique id to ensure object is unique.
    """
    json_document: DocumentType = None
    collection: Collection = None

    #Create json formatted type from to_dict() function if it has one, else use fastapi jsonable_encoder
    if hasattr(object, "to_dict") and callable(getattr(object, "to_dict")):
        json_document = object.to_dict()
    else:
        json_document = jsonable_encoder(object)
    
    #Find collection
    if collectionType in collections_dict:
        collection = collections_dict[collectionType]

    #Check unique query
    unique_state = check_unique_filter(collectionType, filters)
    
    update_result = None

    #Update/upload document to database
    if unique_state == 1:
        if overwrite:
            update_result = collection.update_one(filters, {"$set": json_document})
        else:
            print("Filter used will override existing document with upload. Specify parameter override = True if this is desired behaviour")
            return False
    elif unique_state == 0:
        print("Specified filter returns ${doc_count} documents. Filter must set criteria to return only a unique document!")
        return False
    elif unique_state == -1:
        update_result = collection.insert_one(json_document)

    if update_result.acknowledged:
        return True
    return False