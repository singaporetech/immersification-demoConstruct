import { Vector2 } from "babylonjs";
import { VRToolSelectorUI as VRToolSelectorCom } from "./VRToolSelectorCom";
import { AbstractMesh, Ray, Scene, Vector3, WebXRFeatureName } from "@babylonjs/core";
import simpleDelegate from "../../utils/simpleDelegate";
import { VRModelBrowserToolCom } from "./VRModelBrowserToolCom";
import { VRTransformToolCom } from "./VRTransformToolCom";
import { vrMarkerToolCom } from "./vrMarkerToolCom";

/**
 * @class VRManager
 * A class that controls and manages init/uninit of all the VR tools and other scripts.
 */
export class VRManager {

//Instance
public static instance: VRManager | null = null;

// Scene and basic ferences
public scene;

public ground: any; 
// An array of meshes to be used with VR locomotion methods that may require contact with a surface (E.g. telportation, walk-in-place)
public locomotionMeshes: AbstractMesh[] = [];

// VR components references
public inVR: boolean;
public xrHelper: any;
public xrFeatureManager: any;
public xrSessionManager: any;
public VRToolSelectorCom: VRToolSelectorCom;
public VRTransformToolCom: VRTransformToolCom;
public VRModelBrowserToolCom: VRModelBrowserToolCom;
public VRMakrerToolCom: vrMarkerToolCom;
public vrCamera;

// VR interaction, tools, delegates
public inTool = false;
public inMenu = false;
// public selectedToolIndex = 1; // 0 = none. 1 = transform. 2 = object 3 = markers
public startToolAction: simpleDelegate;
public endToolAction: simpleDelegate;

// Controller objects
public leftController:  any | null;
public rightController:  any | null;
// public leftMotionController:  any | null;
// public RightMotionController:  any | null;
// Movement variables
public moveSpeed = 35;
public moveSpeedInterpolationFactor = 0.1; //the smoothing factor for moveSpeed

// Left controller input tracking variables
public leftTriggerActive = false;
public leftGripActive = false;
public leftStickActive = false;
public leftStickAxis = new Vector2(0,0);
public leftButtonOneActive = false;
public leftButtonTwoActive = false;
public leftControllerRaycast : Ray | undefined;
public leftControllerRayHitInfo: any;

// Right controller input tracking variables
public rightTriggerActive = false;
public rightGripActive = false;
public rightStickActive = false;
public rightStickAxis = new Vector2(0,0);
public rightButtonOneActive = false;
public rightButtonTwoActive = false;
public rightControllerRaycast : Ray | undefined;
public rightControllerRayHitInfo: any;

public Update()
{
    if(!this.getinVR())
        return;
        
    if(this.leftController !== undefined && this.leftController !== null)
    {
        this.leftControllerRaycast = this.getControllerRay(this.leftController);
        this.leftControllerRayHitInfo = this.Raycast(this.leftControllerRaycast);
    }
    
    if(this.rightController !== undefined && this.rightController !== null)
    {
        this.rightControllerRaycast = this.getControllerRay(this.rightController);
        this.rightControllerRayHitInfo = this.Raycast(this.rightControllerRaycast);
    }
}

// ========================== General init and resets ==========================

public Init(scene: Scene, xrHelper: any, xrFeatureManager: any, xrSessionManager: any, leftController: any, rightController: any)
{
    VRManager.instance = this;
    
    this.scene = scene;
    this.inVR = false;
    this.xrHelper = xrHelper;
    this.xrFeatureManager = xrFeatureManager;
    this.xrSessionManager = xrSessionManager;

    this.vrCamera = this.xrHelper.baseExperience.camera

    this.VRToolSelectorCom = new VRToolSelectorCom();
    this.VRTransformToolCom = new VRTransformToolCom();
    this.VRModelBrowserToolCom = new VRModelBrowserToolCom();
    this.VRMakrerToolCom = new vrMarkerToolCom();

    this.leftController = leftController;
    this.rightController = rightController;

    this.startToolAction = new simpleDelegate();
    this.endToolAction = new simpleDelegate();
    // this.startToolAction.add(() => this.disableTeleportation());
    // this.endToolAction.add(() => this.enableTeleportation());
    this.startToolAction.add(() => this.setInTool(true));
    this.endToolAction.add(() => this.setInTool(false));

    this.scene.registerBeforeRender( () =>
    {
        this.Update();
    });
}

public InitLeftController(leftController: any)
{
    this.leftController = leftController;
}

public InitRightController(rightController: any)
{
    this.rightController = rightController;
}

// ========================== General variables get and setter ==========================

public static get getInstance()
{
    return VRManager.instance;
}

public setInTool(bool: boolean)
{
    this.inTool = bool;
}

public getInTool()
{
    return this.inTool;
}

public setInVR(bool: boolean)
{
    this.inVR = bool;
}

public getinVR()
{
    return this.inVR;
}

// ========================== Controller methods ==========================

private UpdateBooleanState(obj: any, varName: string, state: boolean)
{
    if(obj[varName] == state)
        return;
    obj[varName] = state;
}

private UpdateVector2State(obj: any, varName: string, state: Vector2)
{
    obj[varName] = state;
}

public setupController(appendSide : string, motionController: any)
{
    const xr_ids = motionController.getComponentIds();

    // Get trigger when fully pressed
    let triggerComponent = motionController.getComponent(xr_ids[0]);//xr-standard-trigger   
    this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "TriggerActive", triggerComponent.pressed),
                                0,
                                0,
                                motionController);
    // Get trigger when fully released
    this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "TriggerActive", triggerComponent.pressed),
                                0,
                                1,
                                motionController);
    // triggerComponent.onButtonStateChangedObservable.add(() =>
    // {
    //     let button = triggerComponent;
    //     this.UpdateBooleanState(this, appendSide + "TriggerActive", button.pressed);            
    // })

    // Get (a) grip        
    let gripCom = motionController.getComponent(xr_ids[1]);
    this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "GripActive", gripCom.pressed),
                                1,
                                4,
                                motionController);
    // gripCom.onButtonStateChangedObservable.add(() =>
    // {
    //     let button = gripCom;
    //     this.UpdateBooleanState(this, appendSide + "GripActive", button.pressed);
    // })

    // Get joystick 
    let thumbstickComponent = motionController.getComponent(xr_ids[2]);//xr-standard-thumbstick
    this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "StickActive", thumbstickComponent.pressed),
                                2,
                                4,
                                motionController);
    thumbstickComponent.onAxisValueChangedObservable.add((axes) =>
    {
        this.UpdateVector2State(this, appendSide + "StickAxis", axes);
    })   
        
    // Get button 1      
    let buttonOneCom = motionController.getComponent(xr_ids[3]);    
    this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "ButtonOneActive", buttonOneCom.pressed),
                                3,
                                4,
                                motionController);    
    // buttonOneCom.onButtonStateChangedObservable.add(() =>
    // {
    //     let button = buttonOneCom;
    //     this.UpdateBooleanState(this, appendSide + "ButtonOneActive", button.pressed);
    // })

    // Get button 2
    
    let buttonTwoCom = motionController.getComponent(xr_ids[4]);  
    this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "ButtonTwoActive", buttonTwoCom.pressed),
                                4,
                                4,
                                motionController);             
    // buttonTwoCom.onButtonStateChangedObservable.add(() =>
    // {
    //     let button = buttonTwoCom;
    //     this.UpdateBooleanState(this, appendSide + "ButtonTwoActive", button.pressed);
    // })
    // {
    //     this.UpdateVector2State(this, appendSide + "StickAxis", axes);

    // });
    // thumbstickComponent.onButtonStateChangedObservable.add(() =>
    // {
    //     let button = thumbstickComponent;

    //     this.UpdateBooleanState(this, appendSide + "StickActive", button.pressed)
    // });
}

