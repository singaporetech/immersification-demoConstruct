import { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui"
import { GUI_Menu, GUI_MenuManager, GUI_MenuToggle } from "./GuiMenu"
import { Scene } from "@babylonjs/core"
import { ColorScheme } from "../ColorScheme"
import { GizmoSelector } from "../GizmoSelector"
import { GizmoSelect_UI } from "./GizmoSelect_UI"
import { BaseTool } from "../BaseTool"

export class Transform_Menu {
    public instance: Transform_Menu | null = null
    advDynamicTexture: AdvancedDynamicTexture | null = null
    scene!: Scene

    toggleButton!: Rectangle
    toolsContainer!: Rectangle

    constructor()
    {

    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        const _this = this

        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        this.toggleButton = advDynamicTexture.getControlByName("Navbar_MenuToggle_Transform") as Rectangle
        this.toolsContainer = advDynamicTexture.getControlByName("Transform_Container") as Rectangle

        //Setup toggle actions
        this.toggleButton.metadata = {
            isSelected: false
        }

        this.toggleButton.onPointerEnterObservable.add(()=>{
            if(this.toggleButton.metadata.isSelected){
                this.toggleButton.background = ColorScheme.Selected
                this.toggleButton.alpha = 1;
            }else{
                this.toggleButton.background = ColorScheme.hoverSelectable
                this.toggleButton.alpha = 1;
            }
        })
        _this.toggleButton.onPointerOutObservable.add(()=>{
            if(_this.toggleButton.metadata.isSelected){
                _this.toggleButton.background = ColorScheme.Selected
                this.toggleButton.alpha = 1;
            }else{
                _this.toggleButton.background = ColorScheme.Selectable_Transparency
                this.toggleButton.alpha = .7;
            }
        })
        _this.toggleButton.children.forEach((child)=>child.isEnabled = false)

        const guiMenu = new GUI_Menu(this.toolsContainer)
        guiMenu.OnEnableCallback = function(){
            guiMenu.container.isVisible = true
            _this.toggleButton.metadata.isSelected = true
        }

        guiMenu.OnDisableCallback = function(){
            guiMenu.container.isVisible = false
            if(_this.toolsContainer){
                _this.toolsContainer.isVisible = false
            }
            _this.toggleButton.metadata.isSelected = false
        }

        this.toolsContainer.isVisible = false;

        const menuTransformGroup = new GUI_MenuToggle(this.toggleButton, guiMenu)
        menuTransformGroup.AddLinkedTool(GizmoSelector.instance as BaseTool)
        menuTransformGroup.AddLinkedTool(GizmoSelect_UI.instance as BaseTool)

        const toggleGroup = GUI_MenuManager.instance.FindOrCreateToggleGroup("Navbar");
        toggleGroup.AddToggle(menuTransformGroup)

        //user selects button
        this.toggleButton.onPointerDownObservable.add(()=>{
            toggleGroup.ActivateToggle(menuTransformGroup)
        })
    }
}