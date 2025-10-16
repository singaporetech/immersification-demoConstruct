import { AdvancedDynamicTexture, Control, Image, Rectangle, TextBlock } from "@babylonjs/gui";
import { Scene, Vector3 } from "@babylonjs/core";

import { ServerObjectManager} from "../../roomController/ServerObjectManager";
import { ColorScheme } from "../../utilities/ColorScheme";

import { ActionStates, DisplayStates, MarkerTypes } from "../../utilities/enums/enums";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { UIUtility } from "../../utilities/UIUtility";
import { ObjectPickingManager } from "../../objectPickingSelection/ObjectPickingManager";
import { VrMarkerToolManager } from "../../markerTool/vr/vrMarkerToolManager";
import { MarkerMenuController } from "../desktop/MarkerMenuController";
import { GuiMenu, GuiMenuToggle, GuiMenuManager } from "../GuiMenu";
import { AssetConfig } from "../../config";

export class VrMarkerToolMenuController{
    
    public static instance: VrMarkerToolMenuController | null

    scene: Scene | null

    baseImage: Image | null = null                              //Base Image to clone and use for new markers
    markerVisibilityButton: Rectangle | null = null             //Visiblity Toggle button
    markerAddButton: Rectangle | null = null                    //Button to enable add mode to request creation of markers
    markerDeleteButton: Rectangle | null = null                 //Button to enable delete mode to request deletion of markers
    markerPopupContainer: Rectangle | null = null               //Container storing buttons to 4 types of marker to be places
    markerPopupButtons: Array<Rectangle> | null = null          //Collection of Buttons for each type of marker that can be created
    markerPopupText: TextBlock | null = null
    advDynamicTexture: AdvancedDynamicTexture | null = null
    markerActionsContainer: Rectangle;

    actionState: number = 0
    markerAddType: number = 0

    // public menuToggle: any;
    // public toggleGroup: any;