/// Appends a method "method" which will only be called when
/// a specific button "buttonIndex" reaches a specific state "atState", 
/// while VRToolSelectorUI.instance.selectedToolIndex number equals to "toolID",
/// for the assigned left/right controller "montionController"
// atState -> 0 = when fully pressed , 1 = when fully released, 2 = when holding, 3 = when inactive, 4 = anytime state changes
// Only 0, 1, and 4 working for now
public appendMethodToToolButtonState(method: () => void, toolID: number, buttonIndex: number, atState: number, motionController: any)
{
    const xr_ids = motionController.getComponentIds();
    let buttCom = motionController.getComponent(xr_ids[buttonIndex]);// button ID

    if(atState === 0)
    {
        buttCom.onButtonStateChangedObservable.add(() =>
        {
            let button = buttCom;
            if(button.value == 1 && VRToolSelectorCom.instance.GetActiveToolIndex() === toolID)
            {
                method();
            }
        })
    }
    else if(atState === 1)
    {
        buttCom.onButtonStateChangedObservable.add(() =>
        {
            let button = buttCom;
            if(button.value == 0 && VRToolSelectorCom.instance.GetActiveToolIndex() === toolID)
            {
                method();
            }
        })
    }
    // else if(atState === 2)
    // {
    //     buttCom.onButtonStateChangedObservable.add(() =>
    //     {
    //     })
    // }
    // else if(atState === 3)
    // {
    //     buttCom.onButtonStateChangedObservable.add(() =>
    //     {
    //     })
    // }
    else if(atState === 4)
    {
        buttCom.onButtonStateChangedObservable.add(() =>
        {
            if(VRToolSelectorCom.instance.selectedToolIndex  === toolID)
                method();
        })
    }
}

