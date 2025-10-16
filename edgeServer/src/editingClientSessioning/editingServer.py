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

from database.mongoDB import documentUtilities
from database.mongoDB.types import CollectionType

from editingClientSessioning.roomActions import roomAnnotationActions, roomMeasurementActions
from editingClientSessioning.roomManagement.roomInstanceManager import RoomInstanceManager
from editingClientSessioning.roomObjects.meshInstance import MeshInstance
from editingClientSessioning.roomObjects.userInstance import UserInstance
from editingClientSessioning.roomActions import roomActions
from editingClientSessioning.roomManagement.roomInstance import RoomInstance

from websocketCommunications import websocketEnums, websocketHandler

from enum import StrEnum

class RequestFailedReason(StrEnum):
    No_Failure = "Request was successful."
    Room_Id_Not_Found = "Provided Room Id does not exist!"
    User_Not_In_Room_ID = "Target User is not logged into provided room id"
    Websocket_UserID_Mismatch = "Websocket is not attached to received user_id"

class EditingServer:
    instance = None

    loop = None

    def __init__(self):
        self.tick_interval: float = 0.05  # Server update tick every 0.0166 seconds
        self.room_instances: dict[int, RoomInstance] = {} # Holds room_instances that represent 3D scene containing models and users.
        self.editing_users: dict[any, UserInstance] = {}  # Key value pairs of WebSocket <-> Users
        self.room_file_manager = RoomInstanceManager("rooms/")

        self.update_loop_thread = None
        
        self.is_running = False

        self.user_connection_count = 0

        EditingServer.loop = asyncio.get_event_loop()
        EditingServer.instance = self

# ==================== initialize and shutdown ====================

    def initialize(self):
        websocketHandler.on_websocket_disconnect_callbacks.append(
            self.check_disconnected_websocket
        )

        # Start update loop
        self.update_loop_thread = threading.Thread(target=self._threaded_broadcast_room_update_to_clients_loop)
        self.update_loop_thread.start()

    def shutdown(self):
        self.is_running = False
        pass

    def create_RoomInstance_data(self, room_name, baseReconstruction, authors):
        """
        Creates a new `RoomInstance` class data.
        """
        rand_id = random.randint(0, 1000)
        filter = {
            "room_id": rand_id
        }
        exists = documentUtilities.check_unique_filter(CollectionType.ROOMS, filter)
        while exists != -1:
            rand_id = random.randint(0, 1000)
            filter["room_id"] = rand_id
            exists = documentUtilities.check_unique_filter(CollectionType.ROOMS, filter)

        baseReconstructionRef = MeshInstance((baseReconstruction,"__LIVE_VERSION"), 
                                             1,
                                             1,
                                             -1, 
                                             [0,0,0], [0,0,0], [1,1,1], False)
        baseReconstructionDict = {1: baseReconstructionRef}
        
        newRoom: RoomInstance = RoomInstance(room_id=rand_id, name=room_name, baseReconstruction=baseReconstruction, authors=authors, 
                                                mesh_dict=baseReconstructionDict, mesh_creation_count=1,
                                                marker_dict= {}, marker_creation_count=0,
                                                annotation_dict= {}, annotation_count=0)#, type=room_type)
        newRoom._create_dates()

        return newRoom

    async def ws_create_empty_room(self, websocket, jsonData: dict[str, any]):
        """
        Called from a websocket. 
        Uses `create_RoomInstance_data` to create and register a new `RoomInstance` to mongoDB.
        """
        room_name = jsonData["roomName"]
        # room_type = jsonData["roomName"] #jsonData["roomName"] #TODO: edit editing and capture client to do this?
        baseReconstruction = jsonData["baseReconstruction"]
        authors = jsonData["authors"]

        collect_type = CollectionType.RECONSTRUCTIONS
        collectCheck = documentUtilities.check_unique_filter(
            collect_type,
            {'data_ref_id': baseReconstruction,
             'version': "1",
             "filetype": ".glb" }
            )
        # exist, dont care if its unique or not.
        if collectCheck >= 1 : 
            room = self.create_RoomInstance_data(room_name, baseReconstruction, authors)
            self.room_file_manager.save_to_mongodb(room)

            for editing_user in self.editing_users.values():
                await websocketHandler.send_json_to_socket(editing_user.websocket, websocketHandler.CodeToClient.Room_Previews_Update, {})

            reply = {}
            reply["success"] = "true"
            return reply
        else:
            reply = {}
            reply["success"] = "false"
            return reply

