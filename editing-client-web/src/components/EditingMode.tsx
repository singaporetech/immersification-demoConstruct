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
  Scene,
  GizmoManager,
  Vector3,
  MeshBuilder,
  SceneLoader,
  StandardMaterial,
  Texture,
  ShadowGenerator,
  PointLight,
  WebXRState,
  UniversalCamera,
  HemisphericLight,
  Ray,
  AbstractMesh,
  Color3,
  PBRMaterial,
  Mesh,
  PointsCloudSystem,
} from "@babylonjs/core";
import { useEffect } from "react";
import SceneComponent from "babylonjs-hook";

//Components to be initialised for BabylonJS
import { GUIManager } from "../lib/babylon-scripts/gui/GuiManager";
import { ModelLoader } from "../lib/babylon-scripts/ModelLoader";
import { PickingManager } from "../lib/babylon-scripts/PickingManager";
import { SocketHandler } from "../lib/babylon-scripts/WebSocketManager";
import { EditingSessionManager } from "../lib/babylon-scripts/EditingSessionManager";
import { ModelBrowser } from "../lib/babylon-scripts/ModelBrowser";
import { CustomUniversalCameraInput } from "../lib/babylon-scripts/camera/CustomUniversalCameraInput";
import { CameraSettings } from "../lib/babylon-scripts/CameraSettings";
import { GizmoSelector } from "../lib/babylon-scripts/GizmoSelector";

//VR components
import { VRManager } from "../lib/babylon-scripts/vr/VRManager";
import { VRTransformToolCom } from "../lib/babylon-scripts/vr/VRTransformToolCom";
import { ServerObjectManager } from "../lib/babylon-scripts/ServerObjectManager";
// import profilesList from "@webxr-input-profiles/registry/dist/profilesList.json";
// import { WebXRDefaultExperience } from "@babylonjs/core/XR";
let _canvas;
let modelLoader;
let gizmoManager;

let guiManager: GUIManager;
let pickingManager;
let socketHandler;
let editingSessionManager;
let modelBrowser;
let gizmoSelector: GizmoSelector | null = null

// VR variables
let xrHelper: any;
let xrSessionManager;
let xrFeatureManager;
let vrMngr: VRManager;

//Helper function to initialize BabylonJS gizmoManager.
function InitGizmoManager(scene) {
  gizmoManager = new GizmoManager(scene);
  gizmoManager.attachableMeshes = [];

  //Enable Gizmo to be able to set updateGizmoRotation
  gizmoManager.positionGizmoEnabled = true;
  gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = false;
  gizmoManager.positionGizmoEnabled = false; //Disable again to hide.

  return gizmoManager;
}

