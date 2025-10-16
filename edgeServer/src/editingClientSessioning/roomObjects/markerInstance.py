from enum import IntEnum

INVALID_ID_NUM = -1

class MarkerInstance:
    def __init__(self, 
                 position: list[float], 
                 normal: list[float], 
                 type: int, 
                 visibility: bool):
        
        self.global_instance_id = INVALID_ID_NUM

        self.marker_instance_id = -1
        self.position = position
        self.normal = normal
        self.type = type
        self.visibility = visibility

        self.is_dirty = False
        self.mark_delete = False

    def to_dict(self):
        return{
            "marker_instance_id": self.marker_instance_id,
            "position": self.position,
            "normal": self.normal,
            "type": self.type,
            "visibility": self.visibility,
            "mark_delete": self.mark_delete
        }
    
    def update_from_json(self, jsonData: dict[str, any]):
        self.position = jsonData["position"]
        self.normal = jsonData["normal"]
        self.type = jsonData["type"]
        self.visibility = jsonData["visibility"]

    
    @classmethod
    def from_dict(cls, dict):
        newMarker = cls(dict["position"], dict["normal"], dict["type"], dict["visibility"])
        newMarker.marker_instance_id = dict["marker_instance_id"]
        return newMarker
    
class MarkerAction(IntEnum):
    Update = 0
    Create = 1
    Delete = 2