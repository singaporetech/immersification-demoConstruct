from .types import DocumentType, CollectionType, collections_dict

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
        case val if val > 1:
            return 0    #Is not unique
        case 1:
            return 1    #Is unique
        case 0:
            return -1   #Document does not exist