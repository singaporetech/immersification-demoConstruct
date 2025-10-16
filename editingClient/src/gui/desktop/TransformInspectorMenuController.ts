/**
 *  ========= DEPRCATED =======
 * @fileoverview
 * Defines the menu for viewing the selected object's transformation and manages the controls
 * required to allow user input to affect transformation.
 */

import { KeyboardEventTypes, Nullable} from "@babylonjs/core";
import { MathUtility } from "../../utilities/MathUtility";
import { ColorScheme } from "../../utilities/ColorScheme";
import {
  AdvancedDynamicTexture,
  Container,
  Control,
  Image,
  Rectangle,
} from "@babylonjs/gui";
import { SelectMeshEvent, DeselectMeshEvent, ObjectPickingManager } from "../../objectPickingSelection/ObjectPickingManager";
import { GuiMenuManager } from "../GuiMenu";
import { Vector3UIControl } from "../UIComponents";
import { GuiManager } from "./GuiManager";

/**
 * @classdesc
 * Defines the class managing the menu's to bind the textInputControls to modify
 * the transformation of the select object.
 */
export class TransformInspectorMenuController {
  private static instance: TransformInspectorMenuController

  position: Vector3UIControl;
  rotation: Vector3UIControl;
  scale: Vector3UIControl;
  gizmoSelect: GizmoSelectionModeMenuController;
  constructor(gizmoManager: any) {
    this.position = new Vector3UIControl(); //Stores a class that holds 3 controls for each axis
    this.rotation = new Vector3UIControl(); //Stores a class that holds 3 controls for each axis
    this.scale = new Vector3UIControl(); //Stores a class that holds 3 controls for each axis
    this.gizmoSelect = new GizmoSelectionModeMenuController(gizmoManager);

    TransformInspectorMenuController.instance = this
  }

  /**
   * Callback function to update the position of selected model.
   * @param {*} control - control Object passed in from Observable function call.
   */
  UpdatePickedPosition(control: any) {
    const transformUI = TransformInspectorMenuController.instance;
    const pickedObject = ObjectPickingManager.GetSelectedObject();
    if (control._isFocused && pickedObject) {
      const posUI = transformUI.position;
      switch (control._managedInput) {
        case "x":
          pickedObject.position.x = parseFloat(posUI.x.text ? posUI.x.text : "0");
          break;
        case "y":
          pickedObject.position.y = parseFloat(posUI.y.text ? posUI.y.text : "0");
          break;
        case "z":
          pickedObject.position.z = parseFloat(posUI.z.text ? posUI.z.text : "0");
          break;
        default:
          console.warn(
            "UpdatePickedPosition Expected x,y, or z. Received: " +
              control._managedInput
          );
      }
    }
  }

  /**
   * Callback function to update the rotation of selected model.
   * @param {*} control - control Object passed in from Observable function call.
   */
  UpdatePickedRotation(control: any) {
    const transformUI = TransformInspectorMenuController.instance;
    const pickedObject = ObjectPickingManager.GetSelectedObject();
    if (control._isFocused && pickedObject) {
      const rotUI = transformUI.rotation;
      switch (control._managedInput) {
        case "x":
          pickedObject.rotation.x = MathUtility.DegreesToRadians(
            parseFloat(rotUI.x.text)
          );
          break;
        case "y":
          pickedObject.rotation.y = MathUtility.DegreesToRadians(
            parseFloat(rotUI.y.text)
          );
          break;
        case "z":
          pickedObject.rotation.z = MathUtility.DegreesToRadians(
            parseFloat(rotUI.z.text)
          );
          break;
        default:
          console.warn(
            "UpdatePickedRotation Expected x,y, or z. Received: " +
              control._managedInput
          );
      }
    }
  }

