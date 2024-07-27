from threading import Lock as ThreadLock
from ..user import User
from .notification_enum import NotificationCode
from ..marker import Marker

class CaptureSession:
    def __init__(
        self,
        session_code: int,
        host: User,
        model_id: str,
        version: str
    ):
        self.session_code = session_code
        self.host = host
        self.model_id = model_id
        self.version = version
        self.viewers: dict[int, User] = {}
        self.markers: dict[int, Marker] = {}
        self.marker_creation_count: int = 0
        
        self.pending_actions: list[any] = []
        self.notifications: dict[NotificationCode, bool] = {}
        
        self.thread_lock = ThreadLock()
        pass

    def add_pending_action(self, pending_action: any):
        self.thread_lock.acquire()
        self.pending_actions.append(pending_action)
        self.thread_lock.release()
    
    def process_pending_actions(self):
        for pending_action in self.pending_actions:
            pending_action.invoke(self)
        self.pending_actions.clear()

    def clear_dirty(self):
        to_delete = []
        for marker in self.markers.values():
            marker.is_dirty = False
            if marker.mark_delete:
                to_delete.append(marker.id)
        for del_id in to_delete:
            del self.markers[del_id]

    def clean_notifications(self):
        if self.notifications.get(NotificationCode.DeletedUser):
            for viewer in self.viewers.values():
                if viewer.mark_delete and not viewer.deleted:
                    viewer.deleted = True

        isClosedRoom = self.notifications.get(NotificationCode.ClosedRoom)
        isClosedRoom = isClosedRoom if isClosedRoom != None else False

        for key in self.notifications.keys():
            self.notifications[key] = False

        self.notifications[NotificationCode.ClosedRoom] = isClosedRoom

    def _get_viewer_positions(self):
        return {
            "host_info": self.host.to_dict(),
            "viewer_infos": [viewer.to_dict() for viewer in self.viewers.values() if viewer.deleted == False]
        }

    def _get_host_notifications(self):
        result = {}
        events_list = []

        for notification_code in self.notifications:
            if self.notifications[notification_code] == False:
                continue
            
            events_list.append(notification_code)
            match(notification_code):
                case NotificationCode.CreatedMarker:
                    pass
                case default:
                    pass

        result["events"] = events_list
        return result

    def _get_viewer_notifications(self):
        result = {}
        events_list = []

        for notification_code in self.notifications:
            if self.notifications[notification_code] == False:
                continue
            
            events_list.append(notification_code)

            match(notification_code):
                case NotificationCode.UpdatedModelVersion:
                    result["model_id"] = self.model_id
                    result["version"] = self.version
                case NotificationCode.ClosedRoom:
                    #No extra data to handle closing of session
                    pass

        result["events"] = events_list
        return result

    def _get_marker_updates(self):
        marker_states: list[dict] = []

        for marker in self.markers.values():
            if marker.is_dirty == False: 
                continue
            marker_states.append(marker.to_dict())
        return {
            "marker_infos": marker_states
        }
    
    def get_marker_states(self):
        marker_states: list[dict] = []

        for marker in self.markers.values():
            marker_states.append(marker.to_dict())
        
        return marker_states

    def get_viewer_update(self):
        viewer_update = {}

        viewer_update = viewer_update | self._get_viewer_notifications()
        viewer_update = viewer_update | self._get_viewer_positions()
        viewer_update = viewer_update | self._get_marker_updates()

        return viewer_update
    
    def get_host_update(self):
        host_update = {}

        host_update = host_update | self._get_host_notifications()
        host_update = host_update | self._get_viewer_positions()
        host_update = host_update | self._get_marker_updates()

        return host_update