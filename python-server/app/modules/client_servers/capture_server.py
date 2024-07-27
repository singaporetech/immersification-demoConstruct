"""
author: Ambrose Wee
Script: Editing_Server.py

This script defines a the editing server class that acts as the main logic class that handles
multi-user editing of scene.
"""
import asyncio
import time
import threading
import random
from .user import User
from enum import StrEnum

from app.modules.websocket_communications import WebsocketEnums, WebsocketHandler

from ..model_database.types import collections_dict, CollectionType
from ..model_database import document_utils
from .collaborative_reconstruction.capture_session import CaptureSession
from .collaborative_reconstruction.notification_enum import NotificationCode
from .marker import Marker
from .collaborative_reconstruction import session_actions

class RequestFailedReason(StrEnum):
    No_Failure = "Request was successful."
    Room_Id_Not_Found = "Provided Room Id does not exist!"
    User_Not_In_Room_ID = "Target User is not logged into provided room id"


class CaptureServer:
    instance = None

    def __init__(self):
        self.tick_interval: float = 0.05  # Server update tick every 0.0166 seconds
        self.session_instances: dict[int, CaptureSession] = {} # Holds room_instances that represent 3D scene containing models and users.
        
        self.hosts: dict[any, User] = {}  # Key value pairs of Websocket <-> Users
        self.viewers: dict[any, User] = {}  # Key value pairs of WebSocket <-> Users

        self.userConnectionCount = 0

        self.update_loop_thread = None
        self.is_running = False
        CaptureServer.instance = self

    def _threaded_update_loop(self):
        self.is_running = True
        while True:
            for session in self.session_instances.values():
                session.thread_lock.acquire()

                session.process_pending_actions()

                host_msg = session.get_host_update()
                asyncio.run(
                    WebsocketHandler.send_json_to_socket(
                        session.host.websocket,
                        WebsocketEnums.CodeToClient.CaptureSession_Update,
                        host_msg
                    )
                )

                viewer_msg = session.get_viewer_update()
                for viewer in session.viewers.values():
                    asyncio.run(
                        WebsocketHandler.send_json_to_socket(
                            viewer.websocket,
                            WebsocketEnums.CodeToClient.CaptureSession_Update,
                            viewer_msg
                        )
                    )

                session.clear_dirty()
                session.clean_notifications()
                session.thread_lock.release()
            time.sleep(self.tick_interval)

            if self.is_running == False:
                return

    def initialize(self):

        WebsocketHandler.on_websocket_disconnect_callbacks.append(
            self._check_disconnected_host
        )
        WebsocketHandler.on_websocket_disconnect_callbacks.append(
            self._check_disconnected_viewer
        )

        # Start update loop
        self.update_loop_thread = threading.Thread(target=self._threaded_update_loop)
        self.update_loop_thread.start()

    def shutdown(self):
        self.is_running = False

    def _check_disconnected_host(self, websocket):
        host = self.hosts.get(websocket)
        if host == None:
            return
        if host.room_id == None:
            return
        if host.room_id not in self.session_instances.keys():
            return
        
        jsonData = {
            "room_id": host.room_id
        }

        self.ws_close_session(websocket, jsonData)
        
    def _check_disconnected_viewer(self, websocket):
        viewer = self.viewers.get(websocket)
        if viewer == None:
            print("# Check Disconnected Viewer->No Such User")
            return
        if viewer.room_id == None:
            print("# Check Disconnected Viewer->User not in room")
            return
        if viewer.room_id not in self.session_instances.keys():
            print("# Check Disconnected Viewer->User not in existing room")
            return
        
        jsonData={
            "session_id": viewer.room_id,
        }

        self.ws_leave_session(websocket, jsonData)
        

    def ws_host_session(self, websocket, jsonData):
        print("Host Session Requested")

        def rand_session_id() -> int:
            result = random.randint(1, 999)
            while result in self.session_instances.keys():
                result = random.randint(1, 999)
            return result

        #session_id = rand_session_id()
        session_id = 100
        self.userConnectionCount += 1

        user = User(websocket, jsonData)
        user.room_id = session_id
        self.hosts[websocket] = user
        user.id = self.userConnectionCount

        self.session_instances[session_id] = CaptureSession(session_id, user, jsonData["model_id"], jsonData["version"])
        result = {
            "success": "true",
            "user_id": self.userConnectionCount,
            "room_id": session_id
        }
        return result

    def ws_close_session(self, websocket, jsonData):
        result = {}

        host = self.hosts[websocket]        
        room_id = jsonData["room_id"]
        room = self.session_instances.get(room_id)

        if room == None:
            return{
                "success": "false",
                "reason": RequestFailedReason.Room_Id_Not_Found
            }
        if host.room_id != room_id:
            return{
                "success": "false",
                "reason": RequestFailedReason.User_Not_In_Room_ID
            }

        self.hosts.pop(websocket)

        room.thread_lock.acquire()
        room.pending_actions.append(session_actions.CloseSession())
        room.thread_lock.release()

        return result

    def ws_join_session(self, websocket, jsonData):
        session_id = jsonData["session_id"]

        if session_id not in self.session_instances.keys():
            return {
                "success": "false",
                "reason": RequestFailedReason.Room_Id_Not_Found
            }
        
        self.userConnectionCount += 1
        viewer = User(websocket, jsonData)
        viewer.id = self.userConnectionCount
        viewer.room_id = session_id
        self.viewers[websocket] = viewer

        session = self.session_instances[session_id]
        session.thread_lock.acquire()
        session.viewers[viewer.id] = viewer
        session.thread_lock.release()

        return {            
            "success": "true",
            "reason": RequestFailedReason.No_Failure,
            "model_id": session.model_id,
            "version": session.version,
            "user_id": self.userConnectionCount,
            "host_info": session.host.to_dict(),
            "marker_info": session.get_marker_states()
        }
    
    def ws_leave_session(self, websocket, jsonData):
        session_id = jsonData["session_id"]
        viewer = self.viewers[websocket]
        result = {}

        if session_id not in self.session_instances.keys():
            result["success"] = "false"
            result["reason"] = RequestFailedReason.Room_Id_Not_Found
            return result
        if viewer.id not in self.session_instances[session_id].viewers:
            result["success"] = "false"
            result["reason"] = RequestFailedReason.User_Not_In_Room_ID
            return result

        session = self.session_instances[session_id]

        session.add_pending_action(session_actions.UserLogout(viewer.id))

        result["success"] = "true"
        result["reason"] = RequestFailedReason.No_Failure
        return result

    def ws_update_model_version(self, websocket, jsonData):
        print("Received Model Update Version!", jsonData["model_id"], " ", jsonData["version"])
        reply = {
            "success": "false",
            "reason": "Not Processed"
        }
        
        if websocket not in self.hosts.keys():
            reply["success"] = "false"
            reply["reason"] = "Websocket is not registered as a host."
            pass
        host = self.hosts[websocket]
        
        if host.room_id not in self.session_instances.keys():
            reply["success"] = "false"
            reply["reason"] = "Websocket host does not have a valid room. Room Id and dict key mismatch"

        session = self.session_instances[host.room_id]

        session.thread_lock.acquire()
        session.pending_actions.append(session_actions.UpdateModelVersion(jsonData["model_id"], jsonData["version"]))
        session.thread_lock.release()

        reply["success"] = "true"
        reply["reason"] = RequestFailedReason.No_Failure

        return reply

    def ws_user_update(self, websocket, jsonData):

        room_id = jsonData["room_id"]
        if room_id not in self.session_instances.keys():
            return {
                "success": "false",
                "reason": RequestFailedReason.Room_Id_Not_Found
            }

        session: CaptureSession = self.session_instances[room_id]

        session.thread_lock.acquire()
        session.pending_actions.append(session_actions.UserUpdate(
            jsonData["user_id"],
            jsonData["user_type"],
            jsonData["user_position"],
            jsonData["user_rotation"]
        ))
        session.thread_lock.release()

        return {
            "success": "true",
            "reason": RequestFailedReason.No_Failure
        }

    def ws_marker_update(self, websocket, jsonData):
        #Get Referenced session
        sessionId = jsonData["session_id"]
        if sessionId not in self.session_instances.keys():
            return{
                "success": "false",
                "reason": RequestFailedReason.Room_Id_Not_Found
            }
        session = self.session_instances[sessionId]
        session.add_pending_action(session_actions.UpdateMarker(jsonData["marker_info"], jsonData["action"]))

        return {
            "success": "false",
            "reason": RequestFailedReason.No_Failure
        }

def create_instance() -> CaptureServer:
    return CaptureServer()

def shutdown_instance():
    if CaptureServer.instance != None:
        CaptureServer.instance.shutdown()