import os
from .types import collections_dict, CollectionType
from typing import List, KeysView, Dict
from utililites import modelIOTools


def _get_latest_versions(uids: list[str] | KeysView) -> dict[str, any]:
    '''
    Loops through a list of reconstructions using their unique database id 'data_ref_id' from mongoDB, and gets the latest version of the model for each of them.
    '''
    latest_versions = {}
    for uid in uids:
        filter = {"data_ref_id": uid}
        obj_docs = collections_dict[CollectionType.RECONSTRUCTIONS].find(filter)
        
        newest_doc = None
        largest_version = -1
        for doc in obj_docs:
            version_num = int(doc["version"]) if doc["version"].isnumeric() and doc["filetype"] == ".glb" else -1
            if newest_doc == None or largest_version < version_num:
                newest_doc = doc
                largest_version = version_num
            
        latest_versions[uid] = newest_doc
    return latest_versions

def _get_file_base64(uid: str, version: str, thumbnail_name: str) -> str | None:
    if thumbnail_name == None:
        return None

    captures_dir = os.environ.get('CAPTURE_DIRECTORY', default='captures')
    thumbnail_path = captures_dir + "/" + uid + "/models/" + version + "/" + thumbnail_name
    if os.path.exists(thumbnail_path):
        return modelIOTools.GetBase64Data(thumbnail_path)
    else:
        return None

def fetch_model_previews():
    '''
    Loops through models and gets the latest iteration to create a data and thumbnail list.
    '''
    filter = {"data_uid": {"$exists": True}}

    model_data_docs = collections_dict[CollectionType.RECONSTRUCTIONS].find(filter)
    uids = {}
    for doc in model_data_docs:
        uids[doc['data_uid']] = doc
    
    versions = _get_latest_versions(uids.keys())

    result = []

    for version in versions.values():
        uid_doc = uids[version["data_ref_id"]]
        model_info = {
            "id": uid_doc["data_uid"],
            "name": uid_doc["name"],
            "thumbnail_data": _get_file_base64(
                uid_doc["data_uid"],
                version["version"],
                version["thumbnail_filename"])
        }
        result.append(model_info)
    
    return  {"model_previews": result}

def _write_to_file(values: Dict[str, str], file_dir: str, file_name: str, exclude_keys = []):
    file_path = file_dir + "/" + file_name

    if os.path.exists(file_path):
        os.remove(file_path)

    file = open(file_path, "w")
    for key in values:
        if key in exclude_keys:
            continue
        line = key + ": " + values[key] + "\n"
        file.write(line)
    file.close

def package_model_zip(uid: str, version: str, name: str):
    result = {"zipData": "null"}
    filter = {"data_uid": uid}
    model_data_doc = collections_dict[CollectionType.RECONSTRUCTIONS].find_one(filter)

    model_data_doc["version"] = version

    captures_dir = os.environ.get('CAPTURE_DIRECTORY', default='captures')
    file_dir = captures_dir + "/" + uid + "/models/" + version
    
    if os.path.exists(file_dir) == False:
        print("File_Path does not exist: ", file_dir)
        return result

    _write_to_file(model_data_doc, file_dir, "info.txt", ["_id"])
    modelIOTools.CreateZipFileFromPath(name, file_dir)
    result["zipData"] = modelIOTools.GetBase64Data(name + ".zip")
    os.remove(name + ".zip")

    return result

def fetch_model_data(uid: str):
    filter = {
        "data_uid": uid
    }

    doc = collections_dict[CollectionType.RECONSTRUCTIONS].find_one(filter=filter)
    
    if doc == None:
        print("Fetch Model Data: ", uid, " not found")
        return None

    return {
        "name": doc["name"],
        "authors": doc["authors"],
        "description": doc["description"],
        "creation_date": doc["creation_date"]
    }

def fetch_model_data_dl_url(uid: str, version: str = None):
    result = {}
    data_filter = {
        "data_uid": uid
    }

    # get latest for mesh
    if version == None or version == "__LIVE_VERSION":
        versions = _get_latest_versions([uid])
        if uid in versions:
            version = versions[uid]["version"]
        else:
            raise Exception(-f"UID {uid} does not have a model version")
        
    # filter for mesh
    mesh_filter = {
        "data_ref_id": uid,
        "version": version,
        "filetype": ".glb"
    }

    # get latest for gs
    gs_filter = {
        "data_ref_id": uid,
        "version": version,
        "filetype": ".splat"
    }

    # filter for gs
    # obj_filter = {
    #     "data_ref_id": uid,
    #     "version": version
    #     # "filetype": ".splat"
    # }

    data_doc = collections_dict[CollectionType.RECONSTRUCTIONS].find_one(data_filter)
    mesh_doc = collections_dict[CollectionType.RECONSTRUCTIONS].find_one(mesh_filter)
    gs_doc = collections_dict[CollectionType.RECONSTRUCTIONS].find_one(gs_filter)

    # result["id"] = uid
    # version_dir = "/" + uid + "/models/" + version + "/"
    # result["directory"] = modelIOTools.downloadModelEndpoint + version_dir
    
    # if data_doc == None:
    #     raise Exception("Specified data doc not found", version)
    # else:   
    #     result["name"] = data_doc["name"]
    #     result["description"] = data_doc["description"]
    #     result["dateCreated"] = data_doc["creation_date"]
    #     result["authors"] = data_doc["authors"]
    # if mesh_doc == None:
    #     raise Exception("Specified mesh doc not found: ", version)
    # else:
    #     result["version"] = mesh_doc["version"]
    #     result["fileName"] = mesh_doc["model_filename"] + mesh_doc["filetype"]
    # if gs_doc == None:
    #     raise Exception("Specified gs doc not found: ", version)
    # else:
    #     result["gsVersion"] = gs_doc["gsVersion"]
    #     result["gsFileName"] = gs_doc["model_filename"] + gs_doc["gsFiletype"]
    
    if data_doc == None:
        raise Exception("Specified data doc not found", version)
    if mesh_doc == None:
        raise Exception("Specified mesh doc not found: ", version)
    # if gs_doc == None:
    #     raise Warning("Specified gs doc not found: ", version)


    result["id"] = uid
    result["version"] = mesh_doc["version"]
    result["gsVersion"] = gs_doc["version"] if gs_doc is not None else "0"
    result["name"] = data_doc["name"]
    result["description"] = data_doc["description"]
    result["dateCreated"] = data_doc["creation_date"]
    result["authors"] = data_doc["authors"]
    version_dir = "/" + uid + "/models/" + version + "/"
    result["directory"] = modelIOTools.downloadModelEndpoint + version_dir
    result["fileName"] = mesh_doc["model_filename"] + mesh_doc["filetype"]
    result["gsFileName"] = gs_doc["model_filename"] + gs_doc["filetype"] if gs_doc is not None else "invaild"

    return result

def update_model_data(uid: str, data: any) -> bool:
    update = {
        "name": data["name"],
        "authors": data["authors"],
        "description": data["description"]
    }
    filter = {
        "data_uid": uid
    }

    update_result = collections_dict[CollectionType.RECONSTRUCTIONS].update_one(filter=filter, update={"$set": update})
    
    if update_result.acknowledged:
        if update_result.matched_count > 0:
            return True
        return False
    
def fetch_edit_room_previews():
    filter = {}

    projection = {
        "_id": 0,
        "mesh_instances": 0,
        "mesh_creation_count": 0
    }

    rooms_cursor = collections_dict[CollectionType.ROOMS].find(filter, projection)
    return {
        "room_previews": list(rooms_cursor)
    }