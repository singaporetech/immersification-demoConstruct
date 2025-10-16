import { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui"
import { Scene } from "@babylonjs/core"
import { ColorScheme } from "../../utilities/ColorScheme"
import { TransformGizmoSelector } from "../../transformTool/desktop/TransformGizmoSelector"
import { ABaseTool } from "../../tool/ABaseTool"
import { GuiMenu, GuiMenuManager, GuiMenuToggle } from "../GuiMenu"
import { TransformGizmoSelectMenuController } from "./TransformGizmoSelectMenuController"
import { UIUtility } from "../../utilities/UIUtility"
import { ButtonMetadata } from "../../utilities/data/ObjectsData"

export class TransformMenuController {
    public instance: TransformMenuController | null = null
    advDynamicTexture: AdvancedDynamicTexture | null = null
    scene!: Scene

    navbarButton!: Rectangle
    selectActionsContainer!: Rectangle

    constructor()
    {
    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        const _this = this

        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        this.navbarButton = advDynamicTexture.getControlByName("Navbar_MenuToggle_Transform") as Rectangle
        this.selectActionsContainer = advDynamicTexture.getControlByName("Transform_Container") as Rectangle

        this.navbarButton.metadata = new ButtonMetadata(-1, false, false);
        this.navbarButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        //     ()=>{
        //     // if(this.navbarButton.metadata.isSelected){
                
        //     //     // this.navbarButton.background = ColorScheme.Selected
        //     //     // this.navbarButton.alpha = 1;
        //     // }else{
        //     //     // this.navbarButton.background = ColorScheme.hoverSelectable
        //     //     // this.navbarButton.alpha = 1;
        //     // }
        // })
        this.navbarButton.onPointerOutObservable.add(UIUtility.SetHoverOff)
        //     ()=>{
        //     if(_this.navbarButton.metadata.isSelected){
        //         // _this.navbarButton.background = ColorScheme.Selected
        //         // this.navbarButton.alpha = 1;
        //     }else{
        //         // _this.navbarButton.background = ColorScheme.Selectable
        //         // this.navbarButton.alpha = .7;
        //     }
        // })
        this.navbarButton.children.forEach((child)=>child.isEnabled = false)

        const guiMenu = new GuiMenu(this.selectActionsContainer)
        guiMenu.OnEnableCallback = function(){
            guiMenu.container.isVisible = true
            _this.navbarButton.metadata.isSelected = true
        }

        guiMenu.OnDisableCallback = function(){
            guiMenu.container.isVisible = false
            if(_this.selectActionsContainer){
                _this.selectActionsContainer.isVisible = false
            }
            _this.navbarButton.metadata.isSelected = false
        }

        this.selectActionsContainer.isVisible = false;

        const menuTransformGroup = new GuiMenuToggle(this.navbarButton, guiMenu)
        menuTransformGroup.AddLinkedTool(TransformGizmoSelector.instance as ABaseTool)
        menuTransformGroup.AddLinkedTool(TransformGizmoSelectMenuController.instance as ABaseTool)

        const toggleGroup = GuiMenuManager.instance.FindOrCreateToggleGroup("Navbar");
        toggleGroup.AddToggle(menuTransformGroup)

        //user selects button
        this.navbarButton.onPointerDownObservable.add(()=>{
            toggleGroup.ActivateToggle(menuTransformGroup)
        })
    }
}