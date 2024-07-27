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
from .multi_user_editing import room_edit_actions
from .multi_user_editing.room_instance import RoomInstance
from .multi_user_editing.mesh_instance import MeshInstance
from .multi_user_editing.room_file_manager import RoomFileManager
from .user import User
from enum import StrEnum

from app.modules.websocket_communications import WebsocketEnums, WebsocketHandler

from ..model_database.types import collections_dict, CollectionType
from ..model_database import document_utils

class RequestFailedReason(StrEnum):
    No_Failure = "Request was successful."
    Room_Id_Not_Found = "Provided Room Id does not exist!"
    User_Not_In_Room_ID = "Target User is not logged into provided room id"
    Websocket_UserID_Mismatch = "Websocket is not attached to received user_id"

class EditingServer:
    instance = None

    def __init__(self):
        self.tick_interval: float = 0.05  # Server update tick every 0.0166 seconds
        self.room_instances: dict[int, RoomInstance] = {} # Holds room_instances that represent 3D scene containing models and users.
        self.editing_users: dict[any, User] = {}  # Key value pairs of WebSocket <-> Users
        self.room_file_manager = RoomFileManager("rooms/")

        self.update_loop_thread = None
        self.is_running = False

        self.user_connection_count = 0

        EditingServer.instance = self

    @staticmethod
    async def _notify_new_reconstruction(capture_id):
        if EditingServer.instance == None:
            return
        server = EditingServer.instance
        send_data = {"new_id": capture_id}

        for room in server.room_instances.values():
            room.thread_lock.acquire()
            for editing_user in room.editing_users.values():
                await WebsocketHandler.send_json_to_socket(
                    editing_user.websocket,
                    WebsocketEnums.CodeToClient.New_Reconstruction,
                    send_data,
                )
            room.thread_lock.release()

    def get_connected_room_id(self, websocket):
        if websocket in self.editing_users:
            return self.editing_users[websocket].room_id
        return None

    def create_new_room(self, room_name, baseReconstructionID, authors):
        rand_id = random.randint(0, 1000)
        filter = {
            "room_id": rand_id
        }
        exists = document_utils.check_unique_filter(CollectionType.ROOMS, filter)
        while exists != -1:
            print("Creating Rand: ", rand_id)
            rand_id = random.randint(0, 1000)
            filter["room_id"] = rand_id
            exists = document_utils.check_unique_filter(CollectionType.ROOMS, filter)

        baseReconstructionDocument = MeshInstance((baseReconstructionID,"__LIVE_VERSION"), 1, -1, [0,0,0], [0,0,0], [1,1,1], False)
        baseReconstructionDict = {1: baseReconstructionDocument}
        
        newRoom: RoomInstance = RoomInstance(room_id=rand_id, name=room_name, description=baseReconstructionID, authors=authors, 
                                                mesh_instance_dict=baseReconstructionDict, mesh_creation_count=1,
                                                markers= {}, marker_creation_count=0)
        newRoom._create_dates()

        return newRoom

    def _threaded_update_loop(self):
        self.is_running = True
        while True:
            empty_rooms: list[int] = []
            for room in self.room_instances.values():
                room.thread_lock.acquire()
                room.process_pending_actions()

                update_data = {}
                update_data["room_id"] = room.room_id
                update_data["mesh_updates"] = room.get_dirty_mesh_instances()
                update_data["user_updates"] = room.get_user_instances()
                update_data["marker_updates"] = room.get_marker_update()

                # Send update_data to each websocket in the room
                for editing_user in room.editing_users.values():
                    asyncio.run(
                        WebsocketHandler.send_json_to_socket(
                            editing_user.websocket,
                            WebsocketEnums.CodeToClient.EditRoom_Update,
                            update_data,
                        )
                    )

                room.post_update()
                if len(room.editing_users) == 0:
                    print("Found Empty Room!")
                    empty_rooms.append(room.room_id)

                room.thread_lock.release()

            for room_id in empty_rooms:
                self.room_file_manager.save_to_mongodb(self.room_instances[room_id])
                del self.room_instances[room_id]

            time.sleep(self.tick_interval)

            if self.is_running == False:
                return

    def ws_join_room(self, websocket, jsonData: dict[str, any]):
        reply = {}
        room_id: int = jsonData["room_id"]
        print("joining room: " + str(room_id))

        # If room is not loaded, load room.
        target_room_instance = None
        if room_id not in self.room_instances:
            target_room_instance = self.room_file_manager.load_room_instance(room_id)
            self.room_instances[room_id] = target_room_instance
        else:
            target_room_instance = self.room_instances[room_id]

        # Assign websocket to room instance.
        editing_user = self.editing_users[websocket]
        editing_user.websocket = websocket

        # If websocket already has room assigned, disconnect from room.
        # Consider alternative method that returns error to client
        if editing_user.room_id != None:
            room: RoomInstance = self.room_instances[editing_user.room_id]
            room.remove_editing_user(editing_user)
            editing_user.room_id = None

        editing_user.room_id = target_room_instance.room_id
        target_room_instance.thread_lock.acquire()
        target_room_instance.add_editing_user(editing_user)
        target_room_instance.thread_lock.release()

        reply["success"] = "true"
        return reply

    def ws_exit_room(self, websocket, jsonData: dict[str, any]):
        reply = {}
        
        #If websocket not registered as editing user, return early.
        if websocket not in self.editing_users:
            reply["success"] = False
            return reply
        
        #Find editing user and remove from room
        edit_user: User = self.editing_users[websocket]

        if edit_user.room_id != None:
            room: RoomInstance = self.room_instances[edit_user.room_id]
            room.add_pending_action(room_edit_actions.DeleteEditingUser(edit_user.id))
            edit_user.room_id = None

        reply["success"] = True
        return reply

    def ws_start_room(self, jsonData: dict[str, any]):
        reply = {}
        reply["success"] = "true"
        return reply

    async def ws_create_empty_room(self, websocket, jsonData: dict[str, any]):
        room_name = jsonData["roomName"]
        baseReconstructionID = jsonData["baseReconstructionID"]
        authors = jsonData["authors"]
        room = self.create_new_room(room_name, baseReconstructionID, authors)
        self.room_file_manager.save_to_mongodb(room)

        for editing_user in self.editing_users.values():
            await WebsocketHandler.send_json_to_socket(editing_user.websocket, WebsocketHandler.CodeToClient.Room_Previews_Update, {})

        reply = {}
        reply["success"] = "true"
        return reply

    def ws_register_editing_user(self, websocket, jsonData: dict[str, any]):
        reply = {}

        # If websocket exists, abort operation and reply fail editing client
        if websocket in self.editing_users:
            # failed
            reply["success"] = "false"
            return reply

        # If websocket does not exist in dictionary, create editing user and add to dictionary.
        jsonData = jsonData | {"user_id": self.user_connection_count}
        reply = reply | {"user_id": self.user_connection_count}
        self.editing_users[websocket] = User(websocket, jsonData)
        self.user_connection_count += 1

        reply["success"] = "true"
        return reply

    def ws_fetch_room_objects(self, websocket, jsonData: dict[str, any]):
        result = {}

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        
        if room == None:
            result["success"] = "false"
            return result

        # Build dictionary obj containing meshes in room
        result["user_instances"] = room.get_user_instances()
        result["mesh_instances"] = room.get_room_objects()
        result["marker_instances"] = room.get_marker_states()

        return result

    def ws_server_request_load_mesh(self, websocket, jsonData: dict[str, any]):
        result = {}

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        if room == None:
            result["success"] = "false"
            return result
        # Check for any reason to not allow creation of mesh

        # Create action and add to pending room.
        action = room_edit_actions.CreateMeshInstance(jsonData)
        room.add_pending_action(action)

        result["success"] = "true"
        return result

    def ws_server_batch_update(self, websocket, jsonData: dict[str, any]):
        reply = {}
        reply["success"] = "true"

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        if room == None:
            reply["success"] = "false"
            return reply

        # Create pending_action for array of states to be updated.
        if len(jsonData["model_states"]) > 0:
            room.add_pending_action(room_edit_actions.BatchUpdateMeshInstance(jsonData["model_states"]))

        # Create pending action for each marker
        if len(jsonData["marker_states"]) > 0:
            marker_states = jsonData["marker_states"]
            for marker_state in marker_states:
                marker_info = marker_state["marker_info"]
                action = marker_state["action"]
                room.add_pending_action(room_edit_actions.UpdateMarker(marker_info, action))

        # Create pending_action for user position.
        room.add_pending_action(room_edit_actions.UpdateUserPosition(
                self.editing_users[websocket],
                jsonData["user_position"],
                jsonData["user_rotation"],
            ))
        
        return reply

    def ws_server_update_marker(self, websocket, jsonData: dict[str:any]):
        reply = {}

        room_id = jsonData["room_id"]
        if room_id not in self.room_instances:
            return{
                "success": "false",
                "reason": RequestFailedReason.Room_Id_Not_Found
            }
        
        edit_user = self.editing_users[websocket]

        room_instance = self.room_instances[room_id]
        if room_instance.check_user_exists(edit_user.id) == False:
            return {
                "success": "false",
                "reason": RequestFailedReason.User_Not_In_Room_ID
            }


        room_instance.add_pending_action(room_edit_actions.UpdateMarker(jsonData["marker_info"], jsonData["action"]))
        
        return {
            "success": "true",
            "reason": RequestFailedReason.No_Failure
        }

    def initialize(self):
        WebsocketHandler.on_websocket_disconnect_callbacks.append(
            self.check_disconnected_websocket
        )

        # Start update loop
        self.update_loop_thread = threading.Thread(target=self._threaded_update_loop)
        self.update_loop_thread.start()

    def shutdown(self):
        self.is_running = False
        pass

    def check_disconnected_websocket(self, websocket):
        # Check if websocket is registered as editing user.
        # If editing user, remove from room if any, then remove from editing_users dictionary.
        edit_user: User = self.editing_users.get(websocket)
        if edit_user == None:
            return

        # Remove from dictionary by key.
        self.editing_users.pop(websocket)

        if edit_user.room_id == None:
            return
        room: RoomInstance = self.room_instances[edit_user.room_id]
        room.add_pending_action(room_edit_actions.DeleteEditingUser(edit_user.id))

def create_instance() -> EditingServer:
    return EditingServer()

def shutdown_instance():
    if EditingServer.instance != None:
        EditingServer.instance.shutdown()