    constructor()
    {
        this.scene = null;

        if(VrMarkerToolMenuController.instance)
        {
            VrMarkerToolMenuController.instance.Uninit()
            VrMarkerToolMenuController.instance = null
        }
        VrMarkerToolMenuController.instance = this
    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        const _this = this

        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        // this.createdMarkerParent = this.advDynamicTexture.getControlByName("") as Rectangle
        // Setting up GUI Controls
        this.baseImage = this.advDynamicTexture.getControlByName("Marker_BaseElement") as Image
        if(!this.baseImage)
            throw("Base Image is Null!")

        this.baseImage.isVisible = false
        this.baseImage.isEnabled = false

        this.markerPopupText = this.advDynamicTexture.getControlByName("MarkerChoices_Text") as TextBlock
        this.markerPopupText.text = ""

        const markerTxtContainer = this.advDynamicTexture.getControlByName("MarkerText_Container") as TextBlock
        markerTxtContainer.isVisible = false;

        //Setting Up Marker Actions
        this.markerAddButton = this.advDynamicTexture.getControlByName("Marker_Create") as Rectangle
        this.markerAddButton.isEnabled = true
        this.markerAddButton.children[0].isEnabled = false
        this.markerAddButton.children[1].isEnabled = false
        this.markerAddButton.metadata = new ButtonMetadata()
        this.markerAddButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.markerAddButton.onPointerOutObservable.add(UIUtility.SetHoverOff)

        this.markerAddButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerAddButton)return
            console.log("set to add");
            _this.SetMarkerButtonsActionState(ActionStates.Add)
            VrMarkerToolManager.instance.TryUpdateActionState(1);
        })

        this.markerDeleteButton = this.advDynamicTexture.getControlByName("Marker_Delete") as Rectangle
        this.markerDeleteButton.isEnabled = true
        this.markerDeleteButton.children[0].isEnabled = false
        this.markerDeleteButton.children[1].isEnabled = false
        this.markerDeleteButton.metadata = new ButtonMetadata()
        this.markerDeleteButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.markerDeleteButton.onPointerOutObservable.add(UIUtility.SetHoverOff)

        this.markerDeleteButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerDeleteButton) return
            _this.SetMarkerButtonsActionState(ActionStates.Remove)
            VrMarkerToolManager.instance.TryUpdateActionState(2);
        })

        //Setting up Marker View Toggle
        this.markerVisibilityButton = this.advDynamicTexture.getControlByName("Marker_Visibility") as Rectangle
        this.markerVisibilityButton.children[0].isEnabled = false
        this.markerVisibilityButton.metadata = new ButtonMetadata(-1, false, true)
        UIUtility.SetColor(this.markerVisibilityButton as Rectangle, this.markerVisibilityButton.metadata)

        this.markerVisibilityButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.markerVisibilityButton.onPointerOutObservable.add(UIUtility.SetHoverOff)
        this.markerVisibilityButton.onPointerUpObservable.add((mousePos, eventState)=>{
            mousePos //Suppress warning
            if(eventState.target !== _this.markerVisibilityButton) return

            eventState.target.metadata.isSelected = !eventState.target.metadata.isSelected
            MarkerMenuController.instance?.ToggleDisplayMarkers();
            UIUtility.SetColor(this.markerDeleteButton as Rectangle, eventState.target.metadata)
            // EditingRoomMarkerUI._SetButtonColor(eventState.target as Rectangle, eventState.target.metadata)
        })
        this.markerVisibilityButton.isVisible = false;
        
        //Setting Up Marker Types Popup
        //Notes: This seems to be hardcoded to the 4 UI template buttons (not an issue)
        this.markerPopupContainer = this.advDynamicTexture.getControlByName("Marker_CreateMenu") as Rectangle
        this.markerPopupContainer.isVisible = true
        const button0 = this.advDynamicTexture.getControlByName("Marker_Option_0") as Rectangle
        const button1 = this.advDynamicTexture.getControlByName("Marker_Option_1") as Rectangle
        const button2 = this.advDynamicTexture.getControlByName("Marker_Option_2") as Rectangle
        const button3 = this.advDynamicTexture.getControlByName("Marker_Option_3") as Rectangle

        this.markerPopupButtons = new Array(button0, button1, button2, button3)
        this.markerPopupButtons.forEach((rect, index)=>{
            //Prevent Child Image from blocking input
            rect.children[0].isEnabled = false
            rect.children[1].isEnabled = false
            

            const text = rect.getChildByName("text") as TextBlock
            let title = "";
            if(index == 0)
            {
                title = "Ambulance"
            }
            else if(index == 1)
            {
                title = "Debris"
            }
            else if(index == 2)
            {
                title = "Hazard"
            }
            else if(index == 3)
            {
                title = "Search"
            }
            text.text = title
            //Add Observable to create marker at click position
            rect.onPointerDownObservable.add((pointerPos, eventState)=>{
                if(pointerPos){} //Suppress Warning
                if(eventState.target !== rect) 
                    return
                _this._HandleMarkerTypeSelection_VR(eventState.target.metadata.id)
                VrMarkerToolManager.instance.TryUpdateSelectedMarker(eventState.target.metadata.id)
                rect.metadata.isSelected = !rect.metadata.isSelected
            })
            rect.onPointerEnterObservable.add(UIUtility.SetHoverOn)
            rect.onPointerOutObservable.add(UIUtility.SetHoverOff)
            rect.metadata = new ButtonMetadata(index + 1, false, false)
        })

        //Setting up GUI Toggle/Menu/ToggleGroup for Navbar
        const toggleButton = this.advDynamicTexture.getControlByName("Navbar_MarkerButton") as Rectangle
        toggleButton.metadata = {
            isSelected: false
        }
        toggleButton.onPointerEnterObservable.add(()=>{
            if(toggleButton.metadata.isSelected){
                toggleButton.background = ColorScheme.Selected
                toggleButton.alpha = 1;
            }else{
                toggleButton.background = ColorScheme.hoverSelectable
                toggleButton.alpha = 1;
            }
        })
        toggleButton.onPointerOutObservable.add(()=>{
            if(toggleButton.metadata.isSelected){
                toggleButton.background = ColorScheme.Selected
                toggleButton.alpha = 1;
            }else{
                toggleButton.background = ColorScheme.Selectable
                toggleButton.alpha = .7;
            }
        })
        toggleButton.children.forEach((child)=>child.isEnabled = false)

        _this.markerActionsContainer = this.advDynamicTexture.getControlByName("Marker_Group") as Rectangle
        _this.markerActionsContainer.isVisible = false

        const guiMenu = new GuiMenu(_this.markerActionsContainer)
        guiMenu.OnEnableCallback = function(){
            guiMenu.container.isVisible = true
            toggleButton.metadata.isSelected = true
        }
        
        guiMenu.OnDisableCallback = function(){
            guiMenu.container.isVisible = false
            if(_this.markerPopupContainer){
                _this.markerPopupContainer.isVisible = false
            }
            _this.SetMarkerButtonsActionState(ActionStates.None)
            toggleButton.metadata.isSelected = false
        }

        // this.menuToggle = new GuiMenuToggle(toggleButton, guiMenu)

        // this.toggleGroup = GuiMenuManager.instance.FindOrCreateToggleGroup("Navbar");
        // this.toggleGroup.AddToggle(this.menuToggle)

        toggleButton.onPointerDownObservable.add(()=>{
            this.ActivateModelMenu();
        })
        //Set Logic State after initializations
        MarkerMenuController.instance?.ToggleDisplayMarkers(DisplayStates.All);
    }

    Uninit(){
        // this.scene?.onPointerObservable.remove(this.sceneOnPointerObserver)
    }

    SetMarkerButtonsActionState(state: number){
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
                if(this.markerPopupContainer){
                    this.markerPopupContainer.isVisible = false
                }
                ObjectPickingManager.ActiveInstance?.ClearOnPickFunction()
                {
                    // const metadata = this.markerAddButton?.metadata
                    // metadata.isSelected = false
                    // EditingRoomMarkerUI._SetButtonColor(this.markerAddButton as Rectangle, metadata)
                    UIUtility.SetSelectedOff(this.markerAddButton as Control)
                }
                if(this.markerPopupContainer){
                    this.markerPopupContainer.isVisible = false
                }
                break;
            case ActionStates.Remove:
                MarkerMenuController.instance?.markerImages.forEach((image)=>{image.isEnabled = false;})
                {
                    // const metadata = this.markerDeleteButton?.metadata
                    // metadata.isSelected = false
                    // EditingRoomMarkerUI._SetButtonColor(this.markerDeleteButton as Rectangle, metadata)
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
                // const metadata = this.markerAddButton?.metadata
                // metadata.isSelected = true
                // EditingRoomMarkerUI._SetButtonColor(this.markerAddButton as Rectangle, metadata)
                UIUtility.SetSelectedOn(this.markerAddButton as Control)

                if(this.markerPopupContainer)
                    this.markerPopupContainer.isVisible = true

                // PickingManager.ActiveInstance?.AssignOnPickFunction(this._HandleMarkerAdd, this._CancelMarkerPlacementMode)
                break;
            case ActionStates.Remove:
                if(this.markerDeleteButton)
                    this.markerDeleteButton.background = ColorScheme.GetPurpleScale(0)
                
                MarkerMenuController.instance?.markerImages.forEach((image)=>{
                    image.isEnabled = true;
                })
                {
                    // const metadata = this.markerDeleteButton?.metadata
                    // metadata.isSelected = true
                    // EditingRoomMarkerUI._SetButtonColor(this.markerDeleteButton as Rectangle, metadata)
                    UIUtility.SetSelectedOn(this.markerDeleteButton as Control)
                }
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
        }
    }

    _HandleMarkerAdd_Position(markerID: number, posInfo: Vector3){

        var markerPos = posInfo;
        //offset the marker position by half the marker size (height)
        markerPos.y += MarkerMenuController.markerSize/2

        console.log("Adding marker in VR");
        console.log("Coords - X:", markerPos.x, "Y:", markerPos.y, "Z:", markerPos.z);

        var markerNormal = new Vector3();
        markerNormal.copyFrom(posInfo);
        markerNormal.normalize();
        markerNormal.y = 0 //Use only XZ plane for normal

        ServerObjectManager.instance?.RequestNewMarker(markerPos, markerNormal, markerID)
    }

    _HandleMarkerTypeSelection_VR(markerType: number){
        console.log("legggo")
        if(markerType < 0 || markerType > 4){
            console.warn("Invalid Marker Type Entered: ", markerType)
            return
        }
        
        const _this = VrMarkerToolMenuController.instance as VrMarkerToolMenuController

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
            // EditingRoomMarkerUI._SetButtonColor(rect, rect.metadata)
        })
    }

    public ActivateModelMenu()
    {
        this.markerPopupContainer.isVisible = false;
        this.markerActionsContainer.isVisible = true;   
    //   this.toggleGroup.ActivateToggle(this.menuToggle)
      this.SetMarkerButtonsActionState(ActionStates.None);
    }
}