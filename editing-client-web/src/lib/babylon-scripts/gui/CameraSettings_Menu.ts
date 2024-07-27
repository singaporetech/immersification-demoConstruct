/**
 * @fileoverview
 * Defined the CameraSettingsClass that binds the menu to modify camera settings to camera movement parameters
 * in BabylonJS. Uses GUI_Menu module to register as draggable window and to toggle visibility.
 * 
 */
import {
  AdvancedDynamicTexture,
  Container,
  Control,
  Image,
  Slider,
} from "@babylonjs/gui";
import { GUI_Menu, GUI_MenuManager, GUI_MenuToggle } from "./GuiMenu";
import { CameraSettings } from "../CameraSettings";

export class CameraSettings_Menu {
  constructor() {
  }

  private SpeedSliderOnChange(value: any){
    CameraSettings.SetCameraSpeedScale(value)
  }

  private SensitivitySliderOnChange(value: any){
    CameraSettings.SetCameraAngularSensibility(value)
  }

  Init(advTexture: AdvancedDynamicTexture, menuManager: GUI_MenuManager) {
    //Bind Slider to Camera controls
    const speedSlider = advTexture.getControlByName("CameraSettingsMenu_MoveSpeedSlider") as Slider;
    const sensitivitySlider = advTexture.getControlByName("CameraSettingsMenu_SensitivitySlider") as Slider;

    speedSlider?.onValueChangedObservable.add(this.SpeedSliderOnChange);
    sensitivitySlider?.onValueChangedObservable.add(this.SensitivitySliderOnChange);

    const menu = advTexture.getControlByName("CameraSettingsMenu_Container") as Container;
    menu.isVisible = false;
    //Setup Menu and buttons for toggling on and off.
    const guiMenu = new GUI_Menu(menu);
    guiMenu.OnEnableCallback = function () {guiMenu.container.isVisible = true;}
    guiMenu.OnDisableCallback = function () {guiMenu.container.isVisible = false;}
    const moveControl = advTexture.getControlByName("CameraSettingsMenu_TitleText");
    guiMenu.EnableDragMoveBehaviour(moveControl);

    //Setting up Toggles
    const toggleControl = advTexture.getControlByName("View_Menu_Toggle_2") as Control;
    const toggle = new GUI_MenuToggle(toggleControl, guiMenu);
    const toggleGroup = menuManager.FindOrCreateToggleGroup("View");
    toggleGroup.AddToggle(toggle);

    toggleControl?.onPointerDownObservable.add(() => {
      toggleGroup.ActivateToggle(toggle);
    });
    const toggleImage = advTexture.getControlByName(
      "View_Menu_Image_2"
    ) as Image;
    toggleImage.isEnabled = false;
  }
}