  /**
   * Callback function to update the scale of selected model.
   * @param {*} control - Control object passed in from Observable function call.
   */
  UpdatePickedScale(control: any) {
    const transformUI = TransformInspectorMenuController.instance;
    const pickedObject = ObjectPickingManager.GetSelectedObject();
    if (control._isFocused && pickedObject) {
      const scaleUI = transformUI.scale;
      switch (control._managedInput) {
        case "x":
          pickedObject.scaling.x = parseFloat(scaleUI.x.text ? scaleUI.x.text : "0");
          break;
        case "y":
          pickedObject.scaling.y = parseFloat(scaleUI.y.text ? scaleUI.y.text : "0");
          break;
        case "z":
          pickedObject.scaling.z = parseFloat(scaleUI.z.text ? scaleUI.z.text : "0");
          break;
        default:
          console.warn(
            "UpdatePickedScale Expected x, y, or z. Received: " +
              control._managedInput
          );
      }
    }
  }

  /**
   * Callback function to set control as focused.
   * @param {*} control - control Object passed in from Observable function call.
   */
  Input_MarkFocused(control: any) {
    control._isFocused = true;
  }

  /**
   * Callback function to set control as blurred.
   * @param {*} control - control Object passed in from Observable function call.
   */
  Input_MarkBlurred(control: any) {
    control._isFocused = false;
  }

  Init(advTexture: AdvancedDynamicTexture, menuManager: GuiMenuManager) {
    GuiManager.instance.scene?.onBeforeRenderObservable.add(
      this.UpdateTransformValues
    );

    //Initializing Text Input fields
    for (let i = 0; i < 9; ++i) {
      const textInput = advTexture.getControlByName(
        "MoveMenu_TextInput_" + i
      ) as any;
      const quotient = Math.floor(i / 3);
      const remainder = i % 3;

      textInput._isFocused = false;

      //Binding Observable Functions.
      textInput.onBeforeKeyAddObservable.add(
        GuiManager.Input_OnlyAcceptNumbers
      );
      textInput.onFocusObservable.add(this.Input_MarkFocused);
      textInput.onBlurObservable.add(this.Input_MarkBlurred);

      //Find UI group (position, rotation or scale) and cache to controls to this gui manager.
      let uiGroup: Nullable<Vector3UIControl> = new Vector3UIControl();
      switch (quotient) {
        case 0:
          uiGroup = this.position;
          textInput.onTextChangedObservable.add(this.UpdatePickedPosition);
          break;
        case 1:
          uiGroup = this.rotation;
          textInput.onTextChangedObservable.add(this.UpdatePickedRotation);
          break;
        case 2:
          uiGroup = this.scale;
          textInput.onTextChangedObservable.add(this.UpdatePickedScale);
          break;
        default:
      }

      switch (remainder) {
        case 0:
          uiGroup.x = textInput;
          uiGroup.x._managedInput = "x";
          break;
        case 1:
          uiGroup.y = textInput;
          uiGroup.y._managedInput = "y";
          break;
        case 2:
          uiGroup.z = textInput;
          uiGroup.z._managedInput = "z";
          break;
        default:
      }
    }

    //Initialize controls to use GUI_Menu functionality.
    //See GuiMenu.js for menuManager class.
    const menu = advTexture.getControlByName("MoveMenu_Container") as Container;
    const moveControl = advTexture.getControlByName("MoveMenu_TitleText") as Control;
    const toggleControl = advTexture.getControlByName("Edit_Menu_Toggle_2") as Control;
    menuManager.CreateDefaultBehaviour(
      menu,
      moveControl,
      toggleControl,
      "Edit"
    );

    const toggleImage = advTexture.getControlByName(
      "Edit_Menu_Image_2"
    ) as Image;
    toggleImage.isEnabled = false;
    this.gizmoSelect.Init(advTexture);
  }

  Uninit(){
    this.gizmoSelect.Uninit()
  }