//Initializing the BabylonJS scene.
const onSceneReady = async (scene) => {

  const canvas = scene.getEngine().getRenderingCanvas();
  _canvas = canvas;
  
  pickingManager = new PickingManager();
  pickingManager.Init(scene);

  gizmoManager = InitGizmoManager(scene);
  gizmoSelector = new GizmoSelector(gizmoManager)
  gizmoSelector.Init()

  const camera = new UniversalCamera("universal_camera", new Vector3(0, 5, -20), scene);
  camera.setTarget(Vector3.Zero());
  camera.attachControl(canvas, true);
  
  const customUniversalCamController = new CustomUniversalCameraInput(_canvas, camera)
  camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
  camera.inputs.add(customUniversalCamController)

  modelLoader = new ModelLoader(scene);
  editingSessionManager = new EditingSessionManager(camera, scene);
  modelBrowser = new ModelBrowser();

  // GUI
  guiManager = new GUIManager(gizmoManager);
  guiManager.Init(scene);

  //PC camera
  new CameraSettings(scene)
  CameraSettings.BindCamera(customUniversalCamController, "main_camera")
  CameraSettings.SetActiveCamera("main_camera")
  CameraSettings.EnableCameraMovement(false)

  //Setup websocket connection
  const onOpenCallback = function(){
    ModelBrowser.instance.FetchModelPreviews();
    EditingSessionManager.instance.RegisterToServer()
  }
  const onCloseCallback = function(){
    EditingSessionManager.instance.OnWebsocketDisconnect()
  }
  socketHandler = new SocketHandler();
  socketHandler.StartConnection(onOpenCallback, undefined, onCloseCallback);

  //TESTING ONLY WINDOW FUNCTION. REMOVE FOR RELEASE
  window.onkeyup = function (event) {
    if (event.which === 32) {
      //editingSessionManager.Initialize();
    }
  };
  scene.getEngine().onResizeObservable.add(() => {});

  // ======================= Enable XR =======================

  // const profilesUrl = profilesList;

  // WebXRMotionControllerManager.BaseRepositoryUrl = profilesUrl;

  // // prioritize the local classes (but use online if controller not found)
  // WebXRMotionControllerManager.PrioritizeOnlineRepository = false;
  // // or disable the online repository
  // WebXRMotionControllerManager.UseOnlineRepository = false;

  // VR device variables
  var leftController;
  var rightController;

  // ------ Babylon default XR setup stuff ------
  // Setup VR using buitl-in BabylonXR support and libs
  xrHelper = await scene.createDefaultXRExperienceAsync({
    floorMeshes: ServerObjectManager.instance?.baseEnvironmentMesh,
  });

  xrSessionManager = xrHelper.baseExperience.sessionManager
  xrSessionManager.onXRFrameObservable.addOnce(()=>{
    xrHelper.baseExperience.camera.position = new Vector3(0, 5, -5);
  });

  xrFeatureManager = xrHelper.baseExperience.featuresManager;
  // ------------------------------------

  //------ Create spatal VR menu objects (3D objects), and get the meshes of both VR controllers ------
  xrHelper.input.onControllerAddedObservable.add((controller) => {
    controller.onMotionControllerInitObservable.add((motionController) => {
      if (motionController.handness === 'left')
      {
        var selectorMesh = MeshBuilder.CreateSphere("Selector", { diameter: .15 }, scene);
        selectorMesh.position = new Vector3(0, 10, 0);

        selectorMesh.isVisible = true;
        selectorMesh.setEnabled(false);  

        var redMat = new StandardMaterial("redMat", scene);
        redMat.diffuseColor = Color3.Red();
        selectorMesh.material = redMat;

        leftController = controller;
      }
      else if (motionController.handness === 'right')
      {
        rightController = controller;
      }
    });
  });

  // ------ Create VR manager which trackers VR controller actions 
  vrMngr = new VRManager();
  //Init vr manager and other VR components
  vrMngr.Init(scene, xrHelper, xrFeatureManager, xrSessionManager, leftController, rightController);
  vrMngr.VRToolSelectorCom.Init(scene, leftController, vrMngr);
  vrMngr.VRTransformToolCom.Init(scene, xrHelper, ServerObjectManager.instance?.baseEnvironmentMesh);
  vrMngr.VRModelBrowserToolCom.Init("VR-AssetBrowser_v2", 2, scene); 
  vrMngr.VRMakrerToolCom.Init("VR-MarkerBrowser", 2, scene);

  //------ Disable built-in teleportation and enable free fly ------
  vrMngr.disableTeleportation();
  xrHelper.input.onControllerAddedObservable.add((controller) => {

    controller.onMotionControllerInitObservable.add((motionController) => {
      if (motionController.handness === 'left')
      {
        // ------ VR free fly movement ------
        vrMngr.appendMethodToAxis(() => VRManager.instance?.tryFreelyMovement(),
                                        0,
                                        motionController);
      }
    })
  });

  //------ Map functions and track inputs for controls ------
  // Should be moved to vrMngr.ts later on
  xrHelper.input.onControllerAddedObservable.add((controller) => {

    controller.onMotionControllerInitObservable.add((motionController) => {
      if (motionController.handness === 'left')
      {

        // controller.onMeshLoadedObservable.add((mesh : AbstractMesh) => {
        // });

        //------ Setup controller ------
        vrMngr.setupController(motionController.handness, motionController);
        vrMngr.InitLeftController(controller);

        //------  VR tool selector open menu ------
        vrMngr.appendMethodToButtonState(() => { vrMngr.VRToolSelectorCom.SetupSelector_v2(motionController);
                                          vrMngr.VRToolSelectorCom.OpenMenu();},
                                        4, 
                                        0, 
                                        motionController);

        vrMngr.appendMethodToButtonState(() => vrMngr.VRToolSelectorCom.CloseMenu(),
                                        4, 
                                        1, 
                                        motionController);

        // ------ transform:Move forward/backward ------
        vrMngr.appendMethodToToolAxis(() => VRTransformToolCom.instance?.TryMove(vrMngr.leftStickAxis.y), 
                                        VRTransformToolCom.instance?.toolID,
                                        0,
                                        motionController);

        // ------ transform:scaling ------
        vrMngr.appendMethodToToolAxis(() => VRTransformToolCom.instance?.TryScale(vrMngr.leftStickAxis.x), 
                                        VRTransformToolCom.instance?.toolID,
                                        0,
                                        motionController);
      }
      else if (motionController.handness === 'right')
      {
        // ----- Setup controller -----
        vrMngr.setupController(motionController.handness, motionController);  
        vrMngr.InitRightController(controller);

        // ----- track right controller hit position

        // For now these trigger actions only enable
        // and disable teleportation upon trigger start/end
        // ------ trigger action: start  ------
        vrMngr.appendMethodToButtonState(() => VRManager.getInstance?.startToolAction.call(),
                                        0, 
                                        0, 
                                        motionController);

        // ------ trigger action: end ------
        vrMngr.appendMethodToButtonState(() => VRManager.getInstance?.endToolAction.call(),
                                        0, 
                                        1, 
                                        motionController);

        // ------ transform tool  ------
        //=======================================
        //for grabbing (position and rotation)
        vrMngr.appendMethodToToolButtonState(() => VRTransformToolCom.instance?.TryGrab(/*scene.meshUnderPointer, */motionController, controller), 
                                        VRTransformToolCom.instance?.toolID,
                                        0, 
                                        0, 
                                        motionController);
        // ------ transform:release ------
        vrMngr.appendMethodToToolButtonState(() => VRTransformToolCom.instance?.ReleaseGrab(), 
                                        VRTransformToolCom.instance?.toolID,
                                        0, 
                                        1, 
                                        motionController);

        // ------ transform:Rotate Roll ------
        vrMngr.appendMethodToToolAxis(() => VRTransformToolCom.instance?.TryRotateRoll(vrMngr.rightStickAxis.x), 
                                        VRTransformToolCom.instance?.toolID,
                                        0,
                                        motionController);                       

     // ------ transform:Rotate Pitch ------
     vrMngr.appendMethodToToolAxis(() => VRTransformToolCom.instance?.TryRotatePitch(vrMngr.rightStickAxis.y), 
                                        VRTransformToolCom.instance?.toolID,
                                        0,
                                        motionController);      

         // ------ model browser tool  ------
        //=======================================
         // activated at full button press once only --> Spawn model at pointer location
        vrMngr.appendMethodToToolButtonState(() => vrMngr.VRModelBrowserToolCom.TrySpawnModel(), 
                                      vrMngr.VRModelBrowserToolCom.toolID,
                                      0, 
                                      0,
                                      motionController);

        // ------ marker tool  ------
        //=======================================
        vrMngr.appendMethodToToolButtonState(() => vrMngr.VRMakrerToolCom.TryPerformAction(), 
        vrMngr.VRMakrerToolCom.toolID,
        0, 
        0,
        motionController);
      }
    })
  });
  // ------------------------------------

  // After controller setup enable all basic functions as needed
  // vrMngr.enableTeleportation();
  // ------------------------------------

  // Set an observable state to toggle VR and PC UI on or off when entering of exiting VR -----
  xrHelper.baseExperience.onStateChangedObservable.add((state)=>{
    if(state === WebXRState.ENTERING_XR)
    {
      //Reset all settings
      if(vrMngr.ground !== null)
        vrMngr.addMeshToWalkable(ServerObjectManager.instance?.baseEnvironmentMesh);
      // vrMngr.locomotionMeshes = environmentMeshes;
      // vrMngr.ground = ServerObjectManager.instance?.baseEnvironmentMesh;

      guiManager.SetFlatEditorUIVisibility (false)
      EditingSessionManager.instance.SwitchCamera(VRManager.getInstance?.vrCamera)
      vrMngr.setInVR(true);
    }else if(state === WebXRState.EXITING_XR){
      guiManager.SetFlatEditorUIVisibility (true);
      vrMngr.setInVR(false);
      EditingSessionManager.instance.ResetToPCCamera();
    }
  })
  // ------------------------------------

  // Build lights
  const hemLight = new HemisphericLight("light", new Vector3(0, 4, 0), scene);
  hemLight.intensity = 3;

  return scene;
};

//BabylonJS "Update" function called every frame
const onRender = (scene) =>
{  
  ModelBrowser.instance.GhostModelFollowsCursor(); // ghost mesh follows around
  EditingSessionManager.instance.ReadTrackedCameraTransforms();
  guiManager.OnRenderUpdate();
  //markerManager._Update();
};

const EditingMode = () => {
  useEffect(()=>{
    return()=>{
        SocketHandler.instance.CloseConnection();
        guiManager.Uninit();
        gizmoSelector?.Uninit();
    }
}, [])


  return (
    <SceneComponent
      antialias
      onSceneReady={onSceneReady}
      onRender={onRender}
      className="h-screen w-screen"
    />
  );
};
export default EditingMode;
