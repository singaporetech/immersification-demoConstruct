/**
 * @fileoverview
 * Handles session management with backend server. Currently in barebones stage,
 * this script will be in charge of managing login state and permissions for editing
 * the babylonJS scene that is tracked by server.
 * @author
 * Ambrose
 */
import { SocketHandler } from "./WebSocketManager";
import { Array3ToAxes } from "../utils/ArrayTools";
import { MathUtilities } from "../utils/Math";
import { ServerObjectManager } from "./ServerObjectManager";
import { EditingSession_Menu } from "./gui/EditingSession_Menu";
import { ActionManager, Color3, Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { GUIManager } from "./gui/GuiManager";
import { CameraSettings } from "./CameraSettings";
import { float } from "babylonjs";
import { VRManager } from "./vr/VRManager";

export class NewRoomInfo {
  roomName: string;
  baseReconstructionID: string;
  authors: string;
  constructor() {
    this.roomName = "New Room";
    this.baseReconstructionID = "dover_courtyard";
    this.authors = "N/A";
  }
}

class UserInformation{
  displayName: string
  displayColor: Color3
  email: string

  constructor(displayName: string, displayColor: Color3, email: string){
    this.displayName = displayName
    this.displayColor = displayColor
    this.email = email
  }
}

export class EditingSessionManager {
  static instance: EditingSessionManager;
  
  scene: Scene
  trackedCamera: any;
  defaultCamera: any; //default camera is always the pc camera
  trackedCameraPos: Vector3;
  trackedCameraRot: Vector3;
  roomPreviews: any;
  
  userId: number;
  userInformation: UserInformation;

  isConnectedToRoom: boolean;
  networkUpdateInterval: number;
  intervalFunctionID: any;
  serverObjectManager: ServerObjectManager;
  
  actionManager: ActionManager;

  constructor(pcCamera: any, scene: Scene) {
    this.scene = scene
    this.trackedCamera = pcCamera;
    this.defaultCamera = pcCamera;
    this.trackedCameraPos = pcCamera.position;
    this.trackedCameraRot = pcCamera.rotation;

    this.roomPreviews = null;
    this.userId = Math.floor(Math.random() * 9001);
    this.userInformation = new UserInformation("John Doe", Color3.Purple(), "j.doe@gmail.com")

    this.isConnectedToRoom = false;

    this.networkUpdateInterval = 50; //Time in Milliseconds
    this.intervalFunctionID = null;

    this.serverObjectManager = new ServerObjectManager(scene);

    this.actionManager = new ActionManager(scene);

    EditingSessionManager.instance = this;
  }

  public SwitchCamera(camera: any)
  {
    this.trackedCamera = camera;
  }

  public ResetToPCCamera()
  {
    this.trackedCamera = this.defaultCamera;
  }

  public ReadTrackedCameraTransforms()
  {
    this.trackedCameraPos = this.trackedCamera.position;

    if(VRManager.getInstance?.getinVR())
    {
      let rotQuat = new Quaternion();
      rotQuat = this.trackedCamera.rotationQuaternion;
      rotQuat.toEulerAnglesToRef(this.trackedCameraRot);

    }
    else
    {
      this.trackedCameraRot = this.trackedCamera.rotation;
    }

  }

  static IsConnectedToRoom() {
    return EditingSessionManager.instance.isConnectedToRoom;
  }

  UpdateUserInformation(displayName: string, color: Color3) {
    this.userInformation.displayName = displayName
    this.userInformation.displayColor = color
  }

  GetPreview(index: number) {
    if (index < 0 || index >= this.roomPreviews.length) {
      return null;
    }
    return this.roomPreviews[index];
  }

  FetchRoomModels() {
    const _this = EditingSessionManager.instance;

    const sendData = {};

    const callback = function (jsonData: {
      success: string;
      user_instances: any;
      mesh_instances: any;
      marker_instances: any;
    }) {
      if (jsonData.success === "false") 
        return;
      
      _this.serverObjectManager.ReloadObjects(jsonData.user_instances, jsonData.mesh_instances, [], jsonData.marker_instances);
    };

    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_FetchRoomObjects,
      sendData,
      callback
    );
  }

  //TODO: exiting a room should uninit everything related to editing room.
  //currently does not uninit components
  //Method that clears all room data
  ExitRoom() {
    this.isConnectedToRoom = false;

    //Clear all data of room.
    this.serverObjectManager.ClearAllRoomData();
    GUIManager.instance.SetFlatEditorUIVisibility (false);
    GUIManager.instance.SetRoomLobbyVisibility(true);
    GUIManager.instance.SetMarkerUIVisibility(false);
    CameraSettings.EnableCameraMovement(false);

    //Notify server.
    const sendData = {};
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_ExitRoom,
      sendData
    );
  }

  JoinRoom(roomIndex: string | number) {
    const _this = EditingSessionManager.instance;

    const sendData = {
      room_id: _this.roomPreviews[roomIndex].room_id
    };

    const callback = function (jsonData: any) {
      if (jsonData.success === "false") {
        _this.isConnectedToRoom = false;
        return;
      }
      _this.isConnectedToRoom = true;
      _this.intervalFunctionID = window.setInterval(
        _this._NetworkUpdate,
        _this.networkUpdateInterval
      );
      _this.FetchRoomModels();
      GUIManager.instance.SetRoomLobbyVisibility(false);
      GUIManager.instance.SetMarkerUIVisibility(true);
      GUIManager.instance.SetFlatEditorUIVisibility (true);
      CameraSettings.EnableCameraMovement(true);
    };
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_JoinRoom,
      sendData,
      callback
    );
  }

  CreateEmptyRoom(newRoomInfo: NewRoomInfo) {
    const sendData = {
      roomName: newRoomInfo.roomName,
      baseReconstructionID: newRoomInfo.baseReconstructionID,
      authors: newRoomInfo.authors,
    };
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_CreateEmptyRoom,
      sendData
    );
  }

  _UpdateRoomPreviews(jsonData: any) {
    const _this = EditingSessionManager.instance;
    _this.roomPreviews = jsonData.room_previews;

    if (EditingSession_Menu.instance.hasInitialised === false) {
      const callback = function () {
        EditingSession_Menu.instance.RefreshRoomElements(_this.roomPreviews);
      };
      EditingSession_Menu.instance.postInitCallbacks.push(callback);
    } else {
      EditingSession_Menu.instance.RefreshRoomElements(_this.roomPreviews);
    }
  }

  FetchRoomPreviews() {
    const _this = EditingSessionManager.instance;
    const sendData = {
      //Nothing To Send
    };

    const callback = function (jsonData: any) {
      if (jsonData.success === "false") 
        return;
      _this._UpdateRoomPreviews(jsonData);
    };

    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_FetchRoomPreviews,
      sendData,
      callback
    );
  }

  RegisterToServer() {
    const _this = EditingSessionManager.instance;
    const colorArray: Array<float> = []
    this.userInformation.displayColor.toArray(colorArray)
    const sendData = {
      username: this.userInformation.displayName,
      color: colorArray,
    };

    const callback = function (jsonData: any) {
      if (jsonData.success === "true") {
        _this.FetchRoomPreviews();
      }
      if(jsonData.user_id != undefined){
        _this.userId = jsonData.user_id
        _this.serverObjectManager.selfUserId = _this.userId
      }
    };
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_RegisterAsEditingUser,
      sendData,
      callback
    );
  }

  HandleRoomUpdate(jsonData: {
    mesh_updates: Array<any>,
    user_updates: Array<any>,
    marker_updates: Array<any>
  }) {
    const modelArray = jsonData.mesh_updates;
    const userArray = jsonData.user_updates;
    const markerArray = jsonData.marker_updates;

    if (modelArray.length > 0) {
      this.serverObjectManager.UpdateModels(modelArray);
    }
    if (userArray.length > 0) {
      this.serverObjectManager.UpdateUsers(userArray);
    }
    if(markerArray.length > 0){
      this.serverObjectManager.UpdateMarkers(markerArray);
    }
    return;
  }

  _NetworkUpdate() {
    const _this = EditingSessionManager.instance;

    //Build sendData
    let sendData = {
      user_position: [] as any[],
      user_rotation: [] as any[],
      model_states: [] as any[],
      light_states: [] as any[],
    };

    //Collect updated mesh transforms/parents
    const modifiedStates =
      ServerObjectManager.instance.RetrieveModifiedStates();

    sendData = { ...sendData, ...modifiedStates };

    //Get camera position
    sendData.user_position = Array3ToAxes.ToArray(_this.trackedCameraPos);
    const rot = MathUtilities.vec3RadianToDegree(_this.trackedCameraRot);
    sendData.user_rotation = Array3ToAxes.ToArray(rot);

    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_BatchUpdate,
      sendData
    );
  }

  Initialize() {
    this.RegisterToServer();
  }

  OnWebsocketDisconnect() {
    window.clearInterval(this.intervalFunctionID);
  }
}
