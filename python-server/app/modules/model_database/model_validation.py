import os
from app.server_globals import dotenv_config
from .types import collections_dict, CollectionType
from app import model_io
from pymongo.collection import Collection
from .document_schemas import ModelData_Document, ModelObject_Document
from . import document_writer

local_files: dict[
    str,
    dict[
        str,
        any
    ]
]

collection: Collection = None

#Model data documents
model_data_docs: dict[str, any] = []
missing_ids: list = []
extra_ids: list = []

#Model Object Documents
model_obj_docs: dict[
    (str, str),
    any
] = {}

missing_objs: list = []
extra_objs: list = []

invalid_ref_ids: list = []

amended_obj_docs: list = []

def _find_local_files():
    def get_model_versions(model_id: str):
        versions_dir = model_id + "/models"
        if not os.path.exists(versions_dir):
            return []
        return model_io.get_path_directories(versions_dir)

    def check_files_exists(version_dir: str):
        model_name = None
        thumbnail_name = None
        creation_date = None

        with os.scandir(version_dir) as entries:
            for entry in entries:
                if not entry.is_file(): 
                    break
                if entry.name.endswith(".obj") or entry.name.endswith(".glb"):
                    model_name = entry.name
                elif entry.name.endswith("thumbnail.png"):
                    thumbnail_name = entry.name
        return {
            "model_name": model_name,
            "thumbnail_name": thumbnail_name,
            "creation_date": model_io.get_file_meta_data(version_dir + "/" + model_name)["created_date"]
        }
    global local_files
    local_files = {}
    model_ids = model_io.get_path_directories("captures")

    for id_folder in model_ids:
        id_folder = id_folder.lower()
        id_dir = "captures/" + id_folder
        versions = get_model_versions(id_dir)
        version_states = {}
        for version in versions:
            file_state = check_files_exists(id_dir + "/models/" + version)
            version_states[version] = file_state
        local_files[id_folder] = version_states

def _fetch_data_docs():
    global model_data_docs
    model_data_docs = {}
    data_docs = collection.find({"data_uid": {"$exists": True}}, {"_id": 0, "data_uid": 1})

    for doc in data_docs:
        model_data_docs[doc["data_uid"]] = doc

def _compare_id_folders():
    global extra_ids
    global missing_ids
    extra_ids = []
    missing_ids = []
    for data in model_data_docs.keys():
        extra_ids.append(data)

    model_ids = local_files.keys()

    for id in model_ids:
        if id in extra_ids:
            extra_ids.remove(id)
        else:
            missing_ids.append(id)

    print("# Extra model data documents: ", extra_ids)
    print("# Missing model data documents: ", missing_ids)

def _fetch_obj_docs():
    global model_obj_docs
    model_obj_docs = {}
    obj_docs = collection.find({
        "data_ref_id": {"$exists": True},
        "version": {"$exists": True}
        })
    for doc in obj_docs:
        key = (doc["data_ref_id"], doc["version"])
        model_obj_docs[key] = doc

def _compare_version_data():
    global missing_objs
    global extra_objs
    global invalid_ref_ids

    missing_objs = []
    extra_objs = []
    invalid_ref_ids = []

    #For each key of id,version
    doc_keys = model_obj_docs.keys()
    for key in doc_keys:
        #Check if id exists
        #Check if version exists
        uid = key[0]
        version = key[1]

        #Check if referenced uid exists in local file or as data doc in database
        if uid not in local_files:
            if uid not in model_data_docs:
                print(f"- Obj ref id {uid} does not reference existing data doc on mongodb: ", uid)
                invalid_ref_ids.append(uid)
            else:
                print(f"- Obj ref id {uid} does not exist as local file but references existing data doc: ", uid)
                extra_objs.append(model_obj_docs[key])
            continue

        #Check if specified version exists in local files.
        if version not in local_files[uid]:
            print(f"- {key} does not exist as local file in given uid")
            extra_objs.append(model_obj_docs[key])
            continue

        #Check if document references correct local files
        doc = model_obj_docs[key]
        version_state = local_files[uid][version]

        amend = False
        
        doc_model_name = doc["model_filename"] + doc["filetype"]

        if version_state["model_name"] != doc_model_name:
            print(f"- {key} obj model name does not match local file. Expected: ", version_state["model_name"], ", received: ", doc_model_name)
            doc["model_filename"] = version_state["model_name"]
            amend = True
        if version_state["thumbnail_name"] != doc["thumbnail_filename"]:
            print(f"- {key} obj thumbnail name does not match local file. Expected: ", version_state["thumbnail_name"], " Received: ", doc["thumbnail_filename"])
            doc["thumbnail_filename"] = version_state["thumbnail_name"]
            amend = True

        if amend:
            amended_obj_docs.append(doc)
        else:
            #print(f"- {key} obj document has no issues")
            pass

def _print_error_docs():
    print("# Printing database mismatches")
    print("- missing data documents")
    print(missing_ids, "\n")

    print("- data documents pointing to missing file")
    print(extra_ids, "\n")

    print("- missing obj documents")
    print(missing_objs, "\n")

    print ("- extra obj documents")
    print(extra_objs, "\n")

    print("- invalid ref obj documents")
    print(invalid_ref_ids, "\n")

    print("- documents pending ammendment")
    print(amended_obj_docs, "\n")
    pass

def validate_models():
    global collection

    collection = collections_dict[CollectionType.RECONSTRUCTIONS]

    _find_local_files()

    _fetch_data_docs()
    _compare_id_folders()

    _fetch_obj_docs()
    _compare_version_data()

    _print_error_docs()

def flush_and_regenerate_reconstructions():
    data_filter = {
        "data_uid": {"$exists": True}
    }
    obj_filter = {
        "data_ref_id": {"$exists": True}
    }
    collection.delete_many(data_filter)
    collection.delete_many(obj_filter)

    for key in local_files.keys():
        print("- Key: ", key)
        versions = local_files[key]
        
        if len(versions) == 0:
            continue

        first_vers = next(iter(versions.values()))
        data_doc = ModelData_Document(data_uid=key, name=key, creation_date=first_vers["creation_date"])
        document_writer.upload_unique_object(CollectionType.RECONSTRUCTIONS, data_doc, {"data_uid": key})

        for version in versions.keys():
            filename:str = versions[version]["model_name"]
            thumbnail:str = versions[version]["thumbnail_name"]

            if filename == None:
                continue

            splits = filename.split(".")

            name_only = splits[0]
            ext = "." + filename.split(".")[-1]
            
            obj_doc = ModelObject_Document(
                data_ref_id= key,
                version= version,
                filetype= ext,
                has_thumbnail= True,
                model_filename= name_only,
                thumbnail_filename= thumbnail
            )

            document_writer.upload_unique_object(CollectionType.RECONSTRUCTIONS, obj_doc, {"data_ref_id": key, "version": version})