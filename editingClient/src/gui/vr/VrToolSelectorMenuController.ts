import { MeshBuilder, Mesh, Scene, Vector3, SceneLoader, AbstractMesh} from "@babylonjs/core";
import { VrManager } from "../../modeController/vr/VrManager";
import { AnnotationToolManager } from "../../annotationTool/AnnotationToolManager";
import { VRMenuObject } from "../UIComponents";
import { AssetConfig, ColorsConfig } from "../../config";
import { Control, Image, Rectangle, TextBlock } from "@babylonjs/gui";
import { ActionStates, ToolState, toolType } from "../../utilities/enums/enums";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { UIUtility } from "../../utilities/UIUtility";


export class VrToolSelectorMenuController
{
    public static instance: VrToolSelectorMenuController;

    private scene: Scene;

    /**
     * A simple mesh that indicates the origins of the controller position for use in GUI.
     * Mesh model is hidden from the user.
     */
    public selectorMesh: Mesh;
    // private transformToolMesh: AbstractMesh;
    // private objectsToolMesh: AbstractMesh;
    // private markerToolMesh: AbstractMesh;
    // private measuringToolMesh: AbstractMesh;
    // private annotationToolMesh: AbstractMesh;

    menuObject: VRMenuObject;
    toolSelectionButtons: Map<number, Control> = new Map();
    toolSelectionText: Map<number, Control> = new Map();

    /**
     * 0 = none, 1 = transform, 2 = object, 3 = markers, 4 = measuring, 5 = annotation
     */
    public activeToolIndex = 0; 
    /**
     * The previously selected tool index
     */
    public previousToolIndex = 0;

    /**
     * The index of this tool. DO NOT CHANGE.
     */
    public toolIndex = 0;
    /**
     * Indicates the current state of the tool.
     * 0 = not selected, inactive]
     * 1 = selected, but not in use
     * 2 = selected and in use
     * 3 = ended use
     * 4 = completed using tool
     */
    public toolState: ToolState = ToolState.inactive;

    //Components
    // private triggerComponent: OnTriggerComponent | undefined;
    // public startToolAction: DC_EventListener<>;
    // public endToolAction: DC_EventListener<T>;

    public vrMngr: VrManager | null;

    public parentController: any;

    public sideSpacing = 1;
    public forwardSpacing = .8;
 
    // ================ Init and resets ================

    constructor()
    {
        // this.vrMngr = null;   
    }

    public async Init(scene: Scene, motionController: any, vrMngr: VrManager)
    {
        VrToolSelectorMenuController.instance = this;
        const _this = VrToolSelectorMenuController.instance;        

        _this.scene = scene;
        _this.parentController = motionController;
        _this.vrMngr = vrMngr;
        //this.xrHelper = xrHelper;

        _this.menuObject = new VRMenuObject();
        await _this.menuObject.init(AssetConfig.VRtoolSelectorUI, 1, 448, 168, new Vector3(0,0,0), _this.scene);
        _this.menuObject.setBillboardMode(true, 2);

        _this.selectorMesh = MeshBuilder.CreateSphere("Selector", { diameter: .15 }, _this.scene);
        _this.selectorMesh.position = new Vector3(0, 10, 0);
        _this.selectorMesh.isVisible = false;
        _this.selectorMesh.setEnabled(false);

        // Set up tool selector GUI
        for (let i = 0; i < 5; i++) {
            const key = i;
            let toolString = toolType[key+1];
            const toolName = toolString //"ToolSelector_" + key.toString();
            const iconButt = (_this.menuObject.advTex.getControlByName("ToolSelector_" + key.toString()) as Rectangle).getChildByName("Button");
            iconButt.metadata = new ButtonMetadata();
            _this.toolSelectionButtons.set(key,iconButt);
            const iconTitle = (_this.menuObject.advTex.getControlByName("ToolSelector_" + key.toString()) as Rectangle).getChildByName("title_field") as TextBlock;
            iconTitle.text = toolName;
            iconTitle.color = ColorsConfig.text_dark
            iconTitle.isVisible = false;
            _this.toolSelectionText.set(key,iconTitle);

            const iconIcon = (_this.menuObject.advTex.getControlByName("ToolSelector_" + key.toString()) as Rectangle).getChildByName("check_icon") as Image;
            var iconPath = "";

            //TODO: quick hack
            if(i == 0 )
                iconPath = AssetConfig.transformIcon_dark;
            else if(i == 1 )
                iconPath = AssetConfig.objectIcon_dark;
            else if(i == 2 )
                iconPath = AssetConfig.markerIcon_dark;
            else if(i == 3 )
                iconPath = AssetConfig.measurementIcon_dark;
            else if(i == 4 )
                iconPath = AssetConfig.annotateAddIcon_dark;
            else
                iconPath = AssetConfig.missingIcon_dark;

            iconIcon.source = iconPath;
        }

        _this.CloseMenu();
        // _this.vrMngr?.vrAssetBrowserToolMngr?.setPosition(new Vector3(0, 0, 0));            
        //  _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(true);
    }

