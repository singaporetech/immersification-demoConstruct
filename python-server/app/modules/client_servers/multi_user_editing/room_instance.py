import json
import threading
from typing import Any
from .mesh_instance import MeshInstance
from datetime import datetime
from app.modules.model_database.types import DocumentType
from ..user import User
from ..marker import Marker

class RoomInstanceEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, MeshInstance):
            return obj.to_dict()
        if isinstance(obj, RoomInstance):
            return obj.to_dict()
        


# Room Preview
# Class for storing preview information about roomInstance files, without loading the actual scene into server memory.
# OBSOLETE after migrating to mongoDB. RoomPreview class no longer used.
class RoomPreview:
    def __init__(
        self,
        filename,
        name = "New Room",
        description = "No Description",
        authors = "N/A",
        created_date = "00/00/00",
        modified_date = "00/00/00",
    ):
        self.filename = filename
        self.name = name
        self.description = description
        self.authors = authors
        self.created_date = created_date
        self.modified_date = modified_date
        self.loaded_instance = None

    #For jsonData to send to editing client.
    def to_dict(self):
        return {
            "filename": self.filename,
            "name": self.name,
            "authors": self.authors,
            "description": self.description,
            "created_date": self.created_date,
            "modified_date": self.modified_date,
            "is_loaded": {True: "true", False: "false"}[self.loaded_instance != None],
        }

    @classmethod
    def from_dict(cls, dict_, filename):
        return cls(
            filename,
            dict_["name"],
            dict_["description"],
            dict_["authors"],
            dict_["created_date"],
            dict_["modified_date"],
        )

    @staticmethod
    def deserialize(directory, filename):
        dict_ = None
        with open(directory + filename, "r") as f:
            dict_ = json.load(f)
        return RoomPreview.from_dict(dict_, filename)


# Room Instance
# Class for server representation of a scene, with all models "loaded" and users connected to this room session.
class RoomInstance:
    def __init__(
        self,
        room_id: int,
        name: str = "New Room",
        description: str = "dover_courtyard",
        authors: str = "N/A",
        created_date: str = "00/00/00",
        modified_date: str = "00/00/00",
        mesh_instance_dict: dict[int, MeshInstance] = {},
        mesh_creation_count: int = 0,
        markers: dict[int, Marker] = {},
        marker_creation_count: int = 0,
    ):
        self.room_id: int = room_id
        self.name: str = name
        self.description: str = description
        self.authors:str = authors
        self.created_date:str = created_date
        self.modified_date:str = modified_date
        self.mesh_instance_dict: dict[int, MeshInstance] = mesh_instance_dict
        self.mesh_creation_count = mesh_creation_count
        self.markers: dict[int, Marker] = markers
        self.marker_creation_count = marker_creation_count
        

        self.editing_users: dict[int, User] = {}
        self.pending_actions: list[any] = []

        self.deleted_meshes: list[int] = []
        self.deleted_users: list[int] = []
        self.deleted_markers: list[int] = []

        self.thread_lock = threading.Lock()

    def process_pending_actions(self):
        # Invoke pending actions to modify room state.
        for action in self.pending_actions:
            action.invoke(self)
        self.pending_actions.clear()
        pass

    def get_dirty_mesh_instances(self):
        dirty_meshes = []
        for mesh in self.mesh_instance_dict.values():
            if mesh.is_dirty:
                mesh.is_dirty = False
                dirty_meshes.append(mesh)

        return [mesh.to_client_update_dict() for mesh in dirty_meshes]

    def post_update(self):
        if len(self.deleted_meshes) > 0:
            for del_id in self.deleted_meshes:
                del self.mesh_instance_dict[del_id]
            self.deleted_meshes.clear()

        if len(self.deleted_users) > 0:
            for del_id in self.deleted_users:
                print("#Deleting Edit User: ", del_id)
                del self.editing_users[del_id]
            self.deleted_users.clear()
        
        if len(self.deleted_markers) > 0:
            for del_id in self.deleted_markers:
                del self.markers[del_id]
            self.deleted_markers.clear()

    def get_user_instances(self):
        return [user.to_dict() for user in self.editing_users.values()]

    def add_pending_action(self, action: any):
        self.thread_lock.acquire()
        self.pending_actions.append(action)
        self.thread_lock.release()

    def _create_dates(self):
        datetime_string = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.created_date = datetime_string
        self.modified_date = datetime_string

    def _initialize_room(self):
        pass

    def check_user_exists(self, user_id: int):
        return user_id in self.editing_users

    def add_editing_user(self, editing_user: User):
        self.editing_users[editing_user.id] = editing_user

    def remove_editing_user(self, editing_user: User):
        if editing_user.id in self.editing_users:
            del(self.editing_users[editing_user.id])

    def get_mesh_instance_by_id(self, id: int):
        if id in self.mesh_instance_dict:
            return self.mesh_instance_dict[id]
        return None
    
    def get_marker_update(self):
        marker_states: list[dict] = []

        for marker in self.markers.values():
            if marker.is_dirty == False:
                marker_states.append(marker.to_dict())
        return marker_states
    
    def get_marker_states(self):
        marker_states: list[dict] = []
        for marker in self.markers.values():
            marker_states.append(marker.to_dict())
        return marker_states

    def get_room_objects(self):
        return [
            mesh.to_client_update_dict() for mesh in self.mesh_instance_dict.values()
        ]

    def to_dict(self):
        mesh_list = [
            mesh_instance.to_dict() for mesh_instance in self.mesh_instance_dict.values()
        ]
        marker_list = [
            marker.to_dict() for marker in self.markers.values()
        ]
        return {
            "room_id": self.room_id,
            "name": self.name,
            "description": self.description,
            "authors": self.authors,
            "created_date": self.created_date,
            "modified_date": self.modified_date,
            "mesh_instances": mesh_list,
            "mesh_creation_count": self.mesh_creation_count,
            "marker_instances": marker_list,
            "marker_creation_count": self.marker_creation_count
        }

    @classmethod
    def load_from_dict(cls, dict_):
        instance = cls(
            dict_["room_id"],
            dict_["name"],
            dict_["description"],
            dict_["authors"],
            dict_["created_date"],
            dict_["modified_date"],
            {}, # dict_["mesh_instances"],
            dict_["mesh_creation_count"],
            {}, # dict_["marker_instances"],
            dict_["marker_creation_count"]
        )

        # get a list of meshes from instance
        # mesh_list = []
        mesh_list = [MeshInstance.from_dict(mesh) for mesh in dict_.get("mesh_instances", [])]
        # for mesh in dict_.get("mesh_instances", []):
        #     mesh_instance = MeshInstance.from_dict(mesh)
        #     mesh_list.append(mesh_instance)

        # Set each key:value according to the mesh list order
        for mesh_instance in mesh_list:
            instance.mesh_instance_dict[mesh_instance.instance_id] = mesh_instance
        
        # marker_list = []
        marker_list = [Marker.from_dict(marker) for marker in dict_.get("marker_instances", [])]
        # for marker in dict_.get("marker_instances", []):
        #     marker_instance = MeshInstance.from_dict(marker)
        #     marker_list.append(marker_instance)

        for marker in marker_list:
            instance.markers[marker.id] = marker
        
        return instance

    @staticmethod
    def deserialize(directory: str, filename: str):
        dict_ = None
        with open(directory + filename, "r") as f:
            dict_ = json.load(f)
        return RoomInstance.load_from_dict(dict_)

    def serialize(self, directory: str, filename: str):
        with open(directory + filename, "w") as f:
            json.dump(self, f, cls=RoomInstanceEncoder, indent=4)
