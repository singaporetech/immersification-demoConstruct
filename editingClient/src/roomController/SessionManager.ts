/**
 * @fileoverview
 * Handles session management with backend server.
 */
import { SocketHandler } from "../networking/WebSocketManager";
import { ServerObjectManager } from "./ServerObjectManager";
import { RoomSelectMenuController } from "../gui/desktop/RoomSelectMenuController";
import { ActionManager, Color3, Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { float } from "babylonjs";
import { GuiManager } from "../gui/desktop/GuiManager";
import { Array3ToAxes } from "../utilities/ArrayUtility";
import { NewRoomInfo } from "../utilities/data/RoomData";
import { UserInformation } from "../utilities/data/UserData";
import { MathUtility } from "../utilities/MathUtility";
import { VrManager } from "../modeController/vr/VrManager";
import { DesktopCameraSettings } from "../cameraController/desktop/DesktopCameraSettings";
import { MeasureMenuController } from "../gui/desktop/MeasureMenuController";
import { AnnotationPlatesManager } from "../gui/AnnotationPlatesController";
import { AnnotationMenuController } from "../gui/desktop/AnnotationMenuController";
import VRAnnotationViewerMenuController from "../gui/vr/VRAnnotationViewerMenuController";

/**
 * @description Manages the room and sessioning of the room the user is in.
 */
export class SessionManager {
  static instance: SessionManager;
  
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

    SessionManager.instance = this;
  }

  //TODO: Move this func to some static helper func related to camera
  public SwitchCamera(camera: any) {
    this.trackedCamera = camera;
  }

  public ResetToPCCamera() {
    this.trackedCamera = this.defaultCamera;
  }

  public ReadTrackedCameraTransforms() {
    this.trackedCameraPos = this.trackedCamera.position;

    if(VrManager.getInstance?.inVR)
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
    return SessionManager.instance.isConnectedToRoom;
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

  CheckVaildRoomReconstruction(roomIndex: string | number) {
    const _this = SessionManager.instance;

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
      _this.FetchRoomData();

      // AnnotationPlatesManager.instance.initializePlates();
      
      GuiManager.instance.SetRoomLobbyVisibility(false);
      GuiManager.instance.SetMarkerUIVisibility(true);
      GuiManager.instance.SetFlatEditorUIVisibility (true);
      DesktopCameraSettings.EnableCameraMovement(true);
            
    };
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_JoinRoom,
      sendData,
      callback
    );
  }


  JoinRoom(roomIndex: string | number) {
    const _this = SessionManager.instance;

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
      _this.FetchRoomData();

      // AnnotationPlatesManager.instance.initializePlates();
      
      GuiManager.instance.SetRoomLobbyVisibility(false);
      GuiManager.instance.SetMarkerUIVisibility(true);
      GuiManager.instance.SetFlatEditorUIVisibility (true);
      DesktopCameraSettings.EnableCameraMovement(true);
            
    };
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_JoinRoom,
      sendData,
      callback
    );
  }

  /**
   * Part of room initialization function. Used to fetch json data containing
   * list of objects in the room on room join.
   */
  FetchRoomData() {
    const _this = SessionManager.instance;

    const sendData = {};

    const callback = function (jsonData: {
      success: string;
      user_instances: any;
      mesh_instances: any;
      marker_instances: any;
      measurement_instances: any;
      annotation_instances: any;
    }) {
      if (jsonData.success === "false") 
        return;

      _this.serverObjectManager.LoadRoomData(jsonData.user_instances, 
                                              jsonData.mesh_instances, 
                                              [], 
                                              jsonData.marker_instances,
                                              jsonData.measurement_instances,
                                              jsonData.annotation_instances);
    };

    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_ClientRequest_GetRoomObjects,
      sendData,
      callback
    );
  }

  //TODO: exiting a room should uninit everything related to editing room.
  //currently does not uninit components
  //Method that clears all room data
  ExitRoom() {
    this.isConnectedToRoom = false;

    //Clear a;; object data of room.
    this.serverObjectManager.ClearRoomData();
    GuiManager.instance.SetFlatEditorUIVisibility (false);
    GuiManager.instance.SetRoomLobbyVisibility(true);
    GuiManager.instance.SetMarkerUIVisibility(false);
    DesktopCameraSettings.EnableCameraMovement(false);

    //Notify server.
    const sendData = {};
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_ExitRoom,
      sendData
    );
  }

  CreateEmptyRoom(newRoomInfo: NewRoomInfo) {
    const sendData = {
      roomName: newRoomInfo.roomName,
      baseReconstruction: newRoomInfo.baseReconstruction,
      authors: newRoomInfo.authors,
    };

    const callback = function (jsonData: {
      success: string;
    }) {
      if (jsonData.success === "false") 
      {
        RoomSelectMenuController.instance.createRoomSubMenu.AnimatePopup();
        console.log("Failed to create room: Reconstruction not available");
        return;
      }
      RoomSelectMenuController.instance.createRoomSubMenu.closeMenu();
      console.log("Created room!");
    };

    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_CreateEmptyRoom,
      sendData,
      callback
    );
  }

  _UpdateRoomPreviews(jsonData: any) {
    const _this = SessionManager.instance;
    _this.roomPreviews = jsonData.room_previews;

    if (RoomSelectMenuController.instance.hasInitialised === false) {
      const callback = function () {
        RoomSelectMenuController.instance.RefreshRoomElements(_this.roomPreviews);
      };
      RoomSelectMenuController.instance.postInitCallbacks.push(callback);
    } else {
      RoomSelectMenuController.instance.RefreshRoomElements(_this.roomPreviews);
    }
  }

  FetchRoomPreviews() {
    console.log("fetching room previews");
    const _this = SessionManager.instance;
    const sendData = {
      //Nothing To Send
    };

    const callback = function (jsonData: any) {
      console.log("Fetch successful");
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

  /**
   * @description May be the function to register yourself as a user to the server. Need to double check.
   */
  RegisterToServer() {
    const _this = SessionManager.instance;
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

  /**
   * Used to receive updates from the server, and apply them locally to the room.
   * @param jsonData 
   * @returns 
   */
  HandleRoomUpdate(jsonData: {
    mesh_updates: Array<any>,
    user_updates: Array<any>,
    marker_updates: Array<any>,
    annotation_updates: Array<any>,
    measurement_updates: Array<any>
  }) {
    const modelArray = jsonData.mesh_updates;
    const userArray = jsonData.user_updates;
    const markerArray = jsonData.marker_updates;
    const annotationArray = jsonData.annotation_updates;
    const measurementArray = jsonData.measurement_updates;

    if (modelArray.length > 0) {
      this.serverObjectManager.UpdateModelStates(modelArray);
    }
    if (userArray.length > 0) {
      this.serverObjectManager.UpdateUserStates(userArray);
    }
    if (markerArray.length > 0){
      this.serverObjectManager.UpdateMarkerStates(markerArray);
    }
    if (annotationArray.length > 0){
      this.serverObjectManager.UpdateAnnotationComponents(annotationArray);
    }
    // Processes any `measurement_updates` array sent from the server to create new measurement UI and objects.
    if (measurementArray.length > 0){
      // Use the func we created in `MeasureMenuController` to process the array, and try and create UI objects if they dont exist.
      MeasureMenuController.instance.ReceiveCreateNewMeasurementRequestFromServer(measurementArray);
    }
    return;
  }

  /***
   * Used to send local changes to the server, so server can broadcast changes to other users
   */
  _NetworkUpdate() {
    const _this = SessionManager.instance;

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
    const rot = MathUtility.vec3RadianToDegree(_this.trackedCameraRot);
    sendData.user_rotation = Array3ToAxes.ToArray(rot);

    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_ClientSend_BatchUpdate,
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