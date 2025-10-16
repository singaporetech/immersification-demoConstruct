import random

INVALID_ID_NUM = -1

class MeshInstance:
    model_database = None
    LIVE_VERSION = "__LIVE_VERSION"

    @staticmethod
    def set_model_database_reference(database):
        MeshInstance.model_database = database

    def __init__(self,
                asset_id,
                mesh_instance_id=INVALID_ID_NUM,
                gs_instance_id=INVALID_ID_NUM,
                parent_id=INVALID_ID_NUM,
                position=[0.0, 0.0, 0.0],
                rotation=[0.0, 0.0, 0.0],
                scale=[0.0, 0.0, 0.0],
                editable = True):

        self.global_instance_id = INVALID_ID_NUM
        
        self.asset_id = (asset_id)

        # the mesh instance id in the room
        self.mesh_instance_id = mesh_instance_id
        # the gs instance id in the room //should match the mesh_instance_id
        self.gs_instance_id = gs_instance_id
        self.parent_id = parent_id

        self.position = position
        self.rotation = rotation
        self.scale = scale

        self.editable = editable

        self.is_dirty = False
        self.mark_delete = False


    def to_dict(self):
        dict_ = {
            "asset_id": self.asset_id,
            "mesh_instance_id": self.mesh_instance_id,
            "gs_instance_id": self.gs_instance_id,
            "parent_id": self.parent_id,
            "position": self.position,
            "rotation": self.rotation,
            "scale": self.scale,
            "editable": self.editable,
        }
        return dict_

    def to_client_update_dict(self):
        dict_ = {
            "asset_id": self.asset_id,
            "mesh_instance_id": self.mesh_instance_id,
            "gs_instance_id": self.gs_instance_id,
            "parent_id": self.parent_id,
            "position": self.position,
            "rotation": self.rotation,
            "scale": self.scale,
            "editable": self.editable,
            "mark_delete": self.mark_delete,
        }
        return dict_

    # Deserialization from json file.
    @classmethod
    def from_dict(cls, dict_):
        return cls(
            dict_["asset_id"],
            dict_["mesh_instance_id"],
            dict_["gs_instance_id"],
            dict_["parent_id"],
            dict_["position"],
            dict_["rotation"],
            dict_["scale"],
            dict_["editable"]
        )

    # Create from dictionary object containing model id, and transform.
    # Difers from from_dict in that this creates a new instance without instance or parent ids.
    @classmethod
    def create_new_instance_from_dict(cls, dict_):
        return cls(
            dict_["asset_id"],
            INVALID_ID_NUM,
            INVALID_ID_NUM,
            INVALID_ID_NUM,
            dict_["position"],
            dict_["rotation"],
            dict_["scale"],
            True
        )

    @staticmethod
    def _RandTransform(
        instance, posRange=(-2.5, 2.5), rotRange=(-60, 60), scaleRange=(0.5, 1.25)
    ):
        instance.position = [
            random.uniform(posRange[0], posRange[1]),
            random.uniform(posRange[0], posRange[1]),
            random.uniform(posRange[0], posRange[1]),
        ]
        instance.rotation = [
            random.uniform(rotRange[0], rotRange[1]),
            random.uniform(rotRange[0], rotRange[1]),
            random.uniform(rotRange[0], rotRange[1]),
        ]
        instance.scale = [
            random.uniform(scaleRange[0], scaleRange[1]),
            random.uniform(scaleRange[0], scaleRange[1]),
            random.uniform(scaleRange[0], scaleRange[1]),
        ]