    public UpdateAssignedController(assignedController: any)
    {
        const _this = VrToolSelectorMenuController.instance;
        _this.parentController = assignedController;
    }
    // ================ tool index and setters ================

    /**
     * Saves the current active tool index as the previous tool index.
     */
    RecordActiveToolIndex()
    {        
        const _this = VrToolSelectorMenuController.instance;
        _this.previousToolIndex = _this.activeToolIndex;
    }
    
    /**
     * Moves the active tool index by the parameter amount.
     * @param index 
     */
    MoveActiveToolIndexBy(index: number)
    {
        const _this = VrToolSelectorMenuController.instance;
        const toolTypeLength = Object.keys(toolType).length / 2;       
        _this.activeToolIndex += index;
        if(_this.activeToolIndex < 1)
        {
            _this.activeToolIndex = 1
        }
        else if (_this.activeToolIndex > toolTypeLength - 1)
        {
            _this.activeToolIndex = toolTypeLength - 1
        }
    }

    /**
     * 
     * @param value Move by tool index by value. -1 moves backwards, 1 moves forward
     */
    UpdateSelectedTool(value: number)
    {
        const _this = VrToolSelectorMenuController.instance;
        _this.RecordActiveToolIndex();
        _this.MoveActiveToolIndexBy(value);

        // Adjust GUI
        for (let c = 0; c < 5; c++) {
            var i = c
            // _this.activeToolIndex-1 <--- do this cos array starts from 0 till 4, 
            // but vaild tool IDs is from 1 - 5. Toolindex 0 is reserved NONE, but there is no GUI for a "none" tool
            if(i != _this.activeToolIndex - 1)
            {
                UIUtility.SetSelectedOff(_this.toolSelectionButtons.get(i))
                _this.toolSelectionText.get(i).isVisible = false;
            }
        } 
        UIUtility.SetSelectedOn(_this.toolSelectionButtons.get(_this.activeToolIndex-1))
        _this.toolSelectionText.get(_this.activeToolIndex-1).isVisible = true;
    }

    ResetActiveToolIndex()
    {
        const _this = VrToolSelectorMenuController.instance;     
        _this.activeToolIndex = 0;
    }
    
    // ================ Menu activation ================

