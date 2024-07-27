import { AdvancedDynamicTexture, Image, Rectangle, TextBlock } from "@babylonjs/gui";
import { Scene, Vector3 } from "@babylonjs/core";

import { ServerObjectManager} from "../ServerObjectManager";
import { ColorScheme } from "../ColorScheme";
import { GUI_Menu, GUI_MenuToggle, GUI_MenuManager } from "../gui/GuiMenu";
import { PickingManager } from "../PickingManager";

import { vrMarkerToolCom } from "./vrMarkerToolCom";
import { ActionStates, DisplayStates, MarkerTypes } from "../../utils/enums";
import { MarkerButtonMetadata } from "../../utils/ButtonsMetadata";
import { EditingRoomMarkerUI_V2 } from "../gui/EditingRoomMarkerUI_V2";

export class vrMarkerToolCom_Menu_v2{
    public static instance: vrMarkerToolCom_Menu_v2 | null

    scene: Scene

    baseImage: Image | null = null                              //Base Image to clone and use for new markers
    markerVisibilityButton: Rectangle | null = null             //Visiblity Toggle button
    markerAddButton: Rectangle | null = null                    //Button to enable add mode to request creation of markers
    markerDeleteButton: Rectangle | null = null                 //Button to enable delete mode to request deletion of markers
    markerPopupContainer: Rectangle | null = null               //Container storing buttons to 4 types of marker to be places
    markerPopupButtons: Array<Rectangle> | null = null          //Collection of Buttons for each type of marker that can be created
    markerPopupText: TextBlock | null = null
    advDynamicTexture: AdvancedDynamicTexture | null = null

    actionState: number = 0
    markerAddType: number = 0

    public menuToggle: any;
    public toggleGroup: any;

