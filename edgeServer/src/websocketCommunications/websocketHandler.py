import json
import threading
from fastapi import WebSocket, WebSocketDisconnect, WebSocketException
from websocketCommunications.websocketEnums import CodeToServer, CodeToClient
# from .websocketFunctions import WebsocketFunctionPrep

connected_sockets = {}
on_websocket_disconnect_callbacks = []

async def StartClientSocket(websocket: WebSocket):
    print("Client inititated websocket connection")
    await websocket.accept()
    connected_sockets[websocket] = threading.Lock()

    try:
        while True:
            # message = await websocket.receive_json()
            # msgCode = CodeToServer(message['_code'])
            # # await ParseSocketData(websocket, msgCode, message)

            # Receive the data as text first
            messageAsText = await websocket.receive_text()
            # Try to parse as a json
            try:
                message = json.loads(messageAsText) 
                msgCode = CodeToServer(message['_code'])
                await ParseSocketData(websocket, msgCode, message)
            except json.JSONDecodeError:
                print(f"Error: Received invalid JSON: {messageAsText}")
                print("Reading data as text with server code 000")
                # await ParseSocketData(websocket, 000, message)
    except WebSocketDisconnect:
        del connected_sockets[websocket]
        for callback in on_websocket_disconnect_callbacks:
            callback(websocket)

async def ParseSocketData(socket : WebSocket, messageType : CodeToServer, jsonData):
    from .websocketFunctions import WebsocketFunctionPrep
    reply = {}

    if "_sequenceNumber" in jsonData:
        reply["_sequenceNumber"] = jsonData["_sequenceNumber"]

    ws_func = WebsocketFunctionPrep(socket, jsonData, reply)
    match messageType:
        case CodeToServer.Test_receive:                     reply = ws_func.test_receive()

        case CodeToServer.Model_GetList:                    reply = ws_func.model_get_list()
        case CodeToServer.Model_DownloadModelPreviews:      reply = ws_func.model_get_model_previews()
        case CodeToServer.Model_Build3DUrl:                 reply = ws_func.model_build_3d_url()
        case CodeToServer.ModelInfo_SaveNewInfo:            reply = ws_func.model_info_save_new_info()
        case CodeToServer.Download_ModelZipFile:            reply = ws_func.download_model_zip_file()
        
        case CodeToServer.EditServer_FetchRoomPreviews:     reply = ws_func.edit_server_fetch_room_previews()
        case CodeToServer.EditServer_CreateEmptyRoom:       reply = await ws_func.edit_server_create_empty_room()
        case CodeToServer.EditServer_StartRoom:             reply = ws_func.edit_server_start_room()
        case CodeToServer.EditServer_JoinRoom:              reply = ws_func.edit_server_join_room()
        case CodeToServer.EditServer_ExitRoom:              reply = ws_func.edit_server_exit_room()
        case CodeToServer.EditServer_RegisterAsEditingUser: reply = ws_func.edit_server_register_editing_user()
        
        case CodeToServer.EditServer_ClientRequest_GetRoomObjects:  reply = ws_func.edit_server_fetch_room_objects()

        case CodeToServer.EditServer_ClientRequest_CreateNewMeshObject:   reply = ws_func.edit_server_create_new_mesh_object()
        case CodeToServer.EditServer_ClientSend_BatchUpdate: reply = ws_func.edit_server_batch_update()
        case CodeToServer.EditServer_ClientRequest_CreateNewAnnotationObject:   reply = ws_func.edit_server_create_new_annotation_object()
        # Uses this code to process the json data with the func on the right.
        case CodeToServer.EditServer_ClientRequest_CreateMeasurementObject:   reply = ws_func.edit_server_create_new_measurement_object()
        
        # case CodeToServer.CaptureServer_StartSession:       reply = ws_func.capture_server_start_session()
        # case CodeToServer.CaptureServer_CloseSession:       reply = ws_func.capture_server_close_session()
        # case CodeToServer.CaptureServer_JoinSession:        reply = ws_func.capture_server_join_session()
        # case CodeToServer.CaptureServer_LeaveSession:       reply = ws_func.capture_server_leave_session()
        # case CodeToServer.CaptureServer_UpdateModelVersion: reply = ws_func.capture_server_update_model_version()
        # case CodeToServer.CaptureServer_UserUpdate:         reply = ws_func.capture_server_user_update()
        # case CodeToServer.CaptureServer_MarkerUpdate:       reply = ws_func.capture_server_marker_update()

        case _:
            print("Unhandled Server Code Type")
            pass
    
    if socket not in connected_sockets:
        return
    
    connected_sockets[socket].acquire()
    
    try:
        await socket.send_json(reply)
    except WebSocketException as error:
        print("Socket On Send Exception:\n" + error)
    connected_sockets[socket].release()
    return

# TODO: Check if still in use. Was previously replaced with func 'send_json_to_socket'
# async def BroadcastToSockets(messageType: CodeToClient, jsonData):
#     for socket in connected_sockets:
#         await send_json_to_socket(socket, messageType, jsonData)

# Used by edting server create new empty room, new reconstruction, update loop. why not in same websocket function script?
async def send_json_to_socket(websocket: WebSocket, messageType: CodeToClient, jsonData):
    msg = jsonData
    msg["_code"] = messageType

    if websocket not in connected_sockets:
        return

    connected_sockets[websocket].acquire()
    try:
        await websocket.send_json(msg)
    except WebSocketException as error:
        print("Socket On Send Exception:\n" + error)
    connected_sockets[websocket].release()