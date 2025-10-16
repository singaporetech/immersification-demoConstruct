INVALID_ID_NUM = -1

class AnnotationInstance:

    def __init__(self,
                annotation_instance_id,
                annotated_object_type,
                annotated_object_instance_id,
                title,
                description,
                auditor,
                safetyCheckStatus,
                global_instance_id
                ):
        
        # self.global_instance_id = global_instance_id
        self.global_instance_id = INVALID_ID_NUM        
        self.annotation_instance_id = annotation_instance_id      

        self.annotated_object_type = annotated_object_type
        self.annotated_object_instance_id = annotated_object_instance_id

        self.title = title
        self.description = description
        self.auditor = auditor
        self.safetyCheckStatus = safetyCheckStatus

        self.is_dirty = False

        self.mark_delete = False

    def to_dict(self):
        dict_ = {
            "annotation_instance_id": self.annotation_instance_id,
            "annotated_objectState_type": self.annotated_object_type,
            "annotated_objectState_id": self.annotated_object_instance_id,

            "title": self.title,
            "description": self.description,
            "auditor": self.auditor,
            "safetyCheckStatus": self.safetyCheckStatus,

            "global_instance_id": self.global_instance_id,

            # "is_dirty": self.is_dirty,

            "mark_delete": self.mark_delete,
        }
        return dict_

    def to_client_update_dict(self):
        dict_ = {
            "annotation_instance_id": self.annotation_instance_id,
            "annotated_objectState_type": self.annotated_object_type,
            "annotated_objectState_id": self.annotated_object_instance_id,

            "title": self.title,
            "description": self.description,
            "auditor": self.auditor,
            "safetyCheckStatus": self.safetyCheckStatus,

            "global_instance_id": self.global_instance_id,
            
            # "is_dirty": self.is_dirty,

            "mark_delete": self.mark_delete,
        }
        return dict_
    
    # Deserialization from json file.
    @classmethod
    def from_dict(cls, dict_):
        return cls(
            dict_["annotation_instance_id"],
            dict_["annotated_objectState_type"],
            dict_["annotated_objectState_id"],

            dict_["title"],
            dict_["description"],
            dict_["auditor"],
            dict_["safetyCheckStatus"],

            dict_["global_instance_id"],
        )
    
    @classmethod
    def create_new_instance_from_dict(cls, dict_):
        return cls(
            dict_["annotation_instance_id"],
            dict_["annotated_objectState_type"],
            dict_["annotated_objectState_id"],

            dict_["title"],
            dict_["description"],
            dict_["auditor"],
            dict_["safetyCheckStatus"],

            dict_["global_instance_id"],
        )

    def update_from_json(self, jsonData: dict[str, any]):
        self.annotation_instance_id = jsonData["annotation_instance_id"]
        self.annotated_object_instance_id = jsonData["annotated_objectState_type"]
        self.annotated_object_type = jsonData["annotated_objectState_id"]

        self.title = jsonData["title"]
        self.description = jsonData["description"]
        self.safetyCheckStatus = jsonData["safetyCheckStatus"]
        self.auditor = jsonData["auditor"]

        self.global_instance_id = jsonData["global_instance_id"]

        # self.is_dirty = jsonData["is_dirty"]

        # self.mark_delete = jsonData["mark_delete"]
