from .WebsocketEnums import CodeToServer, CodeToClient

# from ..model_database.obsolete import local_database, local_database_model_tracker
from ..model_database import client_requests
from ..client_servers.editing_server import EditingServer
from ..client_servers.capture_server import CaptureServer
import asyncio

class WebsocketFunctionPrep:
    def __init__(self, websocket, jsonData, reply):
        self.websocket = websocket
        self.jsonData = jsonData
        self.reply = reply

    def model_get_model_previews(self):
        result = client_requests.fetch_model_previews()
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
        result = client_requests.fetch_model_data_dl_url(self.jsonData["id"], self.jsonData["version"])
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def model_info_save_new_info(self):
        success = client_requests.update_model_data(self.jsonData["id"], self.jsonData)
        self.reply = self.reply | {"success": success}
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def download_model_zip_file(self):

        result = client_requests.package_model_zip(
            self.jsonData["id"],
            self.jsonData["version"],
            self.jsonData["name"]
        )

        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_fetch_room_previews(self):
        #result = EditingServer.instance.ws_fetch_room_preview(self.jsonData)
        result = client_requests.fetch_edit_room_previews()
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
        result = EditingServer.instance.ws_fetch_room_objects(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_server_request_load_mesh(self):
        result = EditingServer.instance.ws_server_request_load_mesh(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def edit_server_batch_update(self):
        result = EditingServer.instance.ws_server_batch_update(
            self.websocket, self.jsonData
        )
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply

    def edit_Server_update_marker(self):
        result = EditingServer.instance.ws_server_update_marker(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply

    def capture_server_start_session(self):
        result = CaptureServer.instance.ws_host_session(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def capture_server_close_session(self):
        result = CaptureServer.instance.ws_close_session(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def capture_server_join_session(self):
        result = CaptureServer.instance.ws_join_session(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def capture_server_leave_session(self):
        result = CaptureServer.instance.ws_leave_session(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def capture_server_update_model_version(self):
        result = CaptureServer.instance.ws_update_model_version(self.websocket, self.jsonData)
        self.reply = self.reply | result
        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def capture_server_user_update(self):
        result = CaptureServer.instance.ws_user_update(self.websocket, self.jsonData)

        self.reply["_code"] = CodeToClient.Reply
        return self.reply
    
    def capture_server_marker_update(self):
        result = CaptureServer.instance.ws_marker_update(self.websocket, self.jsonData)

        self.reply["_code"] = CodeToClient.Reply
        return self.reply