    StartActiveTool()
    {
        const _this = VrToolSelectorMenuController.instance;
        
        //clear any previously set methods attached to tool actions
        _this.vrMngr?.ClearStartToolAction();
        _this.vrMngr?.ClearEndToolAction();

        if(_this.previousToolIndex == _this.activeToolIndex)
        {
            _this.StopActiveTool();
            // AnnotationToolManager.instance.SetToolActionState(ActionStates.None);
            // _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(false);
            // _this.vrMngr?.vrMarkerToolMngr?.setVisibility(false);
            // VrManager.instance.hasToolSelected = false;
            return;
        }

        var forwardDirection = _this.selectorMesh.forward;
        var rightDirection = _this.selectorMesh.right;  

        //Think of a better way to implement this so there is no need to copy paste everytime.
        switch(_this.activeToolIndex)
        {
            case 1: // transform tool
                {
                    _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(false);
                    _this.vrMngr?.vrMarkerToolMngr?.setVisibility(false);     
                    break;
                }
            case 2: //model browser
                {
                    // _this.vrMngr.vrAssetBrowserToolMngr.mesh.position = _this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(-sideSpacing)).add(forwardDirection.scale(forwardSpacing));
                    _this.vrMngr?.vrAssetBrowserToolMngr?.setPosition(_this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(-_this.sideSpacing)).add(forwardDirection.scale(_this.forwardSpacing)));
                    _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(true);
                    _this.vrMngr?.vrMarkerToolMngr?.setVisibility(false); 
                    break;
                }
            case 3: //marker
                {                            
                    _this.vrMngr.vrMarkerToolMngr.mesh.position = _this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(-_this.sideSpacing)).add(forwardDirection.scale(_this.forwardSpacing));
                    _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(false);   
                    _this.vrMngr?.vrMarkerToolMngr?.setVisibility(true);
                    break;
                }
            case 4: // measurement
                {                    
                    _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(false);
                    _this.vrMngr?.vrMarkerToolMngr?.setVisibility(false);
                    break;
                }
            case 5: //annotation
                {                       
                    AnnotationToolManager.instance.SetToolActionState(ActionStates.Add);                    
                    //TODO: need to somehow check if the selected object to annotate is vaild before opening input panel    
                    _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(false);
                    _this.vrMngr?.vrMarkerToolMngr?.setVisibility(false);
                    break;
                }
            default: //none
                {
                    break;
                }
        }
        VrManager.instance.hasToolSelected = true;
    }

    StopActiveTool()
    {
        const _this = VrToolSelectorMenuController.instance;
        
        //clear any previously set methods attached to tool actions
        _this.vrMngr?.ClearStartToolAction();
        _this.vrMngr?.ClearEndToolAction();

        AnnotationToolManager.instance.SetToolActionState(ActionStates.None);
        _this.vrMngr?.vrAssetBrowserToolMngr?.setVisibility(false);
        _this.vrMngr?.vrMarkerToolMngr?.setVisibility(false);

        VrManager.instance.hasToolSelected = false;
    }

    GetActiveToolIndex()
    {
        const _this = VrToolSelectorMenuController.instance; 
        return _this.activeToolIndex;
    }

    // ================ Tool selector Menu GUI on and off ================

    public OpenMenu()
    {
        const _this = VrToolSelectorMenuController.instance;      
        
        var forwardDirection = _this.selectorMesh.forward;
        // let forwardSpacing = .23;

        // add funcs to lefy joystick left/right ctrl
        _this.selectorMesh.setParent(_this.parentController.rootMesh);
        // console.log(_this.parentController);
        _this.selectorMesh.position = new Vector3(0, 0, 0);
        _this.selectorMesh.rotation = new Vector3(90, 0, 0);

        // _this.menuObject.setPosition(new Vector3(0,5,0));
        _this.menuObject.setPosition(_this.selectorMesh.getAbsolutePosition().add(forwardDirection.scale(_this.forwardSpacing)));
        _this.menuObject.setVisibility(true);
        _this.toolState = ToolState.active;
    }

    public CloseMenu()
    {
        const _this = VrToolSelectorMenuController.instance;
        _this.menuObject.setVisibility(false);
        // _this.selectorMesh.position = new Vector3(1000, 1000, 1000);
        _this.toolState = ToolState.inactive;
    }

    // ================ Collision and trigger events (not working atm) ================
    // TODO: WIP collision functions to be added, instead of putting the update in the registerBeforeRender which is called every frame
    private onTriggerEnter(evt: any): void {
    {
        const intersectedMesh = evt.source as Mesh;
        const targetMeshes = evt.parameter as Mesh[];
    }}
    
    private onTriggerExit(evt)
    {
        
    }
}
