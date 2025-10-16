import json
import threading
from typing import Any
from datetime import datetime

from database.mongoDB.types import DocumentType
from editingClientSessioning.roomObjects.annotationInstance import AnnotationInstance
from editingClientSessioning.roomObjects.MeasurementInstance import MeasurementInstance
from editingClientSessioning.roomObjects.userInstance import UserInstance
from editingClientSessioning.roomObjects.markerInstance import MarkerInstance
from editingClientSessioning.roomObjects.meshInstance import MeshInstance

class RoomInstanceEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, MeshInstance):
            return obj.to_dict()
        if isinstance(obj, RoomInstance):
            return obj.to_dict()

# Room Preview
# Class for storing preview information about roomInstance files, without loading the actual scene into server memory.
# OBSOLETE after migrating to mongoDB. RoomPreview class no longer used.
#TODO: remove all refs to function and delete func
class RoomPreview:
    def __init__(
        self,
        filename,
        name = "New Room",
        # type = "NIL",
        baseReconstruction = "dover_courtyard",
        authors = "N/A",
        created_date = "00/00/00",
        modified_date = "00/00/00",
    ):
        self.filename = filename
        self.name = name
        self.baseReconstruction = baseReconstruction
        self.authors = authors
        self.created_date = created_date
        self.modified_date = modified_date
        self.loaded_instance = None

    #For jsonData to send to editing client.
    def to_dict(self):
        return {
            "filename": self.filename,
            "name": self.name,
            # "type": self.type,
            "authors": self.authors,
            "baseReconstruction": self.baseReconstruction,
            "created_date": self.created_date,
            "modified_date": self.modified_date,
            "is_loaded": {True: "true", False: "false"}[self.loaded_instance != None],
        }

    @classmethod
    def from_dict(cls, dict_, filename):
        return cls(
            filename,
            dict_["name"],
            # dict_["type"],
            dict_["baseReconstruction"],
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
# TODO: maybe move this into some editable struct for scalability?
class RoomInstance:
    def __init__(
        self,
        room_id: int,
        name: str = "New Room",
        baseReconstruction: str = "dover_courtyard",
        authors: str = "N/A",
        created_date: str = "00/00/00",
        modified_date: str = "00/00/00",
        mesh_dict: dict[int, MeshInstance] = {},
        mesh_creation_count: int = 0,
        marker_dict: dict[int, MarkerInstance] = {},
        marker_creation_count: int = 0,
        annotation_dict: dict[int, AnnotationInstance] = {},
        annotation_count: int = 0,
        measurement_dict: dict[int, MeasurementInstance] = {},
        measurement_count: int = 0,
    ):
        self.room_id: int = room_id
        self.name: str = name
        # self.type: str = room_type,
        self.baseReconstruction: str = baseReconstruction
        self.authors:str = authors
        self.created_date:str = created_date
        self.modified_date:str = modified_date

        self.global_instance_count = 0

        self.mesh_instance_dict: dict[int, MeshInstance] = mesh_dict
        self.mesh_creation_count = mesh_creation_count
        self.markers_instance_dict: dict[int, MarkerInstance] = marker_dict
        self.marker_creation_count = marker_creation_count
        self.annotation_instance_dict: dict[int, AnnotationInstance] = annotation_dict
        self.annotation_creation_count = annotation_count
        self.measurement_instance_dict: dict[int, MeasurementInstance] = measurement_dict
        self.measurement_instance_count = measurement_count

        self.editing_users: dict[int, UserInstance] = {}
        self.pending_actions: list[any] = []

        self.deleted_meshes: list[int] = []
        self.deleted_users: list[int] = []
        self.deleted_markers: list[int] = []
        self.deleted_annotations: list[int] = []
        self.deleted_measurements: list[int] = []

        self.thread_lock = threading.Lock()

# ==================== Initialize ====================

    def _create_dates(self):
        datetime_string = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.created_date = datetime_string
        self.modified_date = datetime_string

    def _initialize_room(self):
        pass

# ==================== Sessioning and room instance updating ====================

    def add_pending_action(self, action: any):
        self.thread_lock.acquire()
        self.pending_actions.append(action)
        self.thread_lock.release()

    def post_update(self):
        if len(self.deleted_meshes) > 0:
            for del_id in self.deleted_meshes:
                print("#Deleting mesh: ", del_id)
                del self.mesh_instance_dict[del_id]
            self.deleted_meshes.clear()

        if len(self.deleted_users) > 0:
            for del_id in self.deleted_users:
                print("#Deleting Edit User: ", del_id)
                del self.editing_users[del_id]
            self.deleted_users.clear()
        
        if len(self.deleted_markers) > 0:
            for del_id in self.deleted_markers:
                print("#Deleting marker: ", del_id)
                del self.markers_instance_dict[del_id]
            self.deleted_markers.clear()
                   
        if len(self.deleted_annotations) > 0:
            for del_id in self.deleted_annotations:
                print("#Deleting annotation: ", del_id)
                del self.annotation_instance_dict[del_id]
            self.deleted_annotations.clear()

        if len(self.deleted_measurements) > 0:
            for del_id in self.deleted_measurements:
                print("#Deleting measurement: ", del_id)
                del self.measurement_instance_dict[del_id]
            self.deleted_measurements.clear()

    # Will process any pending actions. 
    # e.g. add measurement or annotation. delete measurement or markers. etc. etc.
    def process_pending_actions(self):
        # Invoke pending actions to modify room state.
        for action in self.pending_actions:
            action.invoke(self)
        self.pending_actions.clear()
        pass

# ==================== Users ====================

    def get_user_instances(self):
        return [user.to_dict() for user in self.editing_users.values()]
    
    def check_user_exists(self, user_id: int):
        return user_id in self.editing_users

    def add_editing_user(self, editing_user: UserInstance):
        self.editing_users[editing_user.id] = editing_user

    def remove_editing_user(self, editing_user: UserInstance):
        if editing_user.id in self.editing_users:
            del(self.editing_users[editing_user.id])

# ==================== Meshes ====================

    def get_mesh_instance_by_id(self, id: int):
        if id in self.mesh_instance_dict:
            return self.mesh_instance_dict[id]
        return None

    def get_room_objects(self):
        return [
            mesh.to_client_update_dict() for mesh in self.mesh_instance_dict.values()
        ]

    def get_dirty_mesh_instances(self):
        dirty_meshes = []
        for mesh in self.mesh_instance_dict.values():
            if mesh.is_dirty:
                mesh.is_dirty = False
                dirty_meshes.append(mesh)

        return [mesh.to_client_update_dict() for mesh in dirty_meshes]

# ==================== Markers ====================
    
    def get_dirty_marker_update(self):
        marker_states: list[dict] = []

        for marker in self.markers_instance_dict.values():
            if marker.is_dirty == False:
                marker_states.append(marker.to_dict())
        return marker_states
    
    def get_marker_states(self):
        marker_states: list[dict] = []
        for marker in self.markers_instance_dict.values():
            marker_states.append(marker.to_dict())
        return marker_states

# ==================== Annotations ====================

    def get_annotations_updates(self):
        annotations_to_send: list[dict] = []

        for annotation in self.annotation_instance_dict.values():
            annotations_to_send.append(annotation.to_dict())

        return annotations_to_send
    
    def get_dirty_annotations_updates(self):
        annotations_to_send: list[dict] = []

        for annotation in self.annotation_instance_dict.values():
            if annotation.is_dirty:
                annotation.is_dirty = False
                annotations_to_send.append(annotation.to_dict())

        return annotations_to_send

# ==================== Measurements ====================

    def get_measurement_updates(self):
        measurement_to_send: list[dict] = []

        for measurement in self.measurement_instance_dict.values():
            measurement_to_send.append(measurement.to_dict())

        return measurement_to_send

    def get_dirty_measurement_updates(self):
        measurement_to_send: list[dict] = []

        for measurement in self.measurement_instance_dict.values():
            if(measurement.is_dirty):
                measurement.is_dirty = False
                measurement_to_send.append(measurement.to_dict())

        return measurement_to_send
    
# ==================== Convertion and others ====================

    # Compiles all variables in this room instance into a key:value dictionary array
    def to_dict(self):
        mesh_list = [
            mesh_instance.to_dict() for mesh_instance in self.mesh_instance_dict.values()
        ]
        marker_list = [
            marker_instance.to_dict() for marker_instance in self.markers_instance_dict.values()
        ]
        annotation_list = [
            annotation_instance.to_dict() for annotation_instance in self.annotation_instance_dict.values()
        ]
        measurement_list = [
            measurement_list.to_dict() for measurement_list in self.measurement_instance_dict.values()
        ]
        return {
            "room_id": self.room_id,
            "name": self.name,
            # "type": self.type,
            "baseReconstruction": self.baseReconstruction,
            "authors": self.authors,
            "created_date": self.created_date,
            "modified_date": self.modified_date,
            "mesh_instances": mesh_list,
            "mesh_creation_count": self.mesh_creation_count,
            "marker_instances": marker_list,
            "marker_creation_count": self.marker_creation_count,
            "annotation_instances": annotation_list,
            "annotation_creation_count": self.annotation_creation_count,
            "measurement_instances": measurement_list,
            "measurement_instance_count": self.measurement_instance_count
        }

    @classmethod
    def load_from_dict(cls, dict_):
        instance = cls(
            dict_["room_id"],
            dict_["name"],
            # dict_["type"],
            dict_["baseReconstruction"],
            dict_["authors"],
            dict_["created_date"],
            dict_["modified_date"],
            {}, # dict_["mesh_instances"],
            dict_["mesh_creation_count"],
            {}, # dict_["marker_instances"],
            dict_["marker_creation_count"],
            {}, # dict_["annotation_instances"],
            dict_["annotation_creation_count"],
            {}, # dict_["measurement_instances"],
            dict_["measurement_instance_count"],
        )

        # get a list of meshes from instance
        mesh_list = [MeshInstance.from_dict(mesh) for mesh in dict_.get("mesh_instances", [])]
        # Set each key:value according to the mesh list order
        for mesh_instance in mesh_list:
            instance.mesh_instance_dict[mesh_instance.mesh_instance_id] = mesh_instance
        
        # do the same for markers and annotatons
        marker_list = [MarkerInstance.from_dict(marker) for marker in dict_.get("marker_instances", [])]
        for marker in marker_list:
            instance.markers_instance_dict[marker.marker_instance_id] = marker

        annotation_list = [AnnotationInstance.from_dict(annotation) for annotation in dict_.get("annotation_instances", [])]
        for annotation in annotation_list:
            instance.annotation_instance_dict[annotation.annotated_object_instance_id] = annotation

        # Populate the list of measurements in this room instance since it was populated in the above "instance = cls(...)" para.
        measurement_list = [MeasurementInstance.from_dict(measurement) for measurement in dict_.get("measurement_instances", [])]
        for measurement in measurement_list:
            instance.measurement_instance_dict[measurement.measurement_instance_id] = measurement
        
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
