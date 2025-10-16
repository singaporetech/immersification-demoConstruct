/**
 * @fileoverview
 * This is the main entry point of BabyonJS setup.
 * OnSceneReady and OnRender functions are defined here where individual
 * components used for BabylonJS are initialised.
 * @author
 * Ambrose
 */
import "babylonjs-inspector";
import "@babylonjs/loaders";
import {
  GizmoManager,
  Vector3,
  UniversalCamera,
  HemisphericLight,
  WebXRMotionControllerManager,
} from "@babylonjs/core";
import React from "react";
import { useEffect } from "react";
import SceneComponent from "babylonjs-hook";

import { GuiManager } from "./gui/desktop/GuiManager";
import { CustomUniversalCameraInput } from "./cameraController/desktop/CustomUniversalCameraInput";
import { DesktopCameraSettings } from "./cameraController/desktop/DesktopCameraSettings";
import { VrManager as VRManager } from "./modeController/vr/VrManager";
import { ModelBrowserToolManager } from "./modelBrowserTool/desktop/ModelBrowserToolManager";
import { SocketHandler } from "./networking/WebSocketManager";
import { ObjectPickingManager } from "./objectPickingSelection/ObjectPickingManager";
import { ModelLoaderManager } from "./roomController/ModelLoaderManager";
import { ServerObjectManager } from "./roomController/ServerObjectManager";
import { SessionManager } from "./roomController/SessionManager";
import { TransformGizmoSelector } from "./transformTool/desktop/TransformGizmoSelector";
import { AnnotationDataManager } from "./annotationTool/AnnotationDataManager";
import { AnnotationToolManager } from "./annotationTool/AnnotationToolManager";
import { DesktopManager } from "./modeController/DesktopManager";
import { DualStateHelper } from "./dualState/dualStateHelper";
import { RenderConfig } from "./config";

// const EditingMode = () => {

// import profilesList from "@webxr-input-profiles/registry/dist/profilesList.json";
// import { WebXRDefaultExperience } from "@babylonjs/core/XR";

let _canvas;

//  @typescript-eslint/no-unused-vars 
let modelLoader; // eslint-disable-line @typescript-eslint/no-unused-vars

let gizmoMngr;

let desktopManager: DesktopManager

let guiManager: GuiManager;
let pickingManager;
let socketHandler;
let sessionMngr;
let modelBrowser;

let dualStateHelper: DualStateHelper;

let annotationDataManager: AnnotationDataManager  | null = null;
let annotationToolManager: AnnotationToolManager  | null = null;
let gizmoSelector: TransformGizmoSelector | null = null

// VR variables
let xrHelper: any;
let xrSessionManager;
let xrFeatureManager;
let vrMngr: VRManager;

export default function EditingMode() 
{

  useEffect(() => {
    return () => {
      SocketHandler.instance.CloseConnection();
      GuiManager.instance.Uninit();
      TransformGizmoSelector.instance.Uninit();
    };
  }, []);

  return (
    <SceneComponent
      antialias
      onSceneReady={onSceneReady}
      onRender={onRender}
      className="h-screen w-screen"
    />
  );
};

//Helper function to initialize BabylonJS gizmoManager.
export function InitGizmoManager(scene) {
  gizmoMngr = new GizmoManager(scene);
  gizmoMngr.attachableMeshes = [];

  //Enable Gizmo to be able to set updateGizmoRotation
  gizmoMngr.positionGizmoEnabled = true;
  gizmoMngr.gizmos.positionGizmo!.updateGizmoRotationToMatchAttachedMesh = false; //TOOD (Yes, not 'TODO'): check if operation is working
  gizmoMngr.positionGizmoEnabled = false; //Disable again to hide.

  return gizmoMngr;
}

//Initializing the BabylonJS scene.
export const onSceneReady = async (scene) => 
  {
  const canvas = scene.getEngine().getRenderingCanvas();
  _canvas = canvas;

  desktopManager = new DesktopManager();
  desktopManager.init(scene);
  
  pickingManager = new ObjectPickingManager();
  pickingManager.Init(scene);

  gizmoMngr = InitGizmoManager(scene);
  gizmoSelector = new TransformGizmoSelector(gizmoMngr)
  gizmoSelector.Init()

  const camera = new UniversalCamera("universal_camera", new Vector3(0, 5, -20), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);

  const customUniversalCamController = new CustomUniversalCameraInput(_canvas, camera)
  camera.inputs.removeByType("universalcameraKeyboardInput");
  camera.inputs.add(customUniversalCamController)

  modelLoader = new ModelLoaderManager(scene);
  sessionMngr = new SessionManager(camera, scene);
  modelBrowser = new ModelBrowserToolManager();

  dualStateHelper = new DualStateHelper();
  
  annotationDataManager = new AnnotationDataManager();
  annotationDataManager.Init();

  annotationToolManager = new AnnotationToolManager();
  annotationToolManager.Init();
  
  // GUI
  guiManager = new GuiManager(gizmoMngr);
  guiManager.Init(scene);
  //PC camera
  new DesktopCameraSettings(scene)
  DesktopCameraSettings.BindCamera(customUniversalCamController, "universal_camera")
  DesktopCameraSettings.SetActiveCamera("universal_camera")
  DesktopCameraSettings.EnableCameraMovement(false)

  //Setup websocket connection
  const onOpenCallback = function(){
    ModelBrowserToolManager.instance.FetchModelPreviews();
    SessionManager.instance.RegisterToServer()
  }
  const onCloseCallback = function(){
    SessionManager.instance.OnWebsocketDisconnect()
  }

  socketHandler = new SocketHandler();
  socketHandler.StartConnection(onOpenCallback, undefined, onCloseCallback);

  scene.getEngine().onResizeObservable.add(() => {});

  // Wesley: This clears depth but not stencil between rendering groups/passes.
  //         This allows for the highlight layer in group 1 to work properly.
  scene.setRenderingAutoClearDepthStencil(RenderConfig.highlights, true, true, false);

  // ======================= Enable VR =======================

  WebXRMotionControllerManager.PrioritizeOnlineRepository = false;

  // Setup VR using buitl-in BabylonXR support and libs
  xrHelper = await scene.createDefaultXRExperienceAsync({
    floorMeshes: ServerObjectManager.instance?.baseEnvironmentMesh,
  });

  xrSessionManager = xrHelper.baseExperience.sessionManager
  xrSessionManager.onXRFrameObservable.addOnce(()=>{
    xrHelper.baseExperience.camera.position = new Vector3(0, 5, -5);
  });

  xrFeatureManager = xrHelper.baseExperience.featuresManager;

  //init VR manager
  vrMngr = new VRManager();
  vrMngr.Init(scene, xrHelper, xrFeatureManager, xrSessionManager)

  // Build lights
  const hemLight = new HemisphericLight("light", new Vector3(0, 4, 0), scene);
  hemLight.intensity = 3;
  
  return scene;
};

//Used with BabylonJS `onRender` update function called every frame
export const onRender = (scene) =>
{
  ModelBrowserToolManager.instance.GhostModelFollowsCursor(); // ghost mesh follows around
  SessionManager.instance.ReadTrackedCameraTransforms();
  GuiManager.instance.OnRenderUpdate();
};
// export default EditingMode;