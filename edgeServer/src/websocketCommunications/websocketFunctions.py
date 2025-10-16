from websocketCommunications.websocketEnums import CodeToClient

# from ..model_database.obsolete import local_database, local_database_model_tracker
from database.mongoDB import clientRequests
from editingClientSessioning.editingServer import EditingServer
# from ..client_servers.capture_server import CaptureServer
# from websocketCommunications import WebsocketHandler 

class WebsocketFunctionPrep:
    def __init__(self, websocket, jsonData, reply):
        self.websocket = websocket
        self.jsonData = jsonData
        self.reply = reply

    def model_get_model_previews(self):
        result = clientRequests.fetch_model_previews()
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def model_get_list(self):
        self.reply[
            "modelNames"
        ] = EditingServer.instance.database.websocket_get_model_names()
        self.reply[
            "thumbnailsBase64"
        ] = EditingServer.instance.database.websocket_get_thumbnail_data()
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def model_build_3d_url(self):
        result = clientRequests.fetch_model_data_dl_url(self.jsonData["id"], self.jsonData["version"])
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def model_info_save_new_info(self):
        success = clientRequests.update_model_data(self.jsonData["id"], self.jsonData)        
        self.reply = self.reply | {"success": success}
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def download_model_zip_file(self):

        result = clientRequests.package_model_zip(
            self.jsonData["id"],
            self.jsonData["version"],
            self.jsonData["name"]
        )

        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_fetch_room_previews(self):
        #result = EditingServer.instance.ws_fetch_room_preview(self.jsonData)
        result = clientRequests.fetch_edit_room_previews()
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    async def edit_server_create_empty_room(self):
        result = await EditingServer.instance.ws_create_empty_room(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_start_room(self):
        result = EditingServer.instance.ws_start_room(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_join_room(self):
        result = EditingServer.instance.ws_join_room(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def edit_server_exit_room(self):
        result = EditingServer.instance.ws_exit_room(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_register_editing_user(self):
        result = EditingServer.instance.ws_register_editing_user(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_fetch_room_objects(self):
        result = EditingServer.instance.get_room_objects(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_create_new_mesh_object(self):
        result = EditingServer.instance.create_new_mesh_object(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def edit_server_create_new_annotation_object(self):
        result = EditingServer.instance.create_new_annotation_object(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    # Requests the server to init a new measurement object IN THE SERVER only.
    def edit_server_create_new_measurement_object(self):
        result = EditingServer.instance.create_new_measurement_object(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_batch_update(self):
        result = EditingServer.instance.process_batch_update_from_client(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    # # Used by edting server create new empty room, new reconstruction, update loop. why not in same websocket function script?
    # async def send_json_to_socket(websocket: WebSocket, messageType: CodeToClient, jsonData):
    #     msg = jsonData
    #     msg["_code"] = messageType

    #     if websocket not in WebsocketHandler.connected_sockets:
    #         return

    #     WebsocketHandler.connected_sockets[websocket].acquire()
    #     try:
    #         await websocket.send_json(msg)
    #     except WebsocketHandler.WebSocketException as error:
    #         print("Socket On Send Exception:\n" + error)
    #     WebsocketHandler.connected_sockets[websocket].release()


    #     # self.jsonData = jsonData

    # # Used by edting server create new empty room, new reconstruction, update loop. why not in same websocket function script?
    # async def send_json_to_socket(websocket: WebSocket, messageType: CodeToClient, jsonData):

    #     self.jsonData = jsonData



    #     jsonData["_code"] = messageType

    #     if websocket not in WebsocketHandler.connected_sockets:
    #         return

    #     WebsocketHandler.connected_sockets[websocket].acquire()
    #     try:
    #         await websocket.send_json(msg)
    #     except WebsocketHandler.WebSocketException as error:
    #         print("Socket On Send Exception:\n" + error)
    #     WebsocketHandler.connected_sockets[websocket].release()




    # TODO: reimplement for markers
    # def edit_Server_update_marker(self):
    #     result = EditingServer.instance.ws_server_update_marker(self.websocket, self.jsonData)
    #     self.reply = self.reply | result
    #     self.reply["_code"] = CodeToClient.Reply

    def test_receive(self):
        self.reply["reply"] = "This is a reply from the server, hello there."
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    """
    Deprecated capture room session functions
    """
    # def capture_server_start_session(self):
    #     result = CaptureServer.instance.ws_host_session(self.websocket, self.jsonData)
    #     self.reply = self.reply | result
    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply
    
    # def capture_server_close_session(self):
    #     result = CaptureServer.instance.ws_close_session(self.websocket, self.jsonData)
    #     self.reply = self.reply | result
    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply
    
    # def capture_server_join_session(self):
    #     result = CaptureServer.instance.ws_join_session(self.websocket, self.jsonData)
    #     self.reply = self.reply | result
    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply
    
    # def capture_server_leave_session(self):
    #     result = CaptureServer.instance.ws_leave_session(self.websocket, self.jsonData)
    #     self.reply = self.reply | result
    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply
    
    # def capture_server_update_model_version(self):
    #     result = CaptureServer.instance.ws_update_model_version(self.websocket, self.jsonData)
    #     self.reply = self.reply | result
    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply
    
    # def capture_server_user_update(self):
    #     result = CaptureServer.instance.ws_user_update(self.websocket, self.jsonData)

    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply
    
    # def capture_server_marker_update(self):
    #     result = CaptureServer.instance.ws_marker_update(self.websocket, self.jsonData)

    #     self.reply["_code"] = CodeToClient.Reply
    #     return self.reply