# ==================== Room update ====================

    @staticmethod
    async def _broadcast_new_reconstruction(capture_id):
        """
        Called whenever a new reconstructed 3D model is available.
        Loops through the list of rooms and their client users, 
        and sends a WS notification message of `WebsocketEnums.CodeToClient.New_Reconstruction`.
        """
        if EditingServer.instance == None: #TODO: change to change if either an editing server or capture client exist
            return
    
        server = EditingServer.instance
        send_data = {"new_id": capture_id}

        for room in server.room_instances.values():
            room.thread_lock.acquire()
            for editing_user in room.editing_users.values():
                await websocketHandler.send_json_to_socket(
                    editing_user.websocket,
                    websocketEnums.CodeToClient.New_Reconstruction,
                    send_data,
                )
            room.thread_lock.release()

    def _threaded_broadcast_room_update_to_clients_loop(self):
        """
        Main func that broadcasts all udpates in each room to all clients in the room.
        """
        self.is_running = True
        while True:
            empty_rooms: list[int] = []
            for room in self.room_instances.values():
                room.thread_lock.acquire()
                room.process_pending_actions()

                # Create a json array to send to clients.
                # Populate each array and element with things to be updated
                update_data = {}
                update_data["room_id"] = room.room_id
                update_data["mesh_updates"] = room.get_dirty_mesh_instances()
                update_data["user_updates"] = room.get_user_instances()
                update_data["marker_updates"] = room.get_dirty_marker_update()
                update_data["annotation_updates"] = room.get_dirty_annotations_updates()
                update_data["measurement_updates"] = room.get_dirty_measurement_updates()

                # Send update_data to each websocket in the room
                for editing_user in room.editing_users.values():
                    EditingServer.loop.create_task( 
                        websocketHandler.send_json_to_socket(
                            editing_user.websocket,
                            websocketEnums.CodeToClient.EditRoom_ServerSend_SessionUpdate,
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

    def process_batch_update_from_client(self, websocket, jsonData: dict[str, any]):
        """
        Processes data sent from a client user containing updates done by the user on their end.
        Updates are queued to be broadcasted to other users in the same room. 
        """
        reply = {}
        reply["success"] = "true"

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        if room == None:
            reply["success"] = "false"
            return reply

        # Create pending_action for array of states to be updated.
        if len(jsonData["model_states"]) > 0:
            room.add_pending_action(roomActions.BatchUpdateMeshInstance(jsonData["model_states"]))

        # Create pending action for each marker
        if len(jsonData["marker_states"]) > 0:
            marker_states = jsonData["marker_states"]
            for marker_state in marker_states:
                marker_info = marker_state["marker_info"]
                action = marker_state["action"]
                room.add_pending_action(roomActions.ModifyMarker(marker_info, action))

        # Create pending_action for user position.
        room.add_pending_action(roomActions.UpdateUserPosition(
                self.editing_users[websocket],
                jsonData["user_position"],
                jsonData["user_rotation"],
            ))
        
        return reply

    def get_room_objects(self, websocket, jsonData: dict[str, any]):
        """
        Returns a dictionary with a list of room objects containing 
        users, meshes, markers in the `RoomInstance` for a websocket.
        """
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
        result["measurement_instances"] = room.get_measurement_updates()
        result["annotation_instances"] = room.get_annotations_updates()
        return result

    def create_new_mesh_object(self, websocket, jsonData: dict[str, any]):
        """
        Creates a new mesh object for the `RoomInstance`.
        """
        result = {}

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        if room == None:
            result["success"] = "false"
            return result
        # Check for any reason to not allow creation of mesh

        # Create action and add to pending room.
        action = roomActions.CreateMeshInstance(jsonData)
        room.add_pending_action(action)

        result["success"] = "true"
        return result

    # TODO: standardize and make it so markers are created with this func,
    # instead of in `process_batch_update_from_client`.
    def create_new_marker_object(self, websocket, jsonData: dict[str, any]):
        """
        Creates a new marker object for the `RoomInstance`.
        """

    def create_new_annotation_object(self, websocket, jsonData: dict[str, any]):
        """
        Creates a new annotation object for the `RoomInstance`,
        and adds it as an action to the list of `room.add_pending_action` to be performed in `roomInstance.process_pending_actions`.
        """
        result = {}

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        if room == None:
            result["success"] = "false"
            return result
        # Check for any reason to not allow creation

        # Create action and add to pending room.
        action = roomAnnotationActions.CreateAnnotationInstance(jsonData)
        room.add_pending_action(action)

        result["success"] = "true"
        return result
    
    # Adds a pending action to the room to create the  measurement object IN THE SERVER only.
    def create_new_measurement_object(self, websocket, jsonData: dict[str, any]):
        """
        Creates a new measurement object for the `RoomInstance`,
        and adds it as an action to the list of `room.add_pending_action` to be performed in `roomInstance.process_pending_actions`.
        """
        result = {}

        room_id = self.get_connected_room_id(websocket)
        room: RoomInstance = self.room_instances.get(room_id)
        if room == None:
            result["success"] = "false"
            return result
        # Check for any reason to not allow creation

        # Create action and add to pending room.
        action = roomMeasurementActions.CreateMeasurementInstance(jsonData)
        room.add_pending_action(action)

        result["success"] = "true"
        return result

# ==================== Users response actions ====================

    def ws_start_room(self, jsonData: dict[str, any]):
        reply = {}
        reply["success"] = "true"
        return reply

    def ws_join_room(self, websocket, jsonData: dict[str, any]):
        reply = {}
        room_id: int = jsonData["room_id"]

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
        edit_user: UserInstance = self.editing_users[websocket]

        if edit_user.room_id != None:
            room: RoomInstance = self.room_instances[edit_user.room_id]
            room.add_pending_action(roomActions.DeleteEditingUser(edit_user.id))
            edit_user.room_id = None

        reply["success"] = True
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
        self.editing_users[websocket] = UserInstance(websocket, jsonData)
        self.user_connection_count += 1

        reply["success"] = "true"
        return reply

    def check_disconnected_websocket(self, websocket):
        # Check if websocket is registered as editing user.
        # If editing user, remove from room if any, then remove from editing_users dictionary.
        edit_user: UserInstance = self.editing_users.get(websocket)
        if edit_user == None:
            return

        # Remove from dictionary by key.
        self.editing_users.pop(websocket)

        if edit_user.room_id == None:
            return
        room: RoomInstance = self.room_instances[edit_user.room_id]
        room.add_pending_action(roomActions.DeleteEditingUser(edit_user.id))

# ==================== Getter ====================

    def get_connected_room_id(self, websocket):
        if websocket in self.editing_users:
            return self.editing_users[websocket].room_id
        return None

def create_instance() -> EditingServer:
    return EditingServer()

def shutdown_instance():
    if EditingServer.instance != None:
        EditingServer.instance.shutdown()