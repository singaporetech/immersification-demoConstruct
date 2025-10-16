from typing import Any, Optional
from  database.mongoDB.types import CollectionType, collections_dict

def check_unique_filter(collectionType: CollectionType, filters) -> int:
    """
    Checks if the collection and query parameters can find a unique document in the collection.

    Returns:
        1 - if only one document matches the specified filter.
        0 - if multiple documents match the specified filter.
        -1 - if no documents match the specified filter.
    """
    global collections_dict
    count = collections_dict[collectionType].count_documents(filters)
    match count:
        case 0:
            return -1   #Document does not exist
        case 1:
            return 1    #Is unique
        case val if val > 1:
            return 0    #Is not unique

def get_unique_document(collectionType: CollectionType, db_filter: Any, db_projection: Optional[Any] = {}):
    """
    Takes given collection type and filter and checks if filter provided matches with only
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

def check_latest_filter(collectionType: CollectionType, filters) -> int:
    global collections_dict
    count = collections_dict[collectionType].count_documents(filters)
    match count:
        case 0:
            return 0   #No docs of reconstruction exist
        case val if val >= 1:
            latestIteration = None
            latestIterationDoc = None

            docs = collections_dict[collectionType].find(filters)

            for doc in docs:
                if "version" in doc:
                    try:
                        checkedIteration = int(doc["version"])
                        if latestIteration is None or checkedIteration > latestIteration:
                            latestIteration = checkedIteration
                            latestIterationDoc = doc
                    except ValueError:
                        print(f"Invalid number in 'version': {doc['version']}")

            if latestIterationDoc:
                print("Document with highest 'version':", latestIterationDoc)
                return latestIteration
            else:
                print("No valid versions found.")
                return 0    # No version found for some reason