  /**
   * Updates values stored in Menu controls to reflect value of mesh transformation.
   */
  UpdateTransformValues() {
    const transformUI = TransformInspectorMenuController.instance;
    const picked = ObjectPickingManager.GetSelectedObject();
    if (!picked) return;

    const posUI = transformUI.position;
    const rotUI = transformUI.rotation;
    const scaleUI = transformUI.scale;

    //Update text values. Only update if user has not selected it.
    if (!posUI.x._isFocused)
      posUI.x.text = picked.position.x.toFixed(1);
    if (!posUI.y._isFocused)
      posUI.y.text = picked.position.y.toFixed(1);
    if (!posUI.z._isFocused)
      posUI.z.text = picked.position.z.toFixed(1);

    if (!rotUI.x._isFocused)
      rotUI.x.text = MathUtility.RadiansToDegrees(picked.rotation.x).toFixed(
        0
      );
    if (!rotUI.y._isFocused)
      rotUI.y.text = MathUtility.RadiansToDegrees(picked.rotation.y).toFixed(
        0
      );
    if (!rotUI.z._isFocused)
      rotUI.z.text = MathUtility.RadiansToDegrees(picked.rotation.z).toFixed(
        0
      );

    if (!scaleUI.x._isFocused)
      scaleUI.x.text = picked.scaling.x.toFixed(1);
    if (!scaleUI.y._isFocused)
      scaleUI.y.text = picked.scaling.y.toFixed(1);
    if (!scaleUI.z._isFocused)
      scaleUI.z.text = picked.scaling.z.toFixed(1);
  }
}

/**
 * @classdesc
 * Defines the menu behaviour for gizmos and binds menu controls to activate the desired
 * BabylonJS Gizmos. Currently using the same menu as transform inspector.
 */
export class GizmoSelectionModeMenuController {
  static instance: GizmoSelectionModeMenuController;
  gizmoManager: any;
  originalColor: string;
  originalHoveredColor: string;
  selectedColor: string;
  selectedHoveredColor: string;
  activeButton: number;
  buttons: any[];
  constructor(gizmoManager: any) {
    this.gizmoManager = gizmoManager;

    this.originalColor = ColorScheme.GetGrayscale(4);
    this.originalHoveredColor = ColorScheme.GetGrayscale(4);
    this.selectedColor = ColorScheme.backgroundLightPurple;
    this.selectedHoveredColor = ColorScheme.backgroundLightPurple;

    this.activeButton = -1; //Index to mark which gizmo button is active.
    this.buttons = []; //array storing the gizmo buttons

    GizmoSelectionModeMenuController.instance = this;
  }

  /**
   * Sets a gizmo to be active depending on keyboard input.
   * @param {*} keyInfo - Keyboard key event state passed on keyboard callback.
   * @returns
   */
  SetGizmoByKeyboardInput(keyInfo: any) {
    const gizmoSelect = GizmoSelectionModeMenuController.instance;
    const acceptedKeys = ["1", "2", "3"];
    const inputKey = keyInfo.event.key;
    const type = keyInfo.type;

    if (
      type === KeyboardEventTypes.KEYDOWN &&
      acceptedKeys.includes(inputKey)
    ) {
      const pressedNum = parseInt(inputKey) - 1; //Count from 0.

      if (pressedNum < 0 && pressedNum > gizmoSelect.buttons.length) {
        return;
      }

      const isSelected = gizmoSelect.buttons[pressedNum].isSelected;
      gizmoSelect.SetButtonSelectState(pressedNum, !isSelected);
      gizmoSelect.SetGizmoActiveState(pressedNum, !isSelected);

      if (isSelected)
        //If only disabling active gizmo.
        return;

      for (let i = 0; i < gizmoSelect.buttons.length; ++i) {
        if (i === pressedNum) continue; //Don't change state for selected button.

        gizmoSelect.SetButtonSelectState(i, false);
        gizmoSelect.SetGizmoActiveState(i, false);
      }
    }
  }

  /**
   * Sets the selected gizmo in GizmoManager to isActive state.
   * @param {int} num - index of gizmo to set.
   * @param {bool} isActive - Result to set if gizmo is active or not.
   */
  SetGizmoActiveState(num: number, isActive: boolean) {
    switch (num) {
      case 0: //Position Gizmo
        this.gizmoManager.positionGizmoEnabled = isActive;
        break;
      case 1: // Rotation gizmo
        this.gizmoManager.rotationGizmoEnabled = isActive;
        break;
      case 2: // Scale gizmo
        this.gizmoManager.scaleGizmoEnabled = isActive;
        break;
      default:
        console.log("Unassigned gizmo number");
    }
  }

