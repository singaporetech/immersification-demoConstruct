import {AdvancedDynamicTexture, Control, Image, Rectangle, TextBlock} from "@babylonjs/gui";
import { Color3, Mesh, Scene, Vector3, Observer, PickingInfo, Texture, MeshBuilder, ActionManager, ExecuteCodeAction, ActionEvent, Material, PBRMaterial} from "@babylonjs/core";

import { DC_GlobalEvents } from "../../utilities/delegates/GlobalEventListener";
import { ServerObjectManager} from "../../roomController/ServerObjectManager";
import { ColorScheme } from "../../utilities/ColorScheme";

import { ActionStates, DisplayStates, MarkerTypes, serverobjectType } from "../../utilities/enums/enums";
import { ButtonMetadata, MarkerImageMetaData } from "../../utilities/data/ObjectsData";
import { VrManager } from "../../modeController/vr/VrManager";
import { UIUtility } from "../../utilities/UIUtility";
import { ObjectPickingManager } from "../../objectPickingSelection/ObjectPickingManager";
import { DeleteMarkerEvent, MarkerState, NewMarkerEvent } from "../../roomController/objects/ServerObjects";
import { SessionManager } from "../../roomController/SessionManager";
import { GuiMenu, GuiMenuToggle, GuiMenuManager } from "../GuiMenu";
import { VrMarkerToolMenuController } from "../vr/VrMarkerToolMenuController";
import { AnnotationDataManager } from "../../annotationTool/AnnotationDataManager";
import { AnnotationMenuController } from "./AnnotationMenuController";
import { FunctionUtiliy } from "../../utilities/FunctionUtility";
import { AnnotationToolManager } from "../../annotationTool/AnnotationToolManager";
import VRAnnotationActionsMenuController from "../vr/VRAnnotationActionsMenuController";
import { RenderConfig } from "../../config";
import { EventData, EventListener } from "../../utilities/delegates/EventListener";

/**
 * @description
 * All in once class that has all the data and information for the markers.
 * Also handles the marker UI elements for users to interact with.
 */
export class MarkerMenuController{
    public static instance: MarkerMenuController | null

    public static markerSize: number = .7
    baseImage: Image | null = null                              //Base Image to clone and use for new markers
    markerImages: Map<number, Image | Mesh>                            //Collection of all markerImages created to follow editing room marker data
    markerMeshes: Map<number, Mesh> 
    markerAddButton: Rectangle | null = null                    //Button to enable add mode to request creation of markers
    markerDeleteButton: Rectangle | null = null                 //Button to enable delete mode to request deletion of markers
    markerPopupContainer: Rectangle | null = null               //Container storing buttons to 4 types of marker to be places
    markerPopupButtons: Array<Rectangle> | null = null          //Collection of Buttons for each type of marker that can be created
    markerPopupText: TextBlock | null = null
    advDynamicTexture: AdvancedDynamicTexture | null = null

    createdMarkerParent: Rectangle | null = null

    scene: Scene | null

    sceneOnPointerObserver: Observer<any> | null = null

    displayState: number = 1
    actionState: number = 0
    markerAddType: number = 0
    
    //For scaling marker size based on distance from camera.
    markerMinDistance: number = 5
    markerMaxDistance: number = 25
    markerMinScale: number = 0.25
    markerMaxScale: number = 1.0

    //Delegates for registering actions when user interacts with a marker
    vrOnClickDeletgate: EventListener<EventData>
    desktopOnClickDeletgate: EventListener<EventData>

    vrHoverOverDeletgate: EventListener<EventData>
    desktopHoverOverDeletgate: EventListener<EventData>

    vrHoverExitDeletgate: EventListener<EventData>
    desktopHoverExitDeletgate: EventListener<EventData>

    toggleButton: Rectangle

