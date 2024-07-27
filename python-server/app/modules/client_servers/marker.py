from enum import IntEnum

class Marker:
    def __init__(self, position: list[float], normal: list[float], type: int, visibility: bool):
        self.id = -1
        self.position = position
        self.normal = normal
        self.type = type
        self.visibility = visibility
        self.is_dirty = False
        self.mark_delete = False

    def update_from_json(self, jsonData: dict[str, any]):
        self.position = jsonData["position"]
        self.normal = jsonData["normal"]
        self.type = jsonData["type"]
        self.visibility = jsonData["visibility"]

    def to_dict(self):
        return{
            "id": self.id,
            "position": self.position,
            "normal": self.normal,
            "type": self.type,
            "visibility": self.visibility,
            "mark_delete": self.mark_delete
        }
    
    @classmethod
    def from_dict(cls, dict):
        newMarker = cls(dict["position"], dict["normal"], dict["type"], dict["visibility"])
        newMarker.id = dict["id"]
        return newMarker
    
class MarkerAction(IntEnum):
    Update = 0
    Create = 1
    Delete = 2