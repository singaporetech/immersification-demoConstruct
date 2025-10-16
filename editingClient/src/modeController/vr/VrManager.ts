import { AbstractMesh, Ray, Scene, Vector3, WebXRFeatureName, WebXRState, Vector2, WebXRCamera, Axis } from "@babylonjs/core";
// import simpleDelegate from "../utils/delegates/simpleDelegate";
import { vrModelBrowserToolManager } from "../../modelBrowserTool/vr/vrModelBrowserToolManager";
import { ServerObjectManager } from "../../roomController/ServerObjectManager";
import { GuiManager } from "../../gui/desktop/GuiManager";
import { VrMarkerToolManager } from "../../markerTool/vr/vrMarkerToolManager";
import { VrTransformToolManager } from "../../transformTool/vr/VrTransformToolManager";
import { ToolActionEventData, EventListener } from "../../utilities/delegates/EventListener";
import { VrToolSelectorMenuController } from "../../gui/vr/VrToolSelectorMenuController";
import { SessionManager } from "../../roomController/SessionManager";
import { VRMeasuringToolManager } from "../../measuringTool/vr/VRMeasuringToolManager";
import { AssetConfig, RenderConfig } from "../../config";
import VRAnnotationActionsMenuController from "../../gui/vr/VRAnnotationActionsMenuController";
import VRAnnotationViewerMenuController from "../../gui/vr/VRAnnotationViewerMenuController";
import { ToolState } from "../../utilities/enums/enums";

/**
 * @class VRManager
 * A class that controls and manages init/uninit of all the VR tools and other scripts.
 */
export class VrManager 
{
    //Instance
    static instance: VrManager | null = null;

    public scene: Scene;

    // built-in VR helper and manager inits
    public xrHelper: any;
    public xrFeatureMngr: any;
    public xrSessionMngr: any;

    // Menus
    public vrToolSelectorMenuCtrl?: VrToolSelectorMenuController;

    public vrTransformToolMngr?: VrTransformToolManager;
    public vrAssetBrowserToolMngr?: vrModelBrowserToolManager;
    public vrMarkerToolMngr?: VrMarkerToolManager;
    public vrMeasuringToolMngr?: VRMeasuringToolManager;
    
    public vrAnnotationActionsMenuCtrl?: VRAnnotationActionsMenuController;
    public vrAnnotationViewerMenuCtrl?: VRAnnotationViewerMenuController;

    // VR variables for tracking user state
    /**
     * Defines if the user is in VR.
     */
    public _inVR: boolean = false;
    /**
     * Defines if the user has selected a tool.
     */
    public _hasToolSelected = false;
    /**
     * Defines if the user is in a state of perofming a tool action.
     */
    public _isPerformingToolAction = false;
    public _inMenu = false;

    // public selectedToolIndex = 1; // 0 = none. 1 = transform. 2 = object 3 = markers
    public startToolAction?: EventListener<ToolActionEventData>;
    public endToolAction?: EventListener<ToolActionEventData>;

    // Movement variables
    public moveSpeed = 35;
    public moveSpeedInterpolationFactor = 0.1; //the smoothing factor for moveSpeed

    public ground: any; 
    // An array of meshes to be used with VR locomotion methods that may require contact with a surface (E.g. telportation, walk-in-place)
    public locomotionMeshes: AbstractMesh[] = [];

    // VR user control objects
    public vrCamera: WebXRCamera;
    public leftController:  any | null;
    public rightController:  any | null;
    
    // Left controller input tracking variables
    public leftTriggerActive = false;

    public leftGripActive = false;

    public leftClickActive = false;
    /**
     * InstantActive only tracks and updates moment the button or joystick the moment it  pressed or released.
     */
    public leftStickInstantActive = false;
    /**
     * Tracks if the left was already activated
     */
    public leftStickFrameActivated = false;

    public leftStickActive = false;
    public leftStickAxis = new Vector2(0,0);