    constructor(){
        this.scene = null;
        
        this.markerImages = new Map<number, Image | Mesh>()
        this.markerMeshes = new Map<number, Mesh>()

        if(MarkerMenuController.instance){
            MarkerMenuController.instance.Uninit()
            MarkerMenuController.instance = null
        }
        MarkerMenuController.instance = this
    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        const _this = this

        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        this.createdMarkerParent = this.advDynamicTexture.getControlByName("") as Rectangle

        //Setting up GUI Controls
        this.baseImage = this.advDynamicTexture.getControlByName("Marker_BaseElement") as Image
        if(!this.baseImage){
            throw("Base Image is Null!")
        }

        this.baseImage.isVisible = false
        this.baseImage.isEnabled = false

        this.markerPopupText = this.advDynamicTexture.getControlByName("MarkerChoices_Text") as TextBlock
        this.markerPopupText.text = ""

        //Setting Up Marker Actions
        this.markerAddButton = this.advDynamicTexture.getControlByName("Marker_Create") as Rectangle
        this.markerDeleteButton = this.advDynamicTexture.getControlByName("Marker_Delete") as Rectangle
        this.markerAddButton.children[0].isEnabled = false
        this.markerDeleteButton.children[0].isEnabled = false

        this.markerAddButton.metadata = new ButtonMetadata()
        this.markerDeleteButton.metadata = new ButtonMetadata()

        this.markerAddButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.markerAddButton.onPointerOutObservable.add(UIUtility.SetHoverOff)
        this.markerDeleteButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.markerDeleteButton.onPointerOutObservable.add(UIUtility.SetHoverOff)

        //user selects button
        this.markerAddButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerAddButton)return
            _this.SetMarkerActionState(ActionStates.Add)
        })

        //user selects button
        this.markerDeleteButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerDeleteButton) return
            _this.SetMarkerActionState(ActionStates.Remove)
        })
        
        //Setting Up Marker Types Popup
        this.markerPopupContainer = this.advDynamicTexture.getControlByName("Marker_CreateOptions_Menu") as Rectangle
        this.markerPopupContainer.isVisible = false
        const button0 = this.advDynamicTexture.getControlByName("Marker_Option_0") as Rectangle
        const button1 = this.advDynamicTexture.getControlByName("Marker_Option_1") as Rectangle
        const button2 = this.advDynamicTexture.getControlByName("Marker_Option_2") as Rectangle
        const button3 = this.advDynamicTexture.getControlByName("Marker_Option_3") as Rectangle

        this.markerPopupButtons = new Array(button0, button1, button2, button3)
        this.markerPopupButtons.forEach((rect, index)=>{
            //Prevent Child Image from blocking input
            rect.children[0].isEnabled = false
            
            //Add Observable to create marker at click position
            //user selects button
            rect.onPointerDownObservable.add((pointerPos, eventState)=>{
                if(pointerPos){} //Suppress Warning
                if(eventState.target !== rect) return
                console.log(eventState.target.metadata.id);
                _this._HandleMarkerTypeSelection(eventState.target.metadata.id)
                rect.metadata.isSelected = !rect.metadata.isSelected
            })
            rect.onPointerEnterObservable.add(UIUtility.SetHoverOn)
            rect.onPointerOutObservable.add(UIUtility.SetHoverOff)
            rect.metadata = new ButtonMetadata(index + 1, false, false)
        })

        //Setting up GUI Toggle/Menu/ToggleGroup for Navbar
        _this.toggleButton = this.advDynamicTexture.getControlByName("Navbar_MenuToggle_Markers") as Rectangle

        _this.toggleButton.metadata = new ButtonMetadata(-1, false, false);
        _this.toggleButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        _this.toggleButton.onPointerOutObservable.add(UIUtility.SetHoverOff)
        _this.toggleButton.children.forEach((child)=>child.isEnabled = false)

        const markerToolsContainer = this.advDynamicTexture.getControlByName("Marker_SelectTool_Container") as Rectangle
        markerToolsContainer.isVisible = false

        const guiMenu = new GuiMenu(markerToolsContainer)
        guiMenu.OnEnableCallback = function(){
            guiMenu.container.isVisible = true
            _this.toggleButton.metadata.isSelected = true
        }

        guiMenu.OnDisableCallback = function(){
            guiMenu.container.isVisible = false
            if(_this.markerPopupContainer){
                _this.markerPopupContainer.isVisible = false
            }
            _this.SetMarkerActionState(ActionStates.None)
            _this.toggleButton.metadata.isSelected = false
        }

        const menuToggle = new GuiMenuToggle(this.toggleButton, guiMenu)
        const toggleGroup = GuiMenuManager.instance.FindOrCreateToggleGroup("Navbar");
        toggleGroup.AddToggle(menuToggle)

        //user selects button
        this.toggleButton.onPointerDownObservable.add(()=>{
            toggleGroup.ActivateToggle(menuToggle)
            //toggleButton.metadata.isSelected = !toggleButton.metadata.isSelected
        })

        //Event Subscription
        //this.scene.onPointerObservable.add(this._HandleMarkerAdd);

        DC_GlobalEvents.AddCallback(NewMarkerEvent.UniqueSymbol, this.NewMarkerEventCallback);
        DC_GlobalEvents.AddCallback(DeleteMarkerEvent.UniqueSymbol, this.DeleteMarkerEventCallback)

        //Set Logic State after initializations
        // this.ToggleDisplayMarkers(DisplayStates.All);

        _this.vrOnClickDeletgate = new EventListener<EventData>();
        _this.desktopOnClickDeletgate = new EventListener<EventData>();
    
        _this.vrHoverOverDeletgate = new EventListener<EventData>();
        _this.desktopHoverOverDeletgate = new EventListener<EventData>();
    
        _this.vrHoverExitDeletgate = new EventListener<EventData>();
        _this.desktopHoverExitDeletgate = new EventListener<EventData>();

        // ServerObjectManager.instance?.RequestDeleteMarker(newMarkerMesh.metadata.markerId);
    }

    Uninit(){
        DC_GlobalEvents.RemoveCallback(NewMarkerEvent.UniqueSymbol, this.NewMarkerEventCallback);
        DC_GlobalEvents.RemoveCallback(DeleteMarkerEvent.UniqueSymbol, this.DeleteMarkerEventCallback);
        this.scene?.onPointerObservable.remove(this.sceneOnPointerObserver)
    }

    //TODO: deprecated, to decide is to remove
    UpdateMarkerState(mesh: Mesh, marker: MarkerState){
        // this.SetMarkerImageDisplayState(img, marker.visibility)
        this.SetMarkerMeshDisplayState(mesh, marker.visibility)
        // this.SetImageSource(mesh, marker.type)
        var mat = mesh.material as PBRMaterial;
        this.SetupMaterialTextureSource(mat, marker.type);
    }

    public Update(){
        const _this = MarkerMenuController.instance as MarkerMenuController
        if(_this.displayState === 0)
            return;

        if(this.scene === null)
            return;

        const invalidIds = new Array<number>()

        invalidIds.forEach((value)=>{
            _this.markerImages.delete(value);
            _this.markerMeshes.delete(value);
        });
    }

    public ClearGUIMarkers()
    {   
        const _this = MarkerMenuController.instance as MarkerMenuController
        for (const markerMesh of _this.markerMeshes.values()) {
            if(markerMesh)
            {
                markerMesh.dispose(false, true);
            }
        }
        _this.markerMeshes.clear();

        for (const markerObj of _this.markerImages.values()) {
            markerObj.dispose();
        }
        _this.markerMeshes.clear();

        console.log("disposed")
    }
    
    //Creates a new marker wwhen NewMarkerEvent.UniqueSymbol is called from server sides
    NewMarkerEventCallback(event: NewMarkerEvent)
    {
        //TODO: temp fix for editing components not uninit after room exit
        //See EditingSesionManager.ts line 165 for more comments.
        if(!SessionManager.instance.isConnectedToRoom)
            return;

        console.log("NewMarkerEventCallback Called");
        const _this = MarkerMenuController.instance as MarkerMenuController

        let coords: any = event.markerInfo.position;

        const newMarkerImage = _this.baseImage?.clone() as Image
        newMarkerImage.parent = _this.createdMarkerParent

        _this.SetImageSource(newMarkerImage, event.markerInfo.type)

        var mat = new PBRMaterial("mat1", _this.scene as Scene);
        _this.SetupMaterialTextureSource(mat, event.markerInfo.type);

        var newMarkerMesh = MeshBuilder.CreatePlane("markerMesh", { size: MarkerMenuController.markerSize }, _this.scene) as Mesh; 
        newMarkerMesh.billboardMode = Mesh.BILLBOARDMODE_ALL; //make mesh face cam
        newMarkerMesh.material = mat;
        newMarkerMesh.receiveShadows = false;
        newMarkerMesh.renderingGroupId = RenderConfig.worldSpace;

        if (coords)
            newMarkerMesh.position = new Vector3(coords.x, coords.y, coords.z);

        // easy solution is to create a new actionmanger for each mesh...
        newMarkerMesh.actionManager = new ActionManager(_this.scene);

        //Setup metadata after objects are fully initialized and configured
        newMarkerImage.metadata = new MarkerImageMetaData(event.markerInfo.marker_instance_id, serverobjectType.marker ,newMarkerMesh, newMarkerMesh.actionManager, -1)
        newMarkerMesh.metadata =new MarkerImageMetaData(event.markerInfo.marker_instance_id, serverobjectType.marker, newMarkerMesh, newMarkerMesh.actionManager, -1)

        // Register onClick interaction
        newMarkerMesh.actionManager?.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnPickDownTrigger,
                },
                function () {
                    if(VrManager.instance?._inVR)
                    {
                        if(VrMarkerToolMenuController.instance?.actionState === ActionStates.Remove)
                        {
                            ServerObjectManager.instance?.RequestDeleteMarker(newMarkerMesh.metadata.typeInstanceID);
                        }
                       //register annotation add action
                       else if(AnnotationToolManager.instance.actionState === ActionStates.Add)
                        {
                            FunctionUtiliy.promisify(() => AnnotationDataManager.instance?.GetAnnotated(newMarkerMesh.metadata))
                            .then(result => {
                                if(!result)
                                {
                                    VRAnnotationActionsMenuController.instance.OpenInputPanelAction();
                                    AnnotationDataManager.instance?.RecordTargetAnnotationObjectData(newMarkerMesh.metadata)
                                }
                            });
                        }
                        //register annotation remove action
                        else if(AnnotationToolManager.instance.actionState === ActionStates.Remove)
                        {
                            //code here
                        }
                    }
                    else
                    {
                        //register marker remove action
                        if(_this.actionState === ActionStates.Remove)
                        {
                            ServerObjectManager.instance?.RequestDeleteMarker(newMarkerMesh.metadata.typeInstanceID);
                        }                        
                        //register annotation add action
                        else if(AnnotationToolManager.instance.actionState === ActionStates.Add)
                        {
                            FunctionUtiliy.promisify(() => AnnotationDataManager.instance?.GetAnnotated(newMarkerMesh.metadata))
                            .then(result => {
                                if(!result)
                                {
                                    AnnotationDataManager.instance?.RecordTargetAnnotationObjectData(newMarkerMesh.metadata)
                                    AnnotationMenuController.instance?.OpenCreateNewAnnotationInputFieldsAction();
                                }
                            });
                        }
                        //register annotation remove action
                        else if(AnnotationToolManager.instance.actionState === ActionStates.Remove)
                        {
                            //code here
                        }
                    }
                    newMarkerMesh.renderingGroupId = RenderConfig.worldSpace;
                },
            ),
        );

        // Register hover over interaction
        newMarkerMesh.actionManager?.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnPointerOverTrigger,
                },
                function ()
                {
                    if(VrManager.instance?._inVR)
                    {
                        if(VrMarkerToolMenuController.instance?.actionState === ActionStates.Remove)
                        {
                            var  mat = newMarkerMesh.material as PBRMaterial;
                            var  purpleColor = Color3.FromHexString(ColorScheme.OnWarningAlert);
                            mat.albedoColor = purpleColor;
                        }
                    }
                    else
                    {
                        if(_this.actionState === ActionStates.Remove || 
                            AnnotationToolManager.instance.actionState === ActionStates.Add ||
                            AnnotationToolManager.instance.actionState === ActionStates.Remove)
                        {
                            var  mat = newMarkerMesh.material as PBRMaterial;
                            var  purpleColor = Color3.FromHexString(ColorScheme.OnWarningAlert);
                            mat.albedoColor = purpleColor;
                        } 
                    }       
                    newMarkerMesh.renderingGroupId = RenderConfig.highlights;
                },
            ),
        );

        // Register hover exit interaction
        newMarkerMesh.actionManager?.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnPointerOutTrigger,
                },
                function ()
                {                    
                    if(VrManager.instance?._inVR)
                    {
                        if(VrMarkerToolMenuController.instance?.actionState === ActionStates.Remove)
                        {
                            var  mat = newMarkerMesh.material as PBRMaterial;
                            mat.albedoColor = new Color3(1,1,1);
                        }
                    }
                    else
                    {
                        if(_this.actionState === ActionStates.Remove || 
                            AnnotationToolManager.instance.actionState === ActionStates.Add ||
                            AnnotationToolManager.instance.actionState === ActionStates.Remove)
                        {
                            var  mat = newMarkerMesh.material as PBRMaterial;
                            mat.albedoColor = new Color3(1,1,1);
                        } 
                    }
                    newMarkerMesh.renderingGroupId = RenderConfig.worldSpace;
                },
            ),
        );

        _this.SetMarkerImageDisplayState(newMarkerImage, event.markerInfo.visibility)
        _this.SetMarkerMeshDisplayState(newMarkerMesh, event.markerInfo.visibility)
        _this.markerImages.set(event.markerInfo.marker_instance_id, newMarkerImage) //setting into array
        _this.markerMeshes.set(event.markerInfo.marker_instance_id, newMarkerMesh) //setting into array
        _this.advDynamicTexture?.addControl(newMarkerImage)

        
    }

    DeleteMarkerEventCallback(event: DeleteMarkerEvent){
        const _this = MarkerMenuController.instance as MarkerMenuController
        if(!_this.markerImages.has(event.idToDelete)){
            console.warn("Marker To Delete does not exist as image!")
            return
        }

        const mesh = _this.markerMeshes.get(event.idToDelete) as Mesh
        mesh.dispose();
        _this.markerMeshes.delete(event.idToDelete)

        const img = _this.markerImages.get(event.idToDelete) as Image
        _this.markerImages.delete(event.idToDelete)
        _this.advDynamicTexture?.removeControl(img)
    }

    SetImageSource(img: Image, type: number){
        let srcString = "editing/markers/"
        switch(type){
            case MarkerTypes.ambulance:
                srcString += "ambulance.png"
                break
            case MarkerTypes.debrisclearingteam: 
                srcString += "debrisclearingteam.png"
                break
            case MarkerTypes.electricalhazard:
                srcString += "electricalhazard.png"
                break
            case MarkerTypes.searchsite:
                srcString += "searchsite.png"
                break
            default:
                console.warn("Incorrect Marker Type! ->", type)
                return;
        }
        img.source = srcString
    }

    SetupMaterialTextureSource(mat: PBRMaterial, type: number){
        let srcString = "editing/markers/"
        switch(type){
            case MarkerTypes.ambulance:
                srcString += "ambulance.png"
                break
            case MarkerTypes.debrisclearingteam: 
                srcString += "debrisclearingteam.png"
                break
            case MarkerTypes.electricalhazard:
                srcString += "electricalhazard.png"
                break
            case MarkerTypes.searchsite:
                srcString += "searchsite.png"
                break
            default:
                console.warn("Incorrect Marker Type! ->", type)
                return;
        }
        const  texture = new Texture(srcString, this.scene);
        texture.hasAlpha = true;

        mat.roughness = 1;
        mat.unlit = true;
        mat.disableLighting = true;
        mat.albedoTexture = texture;
    }

    SetMarkerImageDisplayState(img: Image, markerVisibility: boolean){
        img.isVisible = false
    }

    SetMarkerMeshDisplayState(mesh: Mesh, markerVisibility: boolean){
        let isRendered = false
        switch(this.displayState){
            case DisplayStates.None:       
                isRendered = false; 
                break;
            case DisplayStates.Partial:    
                isRendered = markerVisibility; 
                break;
            case DisplayStates.All:       
                isRendered = true; 
                break;
            default:
                break;
        }
        mesh.isVisible = isRendered
    }

    SetMarkerActionState(state: number){
        state = Math.round(state)
        if(state < 0 || state > 2){
            console.warn("Invalid State Number Entered!")
            return
        }

        //Handle behaviour for leaving current action State
        switch(this.actionState){
            case ActionStates.None: 
                break;
            case ActionStates.Add:
                if(this.markerPopupContainer)
                    this.markerPopupContainer.isVisible = false
                
                ObjectPickingManager.ActiveInstance?.ClearOnPickFunction()                
                {
                    UIUtility.SetSelectedOff(this.markerAddButton as Control)
                }
                
                if(this.markerPopupContainer){
                    this.markerPopupContainer.isVisible = false
                }

                break;
            case ActionStates.Remove:
                {
                    UIUtility.SetSelectedOff(this.markerDeleteButton as Control)
                }
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
        }

        //If same state, handle as Toggle On/Off
        if(this.actionState === state && this.actionState !== ActionStates.None){
            this.actionState = ActionStates.None
        }else{ //Else switch to new state.
            this.actionState = state
        }

        //Handle behaviour for entering new action State
        switch(this.actionState){
            case ActionStates.None:
                break;
            case ActionStates.Add:
                {
                    UIUtility.SetSelectedOn(this.markerAddButton as Control)
                }

                if(this.markerPopupContainer){
                    this.markerPopupContainer.isVisible = true
                }

                ObjectPickingManager.ActiveInstance?.AssignOnPickFunction(this._HandleMarkerAdd, this._CancelMarkerPlacementMode)
                break;
            case ActionStates.Remove:
                if(this.markerDeleteButton)
                    this.markerDeleteButton.background = ColorScheme.GetPurpleScale(0)

                {
                    UIUtility.SetSelectedOn(this.markerDeleteButton as Control)
                }
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
        }
    }

    _CancelMarkerPlacementMode(){
        const _this = MarkerMenuController.instance
        _this?.SetMarkerActionState(ActionStates.None);
    }

    _HandleMarkerAdd(pickInfo: PickingInfo){
        const _this = MarkerMenuController.instance as MarkerMenuController
        if(_this.scene === null){
            return
        }

        const markerPos = pickInfo.pickedPoint as Vector3
        //offset the marker position by half the marker size (height)
        markerPos.y += MarkerMenuController.markerSize/2

        console.log("Adding marker via PC");
        console.log("Coords - X:", markerPos.x, "Y:", markerPos.y, "Z:", markerPos.z);

        let markerNormal = pickInfo.getNormal() as Vector3
        markerNormal.y = 0 //Use only XZ plane for normal

        ServerObjectManager.instance?.RequestNewMarker(markerPos, markerNormal, _this.markerAddType)
    }

    _HandleMarkerTypeSelection(markerType: number){
        console.log(markerType);
        if(markerType < 0 || markerType > 4){
            console.warn("Invalid Marker Type Entered: ", markerType)
            return
        }
        
        const _this = MarkerMenuController.instance as MarkerMenuController

        if(_this.markerAddType ===  markerType){
            _this.markerAddType = -1
            //Clear Picking
        }
        else {
            _this.markerAddType = markerType
        }
        let string = ""
        switch(markerType){
            case MarkerTypes.ambulance: 
            string = "Mark an area for generic rehabilitation documentation."
            break;

            case MarkerTypes.debrisclearingteam: 
            string = "Mark an area for non-rehabilitation related documentation."
            break;
            
            case MarkerTypes.electricalhazard:
            string = "Mark an area as accidental-prone or containing hazards."
            break;

            case MarkerTypes.searchsite: 
            string = "Mark an area as suggestions modifications to accommendate rehabilitation."
            break;

            default:
                console.warn("Invalid Marker Type: ", markerType)
        }
        if(_this.markerPopupText)
            _this.markerPopupText.text = string

        _this.markerPopupButtons?.forEach((rect)=>{
            if(_this.markerAddType === rect.metadata.markerType){
                rect.metadata.isSelected = true
            }else{
                rect.metadata.isSelected = false
            }
            UIUtility.SetColor(rect, rect.metadata)
        })


    }

    public ToggleDisplayMarkers(displayState: number = -1){
        const _this = this;
        displayState = Math.round(displayState)
        if(displayState < -1 || displayState > 2){
            return
        }

        //If special case no state provided. Toggle on/off
        if(displayState === -1){
            this.displayState = this.displayState ? DisplayStates.None : DisplayStates.All
        }else{
            this.displayState = displayState
        }

        //Update UI to represent display state
        // if(_this.markerVisibilityButton){
        //     const bgColor = Color4.FromHexString(_this.markerVisibilityButton.background)
        //     bgColor.a = _this.displayState ? 1.0 : 0.0
        //     _this.markerVisibilityButton.background = bgColor.toHexString()
        // }
        
        //For each collaborator, enable display.
        MarkerMenuController.instance?.markerImages.forEach((map, id)=>{
            const img = map as Image;
            const markerInfo = ServerObjectManager.instance?.GetMarkerInfo(id)
            if(markerInfo !== undefined){
                _this.SetMarkerImageDisplayState(img, markerInfo.visibility)
            }
        })

        MarkerMenuController.instance?.markerMeshes.forEach((map, id)=>{
            const mesh = map as Mesh;
            const markerInfo = ServerObjectManager.instance?.GetMarkerInfo(id)
            if(markerInfo !== undefined){
                _this.SetMarkerMeshDisplayState(mesh, markerInfo.visibility)
            }
        })
    }
}