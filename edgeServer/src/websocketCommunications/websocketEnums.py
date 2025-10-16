from enum import IntEnum

class CodeToServer(IntEnum):
    # Testing
    Test_receive = 900

    # General Codes that are independently accessible or usable without context.
    Reply = 0
    Model_GetList = 1
    Model_DownloadModelPreviews = 2
    Model_Build3DUrl = 3
    ModelInfo_SaveNewInfo = 4
    Download_ModelZipFile = 5
    # is it 1 2 or 5?

    # Codes for Collaborative Editing Session for Editing Clients
    EditServer_FetchRoomPreviews = 101
    EditServer_CreateEmptyRoom = 102
    EditServer_StartRoom = 103
    EditServer_JoinRoom = 104
    EditServer_ExitRoom = 105
    EditServer_RegisterAsEditingUser = 106

    EditServer_ClientRequest_GetRoomObjects = 107
    EditServer_ClientRequest_CreateNewMeshObject = 108
    EditServer_ClientSend_BatchUpdate = 109
    # EditServer_UpdateMarker = 110
    EditServer_ClientRequest_CreateNewMarkerObject = 110
    EditServer_ClientRequest_CreateNewAnnotationObject = 111
    EditServer_ClientRequest_CreateMeasurementObject = 112

    # Code for Collaborative Reconstruction Sessions for Editing and Capture Clients
    CaptureServer_StartSession = 201
    CaptureServer_CloseSession = 202 
    CaptureServer_JoinSession = 203
    CaptureServer_LeaveSession = 204
    CaptureServer_UpdateModelVersion = 205
    CaptureServer_UserUpdate = 206
    CaptureServer_MarkerUpdate = 207

class CodeToClient(IntEnum):
    Reply = 0

    Websocket_Initialize = -1

    Model_InfoUpdate = -2
    EditRoom_ServerSend_SessionUpdate = -3
    New_Reconstruction = -4
    Room_Previews_Update = -5

    CaptureSession_Update = -6
    CaptureSession_Closed = -7