  /**
   * Change display color of buttons depending on if button is selected or not.
   * @param {int} buttonNum - Index in button array for which gizmo to set.
   * @param {bool} isSelected - If button is currently selected or not.
   */
  SetButtonSelectState(buttonNum: number, isSelected: boolean) {
    const gizmoSelect = GizmoSelectionModeMenuController.instance;
    const button = this.buttons[buttonNum];
    button.isSelected = isSelected;

    if (isSelected) {
      button.background = button.isHovered
        ? gizmoSelect.selectedHoveredColor
        : gizmoSelect.selectedColor;
    } else {
      button.background = button.isHovered
        ? gizmoSelect.originalHoveredColor
        : gizmoSelect.originalColor;
    }
  }

  /**
   * Callback for when the button is hovered over by user, to change colour and state of button.
   * @param {BabylonJS Control} button - Control of the button to set.
   */
  Button_Highlighted(button: any) {
    const gizmoSelect = GizmoSelectionModeMenuController.instance;
    button.isHovered = true;
    button.background = button.isSelected
      ? gizmoSelect.selectedHoveredColor
      : gizmoSelect.originalHoveredColor;
  }

  /**
   * Callback for when the user exits hovering over button, to change colour and state of button.
   * @param {BabylonJS Control} button - Control of the button to set.
   */
  Button_Unhighlighted(button: any) {
    const gizmoSelect = GizmoSelectionModeMenuController.instance;
    button.isHovered = false;
    button.background = button.isSelected
      ? gizmoSelect.selectedColor
      : gizmoSelect.originalColor;
  }

  /**
   * Callback function for observer when a button is selected and needs to change state.
   * @param {*} mousePosition - Mouse state passed in by Oberserver callback.
   * @param {*} eventState
   */
  Button_ToggleSelected(mousePosition: any, eventState: any) {
    mousePosition //Suppress Warning
    const button = eventState.target;
    const gizmoSelect = GizmoSelectionModeMenuController.instance;
    if (button.isSelected) {
      gizmoSelect.SetButtonSelectState(button.buttonIndex, false);
      gizmoSelect.SetGizmoActiveState(button.buttonIndex, false);
    } else {
      const buttons = gizmoSelect.buttons;
      gizmoSelect.SetButtonSelectState(button.buttonIndex, true);
      gizmoSelect.SetGizmoActiveState(button.buttonIndex, true);
      //Disable all other buttons.
      for (let i = 0; i < buttons.length; ++i) {
        if (button.buttonIndex === i) continue;
        gizmoSelect.SetButtonSelectState(i, false);
        gizmoSelect.SetGizmoActiveState(i, false);
      }
    }
  }

  AttachNewMesh(evnt: SelectMeshEvent) {
    GizmoSelectionModeMenuController.instance.gizmoManager.attachToMesh(evnt.selectedModel);
  }

  DetachMesh(evnt: DeselectMeshEvent) {
    GizmoSelectionModeMenuController.instance.gizmoManager.attachToMesh(null);
  }

  Init(advTexture: AdvancedDynamicTexture) {
    GuiManager.instance.scene?.onKeyboardObservable.add(
      this.SetGizmoByKeyboardInput
    );

    for (let i = 0; i < 3; ++i) {
      const button = advTexture.getControlByName("MoveMenu_Gizmo_" + i) as Rectangle;
      button.metadata.isHovered = false;
      button.metadata.isSelected = false;

      button.onPointerEnterObservable.add(this.Button_Highlighted);
      button.onPointerOutObservable.add(this.Button_Unhighlighted);
      button.onPointerDownObservable.add(this.Button_ToggleSelected);

      button.metadata.id = this.buttons.length;
      this.buttons.push(button);
    }

    const pickingManager = ObjectPickingManager.ActiveInstance
    if(pickingManager){
      pickingManager.onSelectListener.Subscribe(this.AttachNewMesh)
      pickingManager.onDeselectListener.Subscribe(this.DetachMesh)
    }
  }

  Uninit(){
    const pickingManager = ObjectPickingManager.ActiveInstance
    if(pickingManager){
      pickingManager.onSelectListener.Unsubscribe(this.AttachNewMesh)
      pickingManager.onDeselectListener.Unsubscribe(this.DetachMesh)
    }
  }
}
