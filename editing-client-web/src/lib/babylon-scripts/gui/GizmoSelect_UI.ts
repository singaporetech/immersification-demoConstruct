import { ColorScheme } from "../ColorScheme";
import { Rectangle, AdvancedDynamicTexture } from "@babylonjs/gui";
import { GizmoSelector, GizmoSelectEvent } from "../GizmoSelector";
import { BaseTool } from "../BaseTool";


class GizmoButtonMetadata{
  public buttonIndex = -1
  public isHovered = false
  public isSelected = false
}

/**
 * @classdesc
 * Defines the menu behaviour for gizmos and binds menu controls to activate the desired
 * BabylonJS Gizmos. Currently using the same menu as transform inspector.
 */
export class GizmoSelect_UI extends BaseTool {
  static instance: GizmoSelect_UI;
  gizmoManager: any;
  
  originalColor: string;
  originalHoveredColor: string;
  selectedColor: string;
  selectedHoveredColor: string;
  
  buttons: any[];
  
  constructor(gizmoManager: any) {
    super()
    this.gizmoManager = gizmoManager;

    this.originalColor = ColorScheme.Selectable_Transparency;
    this.originalHoveredColor = ColorScheme.hoverSelectable;
    this.selectedColor = ColorScheme.Selected;
    this.selectedHoveredColor = ColorScheme.Selected;

    this.buttons = []; //array storing the gizmo buttons

    GizmoSelect_UI.instance = this;
  }

  /**
   * Change display color of buttons depending on if button is selected or not.
   * @param {int} buttonNum - Index in button array for which gizmo to set.
   * @param {bool} isSelected - If button is currently selected or not.
   */
  SetButtonSelectState(buttonNum: number, isSelected: boolean) {
    const button = this.buttons[buttonNum];
    button.isSelected = isSelected;

    if (isSelected)
    {
      if(button.isHovered)
        {
          button.background = this.selectedHoveredColor
          button.alpha = 1
        }
        else
        {
          button.background = this.selectedColor
          button.alpha = 1
        }
      // button.background = button.isHovered ? this.selectedHoveredColor
      //   : this.selectedColor;
    } 
    else 
    {
      if(button.isHovered)
        {
          button.background = this.originalHoveredColor
          button.alpha = 1
        }
        else
        {
          button.background = this.originalColor
          button.alpha = .7
        }
    }
  }

  /**
   * Callback for when the button is hovered over by user, to change colour and state of button.
   * @param {BabylonJS Control} button - Control of the button to set.
   */
  Button_HoverOn(button: any) {
    const gizmoSelect = GizmoSelect_UI.instance;
    button.isHovered = true;

    if(button.isSelected)
      {
        button.background = gizmoSelect?.selectedHoveredColor
        button.alpha = 1
      }
      else
      {
        button.background = gizmoSelect?.originalHoveredColor
        button.alpha = 1
      }
    // button.background = button.isSelected
    //   ? gizmoSelect.selectedHoveredColor
    //   : gizmoSelect.originalHoveredColor;
  }

  /**
   * Callback for when the user exits hovering over button, to change colour and state of button.
   * @param {BabylonJS Control} button - Control of the button to set.
   */
  Button_HoverOff(button: any) {
    const gizmoSelect = GizmoSelect_UI.instance;
    button.isHovered = false;

    if(button.isSelected)
      {
        button.background = gizmoSelect?.selectedColor
        button.alpha = 1
      }
      else
      {
        button.background = gizmoSelect?.originalColor
        button.alpha = .7
      }
    // button.background = button.isSelected
    //   ? gizmoSelect.selectedColor
    //   : gizmoSelect.originalColor;
  }

  /**
   * Callback function for observer when a button is selected and needs to change state.
   * @param {*} mousePosition - Mouse state passed in by Oberserver callback.
   * @param {*} eventState
   */
  SetSelectedButton(evnt: GizmoSelectEvent) {
    const _this = GizmoSelect_UI.instance
    _this.buttons.forEach((button, index)=>{
      if(evnt.selectedIndex === button.metadata.buttonIndex){
        _this.SetButtonSelectState(index, true)
      }else{
        _this.SetButtonSelectState(index, false)
      }
    })
  }

  Button_OnClick(mousePos: any, eventState: any){
    mousePos //Suppress Warning
    const buttonIndex = eventState.target.metadata.buttonIndex
    GizmoSelector.ActiveInstance?.SetSelectedGizmo(buttonIndex)
  }

  public DeselectTool()
  {
    for (let i = 0; i < this.buttons.length; ++i)
      {
        this.buttons[i].isHovered = false
        this.buttons[i].background =this.originalColor;
        this.buttons[i].alpha = .7
      }

  }

  Init(advTexture: AdvancedDynamicTexture, gizmoControlName: string) {
    for (let i = 0; i < 3; ++i) {
      const button = advTexture.getControlByName(gizmoControlName + i) as Rectangle;
      button.metadata = new GizmoButtonMetadata();

      button.onPointerEnterObservable.add(this.Button_HoverOn);
      button.onPointerOutObservable.add(this.Button_HoverOff);
      button.onPointerDownObservable.add(this.Button_OnClick);

      button.metadata.buttonIndex = i + 1;
      this.buttons.push(button);

      button.children[0].isEnabled = false
    }

    const gizmoSelector = GizmoSelector.ActiveInstance
    if(gizmoSelector){
      gizmoSelector.gizmoSelectListener.Subscribe(this.SetSelectedButton)
    }
  }

  Uninit(){
    const gizmoSelector = GizmoSelector.ActiveInstance
    if(gizmoSelector){
      gizmoSelector.gizmoSelectListener.Unsubscribe(this.SetSelectedButton)
    }
  }
}