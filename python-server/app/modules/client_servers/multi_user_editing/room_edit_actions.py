from .mesh_instance import MeshInstance
from ..marker import Marker, MarkerAction
from .room_instance import RoomInstance
from ..user import User

class GenericAction:
    def __init__(self, callback):
        self.callback = callback

    def invoke(self, room_instance):
        self.callback(room_instance)


class CreateMeshInstance:
    def __init__(self, dict_):
        self.mesh_instance = MeshInstance.create_new_instance_from_dict(dict_)

    def _add_mesh_instance_to_room(self, room_instance: RoomInstance):
        # Update related variables
        room_instance.mesh_creation_count += 1
        self.mesh_instance.is_dirty = True
        self.mesh_instance.instance_id = room_instance.mesh_creation_count

        # Add mesh instance to room
        room_instance.mesh_instance_dict[self.mesh_instance.instance_id] = self.mesh_instance
    def invoke(self, room_instance: RoomInstance):
        self._add_mesh_instance_to_room(room_instance)
        pass


class BatchUpdateMeshInstance:
    def __init__(self, model_states):
        self.model_states = model_states

    def invoke(self, room_instance: RoomInstance):
        for model_state in self.model_states:
            mesh_instance = room_instance.get_mesh_instance_by_id(
                model_state["instance_id"]
            )
            if mesh_instance == None:
                continue

            mesh_instance.parent_id = model_state["parent_id"]
            mesh_instance.position = model_state["position"]
            mesh_instance.rotation = model_state["rotation"]
            mesh_instance.scale = model_state["scale"]

            if model_state["mark_delete"]:
                mesh_instance.mark_delete = True
                room_instance.deleted_meshes.append(mesh_instance.instance_id)

            mesh_instance.is_dirty = True

class UpdateMarker:
    def __init__(self, marker_data: dict[str, any], action):
        self.marker_data = marker_data
        self.action = action

    def invoke(self, room_instance: RoomInstance):
        ref_marker: Marker | None

        match self.action:
            case MarkerAction.Update:
                if self.marker_data["id"] not in room_instance.markers:
                    return
                ref_marker = room_instance.markers[self.marker_data["id"]]
                ref_marker.update_from_json(self.marker_data)
            
            case MarkerAction.Create:
                ref_marker = Marker(self.marker_data["position"], self.marker_data["normal"], self.marker_data["type"], self.marker_data["visibility"])
                ref_marker.id = room_instance.marker_creation_count
                room_instance.marker_creation_count += 1

            case MarkerAction.Delete:
                if self.marker_data["id"] not in room_instance.markers:
                    return
                ref_marker = room_instance.markers[self.marker_data["id"]]
                ref_marker.update_from_json(self.marker_data)
                ref_marker.mark_delete = True
                room_instance.deleted_markers.append(ref_marker.id)
            case _:
                #Not Handled Marker Action
                print("Unhandled Marker Action->" + self.action)

        room_instance.markers[ref_marker.id] = ref_marker

class UpdateUserPosition:
    def __init__(self, editing_user: User, position: list[int], rotation: list[int]):
        self.editing_user = editing_user
        self.position = position
        self.rotation = rotation

    def invoke(self, room_instance: RoomInstance):
        self.editing_user.position = self.position
        self.editing_user.rotation = self.rotation

class DeleteEditingUser:
    def __init__(self, user_id: int):
        self.user_id = user_id

    def invoke(self, room_instance: RoomInstance):
        edit_user = room_instance.editing_users.get(self.user_id)

        if edit_user == None:
            print("# Invalid Action: Delete Editing User, User does not exist in this room instance.")
        
        print("Marking User as deleted: ", edit_user.id)
        edit_user.mark_delete = True
        room_instance.deleted_users.append(edit_user.id)
