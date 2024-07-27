/**
 * @fileoverview
 * Defines websocket communication behaviour between editingClient and backend server.
 * This file defines connection setup of websocket as structure for how to handle sending
 * msges or receiving them, but does not control format of data being sent.
 */
import { ModelBrowser } from "./ModelBrowser";
import { EditingSessionManager } from "./EditingSessionManager";
import { Nullable } from "@babylonjs/core";
import { CaptureSessionManager } from "./capture-session/CaptureSessionManager";

type Callback = ()=>void

/**
 * @classdesc
 * Defines that a callback function is meant to be called after
 * receiving a response from server with matching sequence number.
 */
class ResponseCallback {
  sequenceNumber: number;
  callback: any;
  constructor(seqNumber: number, callback: any) {
    this.sequenceNumber = seqNumber;
    this.callback = callback;
  }
}

/**
 * @classdesc
 * The class defines how communication via websocket is to be performed.
 * Code or logic that require websocket communication to backend server needs to
 * communicate via calling SocketHandler.SendMessage() with the appropriate enum and jsonData.
 */
export class SocketHandler {
  static instance: SocketHandler;

  /**
   * Enum for list of codes to server to parse the message type and react accordingly.
   */
  static CodeToServer = {
    Reply: 0,
    Model_GetList: 1,
    Model_DownloadModelPreviews: 2,
    Model_Build3DUrl: 3,
    ModelInfo_SaveNewInfo: 4,
    Download_ModelZipFile: 5,

    EditServer_FetchRoomPreviews: 101,
    EditServer_CreateEmptyRoom: 102,
    EditServer_StartRoom: 103,
    EditServer_JoinRoom: 104,
    EditServer_ExitRoom: 105,
    EditServer_RegisterAsEditingUser: 106,

    EditServer_FetchRoomObjects: 107,
    EditServer_RequestLoadMesh: 108,
    EditServer_BatchUpdate: 109,
    EditServer_UpdateMarker: 110,

    CaptureServer_StartSession: 201,
    CaptureServer_CloseSession: 202,
    CaptureServer_JoinSession: 203,
    CaptureServer_LeaveSession: 204,
    CaptureServer_UpdateModelVersion: 205,
    CaptureServer_UserUpdate: 206,
    CaptureServer_MarkerUpdate: 207
  };
  /**
   * Enum for list of codes to client (from server) to parse the message type and react accordingly.
   */
  static CodeToClient = {
    Reply: 0,
    Websocket_Initialize: -1,
    Model_InfoUpdate: -2,
    EditRoom_Update: -3,
    New_Reconstruction: -4,
    Room_Previews_Update: -5,
    CaptureSession_Update: -6,
    CaptureSession_Closed: -7
  };

  serverURL: string;
  webSocket: Nullable<WebSocket>;
  responseCallbacks: ResponseCallback[];
  seqNumber: number;

  constructor() {
    this.serverURL = "ws://<ip-address>:8000/start_websocket";
    this.webSocket = null;
    this.responseCallbacks = []; //Stores response callbacks only.
    this.seqNumber = 0;

    if (SocketHandler.instance) {
      SocketHandler.instance.webSocket?.close();
    }
    SocketHandler.instance = this;
  }

  /**
   * Starts the connection to backend server.
   * Should only be called once in program lifetime. 
   */
  StartConnection(onOpenCallback: Callback | undefined = undefined, onMessageCallback: Callback | undefined = undefined, onCloseCallback: Callback | undefined = undefined) {
    this.webSocket = new WebSocket(this.serverURL);
    this.webSocket.addEventListener("open", () => {
      onOpenCallback?.()
    });

    this.webSocket.addEventListener("message", (ev: MessageEvent) => {
      const jsonData = JSON.parse(ev.data);
      SocketHandler.instance.ParseData(jsonData._code, jsonData);
      
      onMessageCallback?.()
    });

    this.webSocket.addEventListener("close", () => {
      onCloseCallback?.()
    });
  }

  CloseConnection(){
    this.webSocket?.close()
  }

  /**
   * Helper function to find if server response has a callback to invoke.
   * @param {json} jsonData -Jsondata returned from server.
   * @returns {ResponseCallback} - the ResponseCallback instance with matching sequence number.
   */
  FindResponseCallback(jsonData: any) {
    const seqNumber = jsonData._sequenceNumber;
    if (seqNumber === null) {
      return null;
    }

    return this.responseCallbacks.find(
      (response) => response.sequenceNumber === seqNumber
    );
  }

  /**
   * Parses all messages received from server to determine what behaviour to take.
   * If server sends a code with Reply for CodeToClient, assumes that server is responding to
   * a previous websocket message sent by editing client.
   * @param {*} codeToClient
   * @param {*} jsonData
   * @returns
   */
  ParseData(codeToClient: number, jsonData: any) {
    switch (codeToClient) {
      case SocketHandler.CodeToClient.Reply: {
        const responseCallback = this.FindResponseCallback(jsonData);
        if (responseCallback != null) {
          responseCallback.callback(jsonData);
          return;
        }
        break;
      }
      case SocketHandler.CodeToClient.Model_InfoUpdate:
        console.log("Server Broadcast");
        ModelBrowser.instance.FetchModelPreviews();
        break;
      case SocketHandler.CodeToClient.Websocket_Initialize:
        console.log("Websocket Initialize");
        break;
      //Below SocketHandler.CodeToClient.EditRoom_Update
      //is called frequently i.e. EditingSessionManager.instance.HandleRoomUpdate(jsonData) is called in an interval
      case SocketHandler.CodeToClient.EditRoom_Update:
        EditingSessionManager.instance.HandleRoomUpdate(jsonData);
        break;
      case SocketHandler.CodeToClient.New_Reconstruction:
        console.log("Received New_Reconstruction request!")
        EditingSessionManager.instance.serverObjectManager._FindAndProcessLiveModelMasters(
          jsonData
        );
        ModelBrowser.instance.FetchModelPreviews()

        break;
      case SocketHandler.CodeToClient.Room_Previews_Update:
        EditingSessionManager.instance.FetchRoomPreviews()
        break;
      case SocketHandler.CodeToClient.CaptureSession_Update:
        CaptureSessionManager.instance?._ReceiveServerUpdate(jsonData)
        break;
      default:
        console.log("Unhandled Websocket Code");
    }
  }

  /**
   * Static function to send the message request to backend server.
   * The calling class MUST send an appropriate code for server to receive along with
   * jsonData containing fields that are expected for that code.
   *
   * The expected fields for jsonData needs to be defined in another document.
   *
   * The caller may optionally include a callback function to invoke on response from server.
   * @param {CodeToServer} code - Enum value of CodeToServer.
   * @param {json} jsonData - dictionary format data to send as json string format.
   * @param {function} callback - A callback function expecting 1 input parameter (json reply from server) to be invoked once server responds.
   * @returns
   */
  static SendData(code: number, jsonData: any, callback: any = null) {
    const _this = SocketHandler.instance;
    const webSocket = _this.webSocket;
    if (webSocket && webSocket.readyState === WebSocket.OPEN) 
    {
      jsonData._code = code;
      if (callback !== null) 
      {
        _this.seqNumber += 1;
        jsonData._sequenceNumber = _this.seqNumber;
        _this.responseCallbacks.push(
          new ResponseCallback(_this.seqNumber, callback)
        );
      }
      webSocket.send(JSON.stringify(jsonData));

      return true; //Return true if was able to send, not that it should fail now.
    }
    return false;
  }
}
