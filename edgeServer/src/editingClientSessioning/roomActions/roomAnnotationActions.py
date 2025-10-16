# from roomObjects.markerInstance import MarkerInstance
# from roomObjects.meshInstance import MeshInstance
from editingClientSessioning.roomObjects.annotationInstance import AnnotationInstance
from editingClientSessioning.roomManagement.roomInstance import RoomInstance

class CreateAnnotationInstance:
    '''
    Creates annotation object and adds it to a `RoomInstance` object
    '''
    def __init__(self, dict_):
        self.annotation_instance = AnnotationInstance.create_new_instance_from_dict(dict_)

    def invoke(self, room_instance: RoomInstance):
        self._add_annotation_instance_to_room(room_instance)
        pass

    def _add_annotation_instance_to_room(self, room_instance: RoomInstance):
        # Update related variables
        room_instance.annotation_creation_count += 1
        room_instance.global_instance_count += 1

        self.annotation_instance.is_dirty = True
        self.annotation_instance.annotation_instance_id = room_instance.annotation_creation_count

        # Add annotation to room
        room_instance.annotation_instance_dict[self.annotation_instance.annotation_instance_id] = self.annotation_instance

class UpdateAnnotation:
    def __init__(self, annotation_data: dict[str, any]):
        self.annotation_data = annotation_data

    def invoke(self, room_instance: RoomInstance):
        ref_anno: AnnotationInstance | None

        if self.annotation_data["annotation_instance_id"] not in room_instance.annotation_instance_dict:
            return
        ref_anno = room_instance.annotation_instance_dict[self.annotation_data["annotation_instance_id"]]
        ref_anno.update_from_json(self.annotation_data)
        # set diry, marking for updates
        ref_anno.is_dirty = True

        room_instance.annotation_instance_dict[ref_anno.annotation_instance_id] = ref_anno

class DeleteAnnotation:
    def __init__(self, annotation_data: dict[str, any]):
        self.annotation_data = annotation_data

    def invoke(self, room_instance: RoomInstance):
        ref_anno: AnnotationInstance | None

        if self.annotation_data["annotation_instance_id"] not in room_instance.annotation_instance_dict:
            return
        
        ref_anno = room_instance.annotation_instance_dict[self.annotation_data["annotation_instance_id"]]
        ref_anno.update_from_json(self.annotation_data)
        # set dirty marking for deletion
        ref_anno.is_dirty = True
        ref_anno.mark_delete = True        
        room_instance.deleted_annotations.append(ref_anno.annotation_instance_id)

        # force update annotation
        room_instance.annotation_instance_dict[ref_anno.annotation_instance_id] = ref_anno 