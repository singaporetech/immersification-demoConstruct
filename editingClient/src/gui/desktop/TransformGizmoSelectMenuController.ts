import { ColorScheme } from "../../utilities/ColorScheme";
import { Rectangle, AdvancedDynamicTexture } from "@babylonjs/gui";
import { TransformGizmoSelector, TransformGizmoSelectEvent } from "../../transformTool/desktop/TransformGizmoSelector";
import { ABaseTool } from "../../tool/ABaseTool";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { UIUtility } from "../../utilities/UIUtility";

/**
 * @classdesc
 * Defines the menu behaviour for gizmos and binds menu controls to activate the desired
 * BabylonJS Gizmos. Currently using the same menu as transform inspector.
 */
export class TransformGizmoSelectMenuController extends ABaseTool {

  static instance: TransformGizmoSelectMenuController;
  gizmoManager: any;
  
  // originalColor: string;
  // originalHoveredColor: string;
  // selectedColor: string;
  // selectedHoveredColor: string;
  
  buttons: any[];
  
  constructor(gizmoManager: any) {
    super()
    this.gizmoManager = gizmoManager;

    // this.originalColor = ColorScheme.Selectable;
    // this.originalHoveredColor = ColorScheme.hoverSelectable;
    // this.selectedColor = ColorScheme.Selected;
    // this.selectedHoveredColor = ColorScheme.Selected;

    this.buttons = []; //array storing the gizmo buttons

    TransformGizmoSelectMenuController.instance = this;
  }

  public SetToolActionState(actionState?: number, callback?: (result?: any) => void): void {
    throw new Error("Method not implemented.");
  }

  /**
   * Change display color of buttons depending on if button is selected or not.
   * @param {int} buttonNum - Index in button array for which gizmo to set.
   * @param {bool} isSelected - If button is currently selected or not.
   */
  SetButtonSelectState(buttonNum: number, isSelected: boolean) {
    const button = this.buttons[buttonNum];
    button.metadata.isSelected = isSelected;

    if (button.metadata.isSelected)
    {
      if(button.metadata.isHovered)
        {
          button.background = ColorScheme.Selected
          button.alpha = 1
        }
        else
        {
          button.background = ColorScheme.Selected
          // button.background = ColorScheme.Selected
          button.alpha = 1
        }
      // button.background = button.isHovered ? this.selectedHoveredColor
      //   : this.selectedColor;
    } 
    else 
    {
      if(button.metadata.isHovered)
        {
          button.background = ColorScheme.hoverSelectable
          button.alpha = 1
        }
        else
        {
          button.background = ColorScheme.Selectable
          button.alpha = 1
        }
    }
  }

  // /**
  //  * Callback for when the button is hovered over by user, to change colour and state of button.
  //  * @param {BabylonJS Control} button - Control of the button to set.
  //  */
  // Button_HoverOn(button: any) {
  //   const gizmoSelect = GizmoSelect_MenuController.instance;
  //   button.isHovered = true;

  //   if(button.isSelected)
  //     {
  //       button.background = gizmoSelect?.selectedHoveredColor
  //       button.alpha = 1
  //     }
  //     else
  //     {
  //       button.background = gizmoSelect?.originalHoveredColor
  //       button.alpha = 1
  //     }
  //   // button.background = button.isSelected
  //   //   ? gizmoSelect.selectedHoveredColor
  //   //   : gizmoSelect.originalHoveredColor;
  // }

  // /**
  //  * Callback for when the user exits hovering over button, to change colour and state of button.
  //  * @param {BabylonJS Control} button - Control of the button to set.
  //  */
  // Button_HoverOff(button: any) {
  //   const gizmoSelect = GizmoSelect_MenuController.instance;
  //   button.isHovered = false;

  //   if(button.isSelected)
  //     {
  //       button.background = gizmoSelect?.selectedColor
  //       button.alpha = 1
  //     }
  //     else
  //     {
  //       button.background = gizmoSelect?.originalColor
  //       button.alpha = .7
  //     }
  //   // button.background = button.isSelected
  //   //   ? gizmoSelect.selectedColor
  //   //   : gizmoSelect.originalColor;
  // }

  /**
   * Callback function for observer when a button is selected and needs to change state.
   * @param {*} mousePosition - Mouse state passed in by Oberserver callback.
   * @param {*} eventState
   */
  SetSelectedButton(evnt: TransformGizmoSelectEvent) {
    const _this = TransformGizmoSelectMenuController.instance
    _this.buttons.forEach((button, index)=>{
      if(evnt.selectedIndex == button.metadata.id){
        _this.SetButtonSelectState(index, true)
      }else{
        _this.SetButtonSelectState(index, false)
      }
    })
  }

  Button_OnClick(mousePos: any, eventState: any){
    mousePos //Suppress Warning
    const buttonIndex = eventState.target.metadata.id //TOOD: check if this is correct 
    const iselected = eventState.target.metadata.isSelected
    TransformGizmoSelector.ActiveInstance?.SetSelectedGizmo(buttonIndex)
  }

  public DeselectTool()
  {
    for (let i = 0; i < this.buttons.length; ++i)
      {
        this.buttons[i].isHovered = false
        this.buttons[i].background = ColorScheme.Selectable //this.originalColor;
        this.buttons[i].alpha = 1
      }

  }

  Init(advTexture: AdvancedDynamicTexture, gizmoControlName: string) {
    for (let i = 0; i < 3; ++i) {
      const button = advTexture.getControlByName(gizmoControlName + i) as Rectangle;
      button.metadata = new ButtonMetadata(i + 1, false, false);

      button.onPointerEnterObservable.add(UIUtility.SetHoverOn);
      // button.onPointerEnterObservable.add(() => {button.metadata.isHovered = true});
      button.onPointerOutObservable.add(UIUtility.SetHoverOff);
      // button.onPointerOutObservable.add(() => {button.metadata.isHovered = false});
      button.onPointerDownObservable.add(this.Button_OnClick);
        // () => { button.metadata.isSelected = !button.metadata.isSelected;
        //                                         this.Button_OnClick});

      // button.metadata.buttonIndex = i + 1;

      this.buttons.push(button);

      button.children[0].isEnabled = false
    }

    const gizmoSelector = TransformGizmoSelector.ActiveInstance
    if(gizmoSelector){
      gizmoSelector.gizmoSelectListener.Subscribe(this.SetSelectedButton)
    }
  }

  Uninit(){
    const gizmoSelector = TransformGizmoSelector.ActiveInstance
    if(gizmoSelector){
      gizmoSelector.gizmoSelectListener.Unsubscribe(this.SetSelectedButton)
    }
  }
}