from typing import Any, Optional
from .types import DocumentType, CollectionType, collections_dict
from .document_utils import check_unique_filter
from pydantic import conint

def find_unique_document(collectionType: CollectionType, db_filter: Any, db_projection: Optional[Any] = {}):
    """
    Takens given collection type and filter and checks if filter provided matches with only
    1 document, then returns that documents from database.

    Returns: 
        Found document if the filter is unique OR
        None if multiple or zero documents match the filter.
    """
    unique_state = check_unique_filter(collectionType, db_filter)
    if unique_state == 1:
        return collections_dict[collectionType].find_one(db_filter, db_projection)
    elif unique_state == 0:
        pass
    elif unique_state == -1:
        pass
    return None