/// Appends a method "method" which will only be called when
/// a specific button "buttonIndex" reaches a specific state "atState",
/// for the assigned  left/right controller "montionController".
// atState -> 0 = when pressed , 1 = when released, 2 = when holding, 3 = when inactive, 4 = anytime state changes
// Only 0, 1, and 4 working for now
public appendMethodToButtonState(method: () => void, buttonIndex: number, atState: number, motionController: any)
{
    const xr_ids = motionController.getComponentIds();
    let buttCom = motionController.getComponent(xr_ids[buttonIndex]);// button ID

    //add to state
    if(atState === 0)
    {
        buttCom.onButtonStateChangedObservable.add(() =>
        {
            let button = buttCom;
            if(/*button.pressed*/ button.value === 1)
            {
                method();
            }
        })
    }
    else if(atState === 1)
    {
        buttCom.onButtonStateChangedObservable.add(() =>
        {
            let button = buttCom;
            if(button.value === 0)
            {
                method();
            }
        })
    }
    // else if(atState === 2)
    // {
    //     buttCom.onButtonStateChangedObservable.add(() =>
    //     {
    //     })
    // }
    // else if(atState === 3)
    // {
    //     buttCom.onButtonStateChangedObservable.add(() =>
    //     {
    //     })
    // }
    else if(atState === 4)
    {
        buttCom.onButtonStateChangedObservable.add(() =>
        {
            method();
        })
    }
}

//Axis state not working right now. Just default to on value change do something
public appendMethodToToolAxis(method: () => void, toolID: number, atState: number, motionController: any)
{
    const xr_ids = motionController.getComponentIds();
    let buttCom: any;

    buttCom = motionController.getComponent(xr_ids[2]);//xr-standard-thumbstick

    buttCom.onAxisValueChangedObservable.add((axes) =>
    {
        // let button = buttCom;
        if (VRToolSelectorCom.instance.selectedToolIndex === toolID)
            method();
    })   
}

//Axis state not working right now. Just default to on value change do something
public appendMethodToAxis(method: () => void, atState: number, motionController: any)
{
    const xr_ids = motionController.getComponentIds();
    let buttCom: any;

    buttCom = motionController.getComponent(xr_ids[2]);//xr-standard-thumbstick

    buttCom.onAxisValueChangedObservable.add((axes) =>
    {
        method();
    })   
}

private getControllerRay(controller: any)
{
    const ray = new Ray(new Vector3(), new Vector3());
    controller.getWorldPointerRayToRef(ray);
    return ray;
}

private Raycast(ray: Ray)
{
    const hit = this.scene.pickWithRay(ray);
    
    if (hit && hit.hit)
    {
        return hit;
    }
    else
    {
        return null;
    }
}

// ========================== VR locomotion methods ==========================

// Teleport

public enableTeleportation()
{
    this.xrHelper.teleportation = this.xrFeatureManager.enableFeature(WebXRFeatureName.TELEPORTATION, "stable" /* or latest */, {
        xrInput: this.xrHelper.input,
        floorMeshes: [this.ground], //this.walkableMeshes,
        renderingGroupId: 1,
        });
}

public disableTeleportation()
{
    this.xrFeatureManager.disableFeature(WebXRFeatureName.TELEPORTATION);
}

public addMeshToWalkable(mesh: any)
{
    this.ground = mesh;
    // Check if the mesh is not already in the array
    if (this.locomotionMeshes.indexOf(mesh) === -1)
    {
        // Add the mesh to the array
        this.locomotionMeshes.push(mesh);
    }
}

public removeMeshFromWalkable(mesh: any)
    {
    // Find the index of the mesh in the array
    const index = this.locomotionMeshes.indexOf(mesh);

    // Check if the mesh is in the array
    if (index !== -1)
    {
        // Remove the mesh from the array
        this.locomotionMeshes.splice(index, 1);
    }
}

public ToggleUI(isVisible: boolean)
{
    
}

// Simple flying

public tryFreelyMovement()
{
    if(this.getInTool())
        return;
    this.doFreeflyMovement(this.leftStickAxis);
}

public doFreeflyMovement(inputVector: Vector2)
{
    var engine = this.scene.getEngine();
    var deltaTime = engine.getDeltaTime() / 1000; 

    var forward = this.vrCamera.getDirection(BABYLON.Axis.Z);
    var right = this.vrCamera.getDirection(BABYLON.Axis.X);
    var velocityVector = forward.scale(-inputVector.y).add(right.scale(inputVector.x));
    
    velocityVector.scaleInPlace(this.moveSpeed * deltaTime);        
    var moveToPos = this.vrCamera.position.add(velocityVector);

    this.vrCamera.position = Vector3.Lerp(this.vrCamera.position, moveToPos, this.moveSpeedInterpolationFactor);
}
}