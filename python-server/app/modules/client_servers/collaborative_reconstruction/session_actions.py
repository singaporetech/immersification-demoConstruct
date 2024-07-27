from .capture_session import CaptureSession
from .notification_enum import NotificationCode
from ..user import User
from ..marker import Marker, MarkerAction

class GenericAction:
    def __init__(self, callback):
        self.callback = callback
    
    def invoke(self, sesson_instance):
        self.callback(sesson_instance)

class UpdateModelVersion:
    def __init__(self, model_id:str, version:str):
        self.model_id = model_id
        self.version = version

    def invoke(self, session_instance: CaptureSession):
        session_instance.model_id = self.model_id
        session_instance.version = self.version
        session_instance.notifications[NotificationCode.UpdatedModelVersion] = True

class UserUpdate:
    def __init__(self, user_id: int, user_type: int, position: list[float], rotation: list[float]):
        self.user_id = user_id
        self.user_type = user_type
        self.postion = position
        self.rotation = rotation

    def invoke(self, session: CaptureSession):
        viewer: User = None
        if(self.user_type == 1): #Host user
            if session.host.id != self.user_id:
                print(f"Mismatched User Type! Expected: ${session.host.id}, Received: ${self.user_id}. Aborting")
                return
            viewer = session.host
        else:   #Editing Client User
            if self.user_id not in session.viewers.keys():
                print(f"User Id not found in viewers dict. Input ID: ${self.user_id}")
                return
            viewer = session.viewers[self.user_id]

        viewer.position = self.postion
        viewer.rotation = self.rotation\
        
class UserLogout:
    def __init__(self, user_id: int):
        self.user_id = user_id

    def invoke(self, session: CaptureSession):
        viewer: User = session.viewers.get(self.user_id)
        if viewer == None:
            return
        viewer.mark_delete = True
        session.notifications[NotificationCode.DeletedUser] = True

class CloseSession:
    def __init__(self):
        #Nothing to store
        pass

    def invoke(self, session: CaptureSession):
        session.notifications[NotificationCode.ClosedRoom] = True

class UpdateMarker:
    def __init__(self, markerData: dict[str, any], action: int):
        self.markerData = markerData
        self.action = action
        pass

    def invoke(self, session: CaptureSession):
        ref_marker: Marker | None

        match self.action:
            case MarkerAction.Update:
                if self.markerData["id"] not in session.markers:
                    return
                ref_marker = session.markers[self.markerData["id"]]
                ref_marker.update_from_json(self.markerData)
            
            case MarkerAction.Create:
                ref_marker = Marker(self.markerData["position"], self.markerData["normal"], self.markerData["type"], self.markerData["visibility"])
                ref_marker.id = session.marker_creation_count
                session.marker_creation_count += 1

            case MarkerAction.Delete:
                if self.markerData["id"] not in session.markers:
                    return
                ref_marker = session.markers[self.markerData["id"]]
                ref_marker.update_from_json(self.markerData)
                ref_marker.mark_delete = True
            case _:
                #Not Handled Marker Action
                print("Unhandled Marker Action->" + self.action)

        ref_marker.is_dirty = True
        session.markers[ref_marker.id] = ref_marker