    public leftButtonOneActive = false;
    public leftButtonTwoActive = false;
    public leftControllerRaycast : Ray | undefined;
    public leftControllerRayHitInfo: any;
    // Right controller input tracking variables
    public rightTriggerActive = false;

    public rightGripActive = false;
    
    public rightClickActive = false;
    /**
     * InstantActive only tracks and updates moment the button or joystick the moment it  pressed or released.
     */
    public rightStickInstantActive = false;
    /**
     * Tracks if the left was already activated
     */
    public rightStickFrameActivated = false;

    public rightStickActive = false;
    public rightStickAxis = new Vector2(0,0);

    public rightButtonOneActive = false;
    public rightButtonTwoActive = false;
    public rightControllerRaycast : Ray | undefined;
    public rightControllerRayHitInfo: any;

    public Update()
    {
        if(!this.inVR)
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

    public Init(scene: Scene, xrHelper: any, xrFeatureManager: any, xrSessionManager: any) //, leftController: any, rightController: any)
    {
        VrManager.instance = this;
        
        this.scene = scene;
        this._inVR = false;
        this.xrHelper = xrHelper;
        this.xrFeatureMngr = xrFeatureManager;
        this.xrSessionMngr = xrSessionManager;

        this.vrCamera = this.xrHelper.baseExperience.camera

        this.vrToolSelectorMenuCtrl = new VrToolSelectorMenuController();
        this.vrTransformToolMngr = new VrTransformToolManager();
        this.vrAssetBrowserToolMngr = new vrModelBrowserToolManager();
        this.vrMarkerToolMngr = new VrMarkerToolManager();
        this.vrMeasuringToolMngr = new VRMeasuringToolManager();

        this.vrAnnotationActionsMenuCtrl = new VRAnnotationActionsMenuController();
        this.vrAnnotationViewerMenuCtrl = new VRAnnotationViewerMenuController();

        // this.leftController = leftController;
        // this.rightController = rightController;

        this.startToolAction = new EventListener<ToolActionEventData>;
        this.endToolAction = new EventListener<ToolActionEventData>;
        this.startToolAction.Subscribe(() => { this.isPerformingToolAction = true });
        this.endToolAction.Subscribe(() => { this.isPerformingToolAction = false });
        // this.startToolAction.Invoke(new ToolActionEventData());

        this.vrToolSelectorMenuCtrl.Init(this.scene, this.leftController, this);
        this.vrTransformToolMngr.Init(this.scene, this.xrHelper, ServerObjectManager.instance?.baseEnvironmentMesh);
        this.vrAssetBrowserToolMngr.init(AssetConfig.VRmodelBrowserUI, 1, 1456, 800, new Vector3(0,5,0),this.scene); 
        this.vrMarkerToolMngr.init(AssetConfig.VRmarkerUI, 1, 800, 900, new Vector3(0,0,0), this.scene);
        this.vrMeasuringToolMngr.Init(this.scene);
        
        this.vrAnnotationActionsMenuCtrl.Init(this.scene);
        this.vrAnnotationViewerMenuCtrl.Init(this.scene);

        //------ Disable built-in teleportation and enable free fly ------
        this.disableTeleportation();

        // ================================= These will only be called when user enters VR =================================
        // //------ Create spatal VR menu objects (3D objects), and get the meshes of both VR controllers ------
        // this.xrHelper.input.onControllerAddedObservable.add((controller) => {
        //     controller.onMotionControllerInitObservable.add((motionController) => {
        //     if (motionController.handness === 'left')
        //     {
        //         this.leftController = controller;
        // //         this.vrToolSelectorMenuCtrl.UpdateAssignedController(this.leftController);
        //     }
        //     else if (motionController.handness === 'right')
        //     {
        //         this.rightController = controller;
        //     }
        //     });
        // });  

        //------ Map functions and track inputs for controls ------
        this.xrHelper.input.onControllerAddedObservable.add((controller) => {
            controller.onMotionControllerInitObservable.add((motionController) => {
                if (motionController.handness === 'left')
                {
                    //------ Setup controller ------
                    // Set up controller to track user input actions
                    this.updateLeftController(controller);
                    this.vrToolSelectorMenuCtrl.UpdateAssignedController(motionController);

                    this.setupController(motionController.handness, motionController);

                    // ------ VR free fly movement ------
                    this.appendMethodToAxis(() => VrManager.instance?.tryFreeFlyMovement(),
                                                    0,
                                                    motionController);

                    // controller.onMeshLoadedObservable.add((mesh : AbstractMesh) => {
                    // });

                    // //  VR tool selector open menu - works
                    // this.appendMethodToButtonState(() => { this.vrToolSelectorMenuCtrl?.SetupSelector_v2(motionController);
                    //                                     this.vrToolSelectorMenuCtrl?.OpenMenu();},
                    //                                 4, 
                    //                                 0, 
                    //                                 motionController);
                    // // close tools menu - works
                    // this.appendMethodToButtonState(() => this.vrToolSelectorMenuCtrl?.CloseMenu(),
                    //                                 4, 
                    //                                 1, 
                    //                                 motionController);

                    //  VR tool selector open menu
                    this.appendMethodToButtonState(() => { 
                            if(this.vrToolSelectorMenuCtrl?.toolState == ToolState.inactive)
                            {
                                // var pos = new Vector3(0, 0, 0);
                                // var forwardDirection = this.scene.activeCamera.getDirection(Axis.Z);
                                // let forwardSpacing = AssetConfig.VRGUIDistanceFromCamera;
                                // pos = pos.copyFrom(this.scene.activeCamera.globalPosition).add(forwardDirection.scale(forwardSpacing));    
                                this.vrToolSelectorMenuCtrl?.OpenMenu();
                            }
                            else if(this.vrToolSelectorMenuCtrl?.toolState == ToolState.active)
                            {
                                this.vrToolSelectorMenuCtrl?.StartActiveTool()
                                this.vrToolSelectorMenuCtrl?.CloseMenu()
                            }
                        },
                        4, 
                        0, 
                        motionController);
                        
                    // vr tool selector joystick controls
                    this.appendMethodToAxis(() => {
                        if(this.leftStickInstantActive)
                        {
                            if(this.vrToolSelectorMenuCtrl?.toolState === ToolState.active)
                            {
                                // this.leftStickActive = false;
                                let scaleDir = this.leftStickAxis.x >= 0 ? 1 : -1;
                                this.vrToolSelectorMenuCtrl.UpdateSelectedTool(scaleDir);
                            }                            
                            this.leftStickInstantActive = false;
                        }        
                    },
                    0,
                    motionController);

                    // transform tool: Move forward/backward 
                    this.appendMethodToToolAxis(() => VrTransformToolManager.instance?.TryMove(this.leftStickAxis.y), 
                                                        VrTransformToolManager.instance?.toolID,
                                                    0,
                                                    motionController);

                    // transform tool: scaling
                    this.appendMethodToToolAxis(() => VrTransformToolManager.instance?.TryScale(this.leftStickAxis.x), 
                                                        VrTransformToolManager.instance?.toolID,
                                                    0,
                                                    motionController);
                }
                else if (motionController.handness === 'right')
                {
                    // Setup controller
                    this.updateRightController(controller);
                    // Set up controller to track user input actions
                    this.setupController(motionController.handness, motionController);  

                    // For now these trigger actions only enable
                    // and disable teleportation upon trigger start/end
                    // action tracking trigger action: start 
                    this.appendMethodToButtonState(() => {VrManager.getInstance?.startToolAction?.Invoke(new ToolActionEventData())
                                                        },
                                                    0, 
                                                    0, 
                                                    motionController);

                    // action tracking trigger action: end
                    this.appendMethodToButtonState(() => { VrManager.getInstance?.endToolAction?.Invoke(new ToolActionEventData())
                                                        },
                                                    0, 
                                                    1, 
                                                    motionController);

                    // transform tool: grabbing object
                    this.appendMethodToToolButtonState(() => VrTransformToolManager.instance?.TryGrab(motionController, controller), 
                                                    VrTransformToolManager.instance?.toolID,
                                                    0, 
                                                    0, 
                                                    motionController);

                    // transform tool: release grabbed
                    this.appendMethodToToolButtonState(() => VrTransformToolManager.instance?.ReleaseGrab(), 
                                                    VrTransformToolManager.instance?.toolID,
                                                    0, 
                                                    1, 
                                                    motionController);

                    // transform: Rotate Roll
                    this.appendMethodToToolAxis(() => VrTransformToolManager.instance?.TryRotateRoll(this.rightStickAxis.x), 
                                                    VrTransformToolManager.instance?.toolID,
                                                    0,
                                                    motionController);                       

                    // transform: Rotate Pitch
                    this.appendMethodToToolAxis(() => VrTransformToolManager.instance?.TryRotatePitch(this.rightStickAxis.y), 
                                                        VrTransformToolManager.instance?.toolID,
                                                        0,
                                                        motionController);      

                    // asset borwser tool: place object
                    // activated at full button press once only --> Spawn model at pointer location
                    this.appendMethodToToolButtonState(() => this.vrAssetBrowserToolMngr?.TrySpawnModel(), 
                                                this.vrAssetBrowserToolMngr?.toolID as number,
                                                0, 
                                                0,
                                                motionController);

                    // marker tool: place marker
                    //=======================================
                    this.appendMethodToToolButtonState(() => this.vrMarkerToolMngr?.tryPerformAction(), 
                                                this.vrMarkerToolMngr?.toolID as number,
                                                0, 
                                                0,
                                                motionController);

                    // measuring tool: place start and end points
                    this.appendMethodToToolButtonState(() => this.vrMeasuringToolMngr?.startNewMeasurement(), 
                                                this.vrMeasuringToolMngr?.toolID as number,
                                                0, 
                                                0,
                                                motionController);

                    // annotation tool: annotation viewer
                    this.appendMethodToButtonState(() => {
                        if(!VRAnnotationViewerMenuController.instance.viewerPanelObject.isVisible)
                        {
                            var pos = new Vector3(0, 0, 0);
                            var forwardDirection = this.scene.activeCamera.getDirection(Axis.Z);
                            let forwardSpacing = AssetConfig.VRGUIDistanceFromCamera;
                            pos = pos.copyFrom(this.scene.activeCamera.globalPosition).add(forwardDirection.scale(forwardSpacing));    
                            VRAnnotationViewerMenuController.instance.SetViewerPoisiton(pos);
                            VRAnnotationViewerMenuController.instance.OpenViewerAction();
                        }
                        else
                        {
                            VRAnnotationViewerMenuController.instance.CloseViewerAction()
                        }
                },
                4, 
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
        this.xrHelper.baseExperience.onStateChangedObservable.add((state)=>{
            if(state === WebXRState.ENTERING_XR)
            {
                //Reset all settings
                if(this.ground !== null)
                    this.addMeshToWalkable(ServerObjectManager.instance?.baseEnvironmentMesh);

                GuiManager.instance.SetFlatEditorUIVisibility(false)
                SessionManager.instance.SwitchCamera(VrManager.getInstance?.vrCamera)
                this.inVR = true;
            } 
            else if(state === WebXRState.EXITING_XR)
            {
                GuiManager.instance.SetFlatEditorUIVisibility (true);
                this.inVR = false;
                SessionManager.instance.ResetToPCCamera();
            }

            
            // //Broadcast to server I have  changed device input, so other users can render my avatar as whatever device input i am using
            // if (this.inVR == true)
            // {
            //     //Something like that
            //     //BroadcastToServerUserStateChange(
            //         // deviceInputType.vr
            //         // ServerObject_Manager.instance.selfUserId)
            // }
            // else
            // {
            //     //Something like that
            //     //BroadcastToServerUserStateChange(
            //         // deviceInputType.pc
            //         // ServerObject_Manager.instance.selfUserId)
            // }
        })

        this.scene.registerBeforeRender( () =>
        {
            this.Update();
        });
    }

    public UpdateAssignedController(newAssignedController: any)
    {
        

    }
    // ========================== General variables get and setter ==========================

    public static get getInstance()
    {
        return VrManager.instance;
    }

    public set isPerformingToolAction(bool: boolean)
    {
        this._isPerformingToolAction = bool;
    } 

    public get isPerformingToolAction()
    {
        return this._isPerformingToolAction;
    }

    public set hasToolSelected(bool: boolean)
    {
        this._hasToolSelected = bool;
    } 

    public get hasToolSelected()
    {
        return this._hasToolSelected;
    }

    public set inVR(bool: boolean)
    {
        this._inVR = bool;
    }

    public get inVR()
    {
        return this._inVR;
    }

    // ========================== Controller methods ==========================

    public updateLeftController(leftController: any)
    {
        this.leftController = leftController;
    }

    public updateRightController(rightController: any)
    {
        this.rightController = rightController;
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

        // grip trigger
        let gripCom = motionController.getComponent(xr_ids[1]);
        this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "GripActive", gripCom.pressed),
                                    1,
                                    4,
                                    motionController);

        // Get joystick 
        let thumbstickComponent = motionController.getComponent(xr_ids[2]);//xr-standard-thumbstick
        this.appendMethodToButtonState(() => this.UpdateBooleanState(this, appendSide + "ClickActive", thumbstickComponent.pressed),
                                    2,
                                    4,
                                    motionController);
        thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                const axisBool = (axes.x > .01 || axes.x < -.01) ? true : false;

                this.UpdateBooleanState(this, appendSide + "StickActive", axisBool)
                this.UpdateVector2State(this, appendSide + "StickAxis", axes);

                if(axisBool)
                {
                    const getFrameTriggersAlreadyActivated = this.GetBooleanState(this, appendSide + "StickFrameActivated")
                    //only update if not triggered already
                    if(!getFrameTriggersAlreadyActivated)
                    {
                        this.UpdateBooleanState(this, appendSide + "StickInstantActive", axisBool)
                    }
                    // else
                    // {

                    //     // const aleadyactivedBool = this.GetBooleanState(this, appendSide + "StickInstantActive");   
                    //     // if(!aleadyactivedBool)
                    //     // {
                    //     // }
                    //     // else if(!axisBool && aleadyactivedBool)
                    //     // {
                    //     //     this.UpdateBooleanState(this, appendSide + "StickInstantActive", false)
                    //     // }    
                    // }
                }
                else
                {
                    this.UpdateBooleanState(this, appendSide + "StickInstantActive", axisBool)
                }
                this.UpdateBooleanState(this, appendSide + "StickFrameActivated", axisBool)
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

    private GetBooleanState(obj: any, varName: string)
    {
        return obj[varName];
    }

    /**
     * Appends a method "method" which will only be called when 
     * a specific button "buttonIndex" reaches a specific state "atState", 
     * while VRToolSelectorUI.instance.selectedToolIndex number equals to "toolID",
     * for the assigned left/right controller "montionController"
     * atState -> 0 = when fully pressed , 1 = when fully released, 2 = when holding, 3 = when inactive, 4 = anytime state changes
     * Only 0, 1, and 4 working for now
     * @param method 
     * @param toolID 
     * @param buttonIndex 
     * @param atState 
     * @param motionController 
     */
    public appendMethodToToolButtonState(method: () => void, toolID: number, buttonIndex: number, atState: number, motionController: any)
    {
        const xr_ids = motionController.getComponentIds();
        let buttCom = motionController.getComponent(xr_ids[buttonIndex]);// button ID

        if(atState === 0)
        {
            buttCom.onButtonStateChangedObservable.add(() =>
            {
                let button = buttCom;
                if(button.value == 1 && VrToolSelectorMenuController.instance.GetActiveToolIndex() === toolID)
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
                if(button.value == 0 && VrToolSelectorMenuController.instance.GetActiveToolIndex() === toolID)
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
                if(VrToolSelectorMenuController.instance.activeToolIndex  === toolID)
                    method();
            })
        }
    }

    /**
     * Appends a method "method" which will only be called when
     * a specific button "buttonIndex" reaches a specific state "atState",
     * for the assigned  left/right controller "montionController".
     * atState -> 
     * 0 = when pressed
     * 1 = when released
     * 2 = when holding
     * 3 = when inactive
     * 4 = anytime state changes
     * Only 0, 1, and 4 working for now
     * @param method 
     * @param buttonIndex 
     * @param atState 
     * @param motionController 
     */
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

    /**
     * Axis state not working right now. Just default to on value change do something
     * @param method 
     * @param toolID 
     * @param atState 
     * @param motionController 
     */
    public appendMethodToToolAxis(method: () => void, toolID: number, atState: number, motionController: any)
    {
        const xr_ids = motionController.getComponentIds();
        let buttCom: any;

        buttCom = motionController.getComponent(xr_ids[2]);//xr-standard-thumbstick

        buttCom.onAxisValueChangedObservable.add((axes) =>
        {
            // let button = buttCom;
            if (VrToolSelectorMenuController.instance.activeToolIndex === toolID)
                method();
        })   
    }

    /**
     * Axis state not working right now. Just default to on value change do something
     * @param method 
     * @param atState 
     * @param motionController 
     */
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
            return hit;
        else
            return null;
    }

    // ========================== VR locomotion methods ==========================

    // Teleport
    public enableTeleportation()
    {
        this.xrHelper.teleportation = this.xrFeatureMngr.enableFeature(WebXRFeatureName.TELEPORTATION, "stable" /* or latest */, {
            xrInput: this.xrHelper.input,
            floorMeshes: [this.ground], //this.walkableMeshes,
            renderingGroupId: RenderConfig.highlights,
            });
    }

    public disableTeleportation()
    {
        this.xrFeatureMngr.disableFeature(WebXRFeatureName.TELEPORTATION);
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

    // Simple freefly

    public tryFreeFlyMovement()
    {
        if(this.isPerformingToolAction || VrToolSelectorMenuController.instance.toolState == ToolState.active) //TODO: quick fix
            return;
        this.doFreeflyMovement(this.leftStickAxis);
    }

    public doFreeflyMovement(inputVector: Vector2)
    {
        var engine = this.scene.getEngine();
        var deltaTime = engine.getDeltaTime() / 1000; 

        var forward = this.vrCamera.getDirection(Axis.Z);
        var right = this.vrCamera.getDirection(Axis.X);
        var velocityVector = forward.scale(-inputVector.y).add(right.scale(inputVector.x));
        
        velocityVector.scaleInPlace(this.moveSpeed * deltaTime);        
        var moveToPos = this.vrCamera.position.add(velocityVector);

        this.vrCamera.position = Vector3.Lerp(this.vrCamera.position, moveToPos, this.moveSpeedInterpolationFactor);
    }

    // ========================== Tool controller ==========================

    public AddMethodToStartToolAction(method: () => void)
    {
        console.log("Added a method to start tool delegate action");
        this.startToolAction.Subscribe(method);
    }

    public AddMethodToEndToolAction(method: () => void)
    {
        console.log("Added a method to end tool delegate action");
        this.startToolAction.Subscribe(method);
    }

    public ClearStartToolAction()
    {
        this.startToolAction.Clear(1);
    }

    public ClearEndToolAction()
    {
        this.endToolAction.Clear(1);
    }
}