    constructor()
    {
        if(vrMarkerToolCom_Menu_v2.instance)
        {
            vrMarkerToolCom_Menu_v2.instance.Uninit()
            vrMarkerToolCom_Menu_v2.instance = null
        }
        vrMarkerToolCom_Menu_v2.instance = this
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

        //Setting Up Marker Actions
        this.markerAddButton = this.advDynamicTexture.getControlByName("Marker_Create") as Rectangle
        this.markerDeleteButton = this.advDynamicTexture.getControlByName("Marker_Delete") as Rectangle
        this.markerAddButton.children[0].isEnabled = false
        this.markerDeleteButton.children[0].isEnabled = false

        this.markerAddButton.metadata = new MarkerButtonMetadata()
        this.markerDeleteButton.metadata = new MarkerButtonMetadata()

        this.markerAddButton.onPointerEnterObservable.add(EditingRoomMarkerUI_V2._HoverOnFunc)
        this.markerAddButton.onPointerOutObservable.add(EditingRoomMarkerUI_V2._HoverOffFunc)
        this.markerDeleteButton.onPointerEnterObservable.add(EditingRoomMarkerUI_V2._HoverOnFunc)
        this.markerDeleteButton.onPointerOutObservable.add(EditingRoomMarkerUI_V2._HoverOffFunc)

        this.markerAddButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerAddButton)return
            _this.SetMarkerButtonsActionState(ActionStates.Add)
            vrMarkerToolCom.instance.TryUpdateActionState(1);
        })

        this.markerDeleteButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerDeleteButton) return
            _this.SetMarkerButtonsActionState(ActionStates.Remove)
            vrMarkerToolCom.instance.TryUpdateActionState(2);
        })

        //Setting up Marker View Toggle
        this.markerVisibilityButton = this.advDynamicTexture.getControlByName("Marker_Visibility") as Rectangle
        this.markerVisibilityButton.children[0].isEnabled = false
        this.markerVisibilityButton.metadata = new MarkerButtonMetadata(-1, false, true)
        EditingRoomMarkerUI_V2._SetButtonColor(this.markerVisibilityButton as Rectangle, this.markerVisibilityButton.metadata)

        this.markerVisibilityButton.onPointerEnterObservable.add((EditingRoomMarkerUI_V2._HoverOnFunc))
        this.markerVisibilityButton.onPointerOutObservable.add(EditingRoomMarkerUI_V2._HoverOffFunc)
        this.markerVisibilityButton.onPointerUpObservable.add((mousePos, eventState)=>{
            mousePos //Suppress warning
            if(eventState.target !== _this.markerVisibilityButton) return

            eventState.target.metadata.isSelected = !eventState.target.metadata.isSelected
            EditingRoomMarkerUI_V2.instance?.ToggleDisplayMarkers();
            EditingRoomMarkerUI_V2._SetButtonColor(eventState.target as Rectangle, eventState.target.metadata)
        })
        
        //Setting Up Marker Types Popup
        //Notes: This seems to be hardcoded to the 4 UI template buttons (not an issue)
        this.markerPopupContainer = this.advDynamicTexture.getControlByName("Marker_CreateMenu") as Rectangle
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
            rect.onPointerDownObservable.add((pointerPos, eventState)=>{
                if(pointerPos){} //Suppress Warning
                if(eventState.target !== rect) 
                    return
                _this._HandleMarkerTypeSelection_VR(eventState.target.metadata.id)
                vrMarkerToolCom.instance.TryUpdateSelectedMarker(eventState.target.metadata.id)
                rect.metadata.isSelected = !rect.metadata.isSelected
            })
            rect.onPointerEnterObservable.add(EditingRoomMarkerUI_V2._HoverOnFunc)
            rect.onPointerOutObservable.add(EditingRoomMarkerUI_V2._HoverOffFunc)
            rect.metadata = new MarkerButtonMetadata(index + 1, false, false)
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
                toggleButton.background = ColorScheme.Selectable_Transparency
                toggleButton.alpha = .7;
            }
        })
        toggleButton.children.forEach((child)=>child.isEnabled = false)

        const markerActionsContainer = this.advDynamicTexture.getControlByName("Marker_Group") as Rectangle
        markerActionsContainer.isVisible = false

        const guiMenu = new GUI_Menu(markerActionsContainer)
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

        this.menuToggle = new GUI_MenuToggle(toggleButton, guiMenu)

        this.toggleGroup = GUI_MenuManager.instance.FindOrCreateToggleGroup("Navbar");
        this.toggleGroup.AddToggle(this.menuToggle)

        toggleButton.onPointerDownObservable.add(()=>{
            this.ActivateModelMenu();
        })
        //Set Logic State after initializations
        EditingRoomMarkerUI_V2.instance?.ToggleDisplayMarkers(DisplayStates.All);
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
                PickingManager.ActiveInstance?.ClearOnPickFunction()
                {
                    const metadata = this.markerAddButton?.metadata
                    metadata.isSelected = false
                    EditingRoomMarkerUI_V2._SetButtonColor(this.markerAddButton as Rectangle, metadata)
                }
                if(this.markerPopupContainer){
                    this.markerPopupContainer.isVisible = false
                }
                break;
            case ActionStates.Remove:
                EditingRoomMarkerUI_V2.instance?.markerImages.forEach((image)=>{image.isEnabled = false;})
                {
                    const metadata = this.markerDeleteButton?.metadata
                    metadata.isSelected = false
                    EditingRoomMarkerUI_V2._SetButtonColor(this.markerDeleteButton as Rectangle, metadata)
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
                const metadata = this.markerAddButton?.metadata
                metadata.isSelected = true
                EditingRoomMarkerUI_V2._SetButtonColor(this.markerAddButton as Rectangle, metadata)

                if(this.markerPopupContainer)
                    this.markerPopupContainer.isVisible = true

                // PickingManager.ActiveInstance?.AssignOnPickFunction(this._HandleMarkerAdd, this._CancelMarkerPlacementMode)
                break;
            case ActionStates.Remove:
                if(this.markerDeleteButton)
                    this.markerDeleteButton.background = ColorScheme.GetPurpleScale(0)
                
                EditingRoomMarkerUI_V2.instance?.markerImages.forEach((image)=>{
                    image.isEnabled = true;
                })
                {
                    const metadata = this.markerDeleteButton?.metadata
                    metadata.isSelected = true
                    EditingRoomMarkerUI_V2._SetButtonColor(this.markerDeleteButton as Rectangle, metadata)
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
        markerPos.y += EditingRoomMarkerUI_V2.markerSize/2

        console.log("Adding marker in VR");
        console.log("Coords - X:", markerPos.x, "Y:", markerPos.y, "Z:", markerPos.z);

        var markerNormal = new Vector3();
        markerNormal.copyFrom(posInfo);
        markerNormal.normalize();
        markerNormal.y = 0 //Use only XZ plane for normal

        ServerObjectManager.instance?._RequestNewMarker(markerPos, markerNormal, markerID)
    }

    _HandleMarkerTypeSelection_VR(markerType: number){
        if(markerType < 0 || markerType > 4){
            console.warn("Invalid Marker Type Entered: ", markerType)
            return
        }
        
        const _this = vrMarkerToolCom_Menu_v2.instance as vrMarkerToolCom_Menu_v2

        let string = ""
        switch(markerType){
            case MarkerTypes.ambulance: 
            string = "Set anaaa ambulance assembly and evacuation zone."
            break;

            case MarkerTypes.debrisclearingteam: 
            string = "Request to prioritize debris removal and cleanup of the marked area."
            break;
            
            case MarkerTypes.electricalhazard:
            string = "Mark an area as containing dangerous hazards."
            break;

            case MarkerTypes.searchsite: 
            string = "Request to setup search and rescue operations around the marked area."
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
            EditingRoomMarkerUI_V2._SetButtonColor(rect, rect.metadata)
        })
    }

    public ActivateModelMenu()
    {
      this.toggleGroup.ActivateToggle(this.menuToggle)
      this.SetMarkerButtonsActionState(ActionStates.None);
    }
}