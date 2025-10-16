import { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui";
import { ColorScheme } from "../../utilities/ColorScheme";
import { GuiMenu, GuiMenuManager, GuiMenuToggle } from "../GuiMenu";

export class CollaboratorsInfoPanelMenuController{
    private static instance: CollaboratorsInfoPanelMenuController | null

    toggleButton: Rectangle | null = null
    
    displayNameCallback: ((isDisplayed: boolean)=>void) | null = null

    constructor() {
        CollaboratorsInfoPanelMenuController.instance = this
    }

    ToggleOnHoverOn(){
        const button = CollaboratorsInfoPanelMenuController.instance?.toggleButton
        if(button){
            if(button.metadata.isSelected){
                button.background = ColorScheme.hoverSelectable
            }else{
                button.background = ColorScheme.BackgroundHighlighted
            }
        }
    }

    ToggleOnHoverOff(){
        const button = CollaboratorsInfoPanelMenuController.instance?.toggleButton
        if(button){
            if(button.metadata.isSelected){
                button.background = ColorScheme.Selected
                button.alpha = 1;
            }else{
                button.background = ColorScheme.Selectable
                button.alpha = .7;
            }
        }
    }

    Init(advTexture: AdvancedDynamicTexture, displayNameCallback: (isDisplaying: boolean)=>void){
        const _this = this;
        this.displayNameCallback = displayNameCallback
        //Initializing babylonjs rect for Toggle Button
        this.toggleButton = advTexture.getControlByName("Collaborators_MenuToggle") as Rectangle;
        this.toggleButton.children.forEach((child)=>child.isEnabled = false)
        this.toggleButton.onPointerEnterObservable.add(_this.ToggleOnHoverOn)
        this.toggleButton.onPointerOutObservable.add(_this.ToggleOnHoverOff)
        this.toggleButton.metadata = {
            isSelected: false
        }
        this.toggleButton.children.forEach((child)=> child.isEnabled = false)

        //Initializing Collaborators Menu
        const collaboratorsMenu = advTexture.getControlByName("CollaboratorInfo_Container") as Rectangle;
        collaboratorsMenu.isVisible = false

        //Setting up Toggle Button
        const menu = new GuiMenu(collaboratorsMenu)
        menu.OnEnableCallback = function(){
            menu.container.isVisible = true
            if(_this.displayNameCallback){
                _this.displayNameCallback(true)
            }
        }
        menu.OnDisableCallback = function(){
            menu.container.isVisible = false
            if(_this.displayNameCallback){
                _this.displayNameCallback(false)
            }
        }

        const guiToggle = new GuiMenuToggle(this.toggleButton, menu)
        const toggleGroup = GuiMenuManager.instance.FindOrCreateToggleGroup("Collaborators");
        toggleGroup.AddToggle(guiToggle)

        this.toggleButton.onPointerDownObservable.add(()=>{
            toggleGroup.ActivateToggle(guiToggle)
            if(_this.toggleButton){
                _this.toggleButton.metadata.isSelected = !_this.toggleButton.metadata.isSelected
            }
        })

        this.toggleButton.isEnabled = false;
        this.toggleButton.isVisible = false;
    }
}