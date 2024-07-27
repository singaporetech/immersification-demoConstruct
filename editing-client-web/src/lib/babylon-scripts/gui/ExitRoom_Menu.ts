import { AdvancedDynamicTexture, Control } from "@babylonjs/gui";
import { EditingSessionManager } from "../EditingSessionManager";
import { GUI_MenuManager } from "./GuiMenu";

export class ExitRoom_Menu {
  static instance: ExitRoom_Menu;
  menuRoot: any;
  guiToggle: any;
  constructor() {
    this.menuRoot = null;
    this.guiToggle = null;

    ExitRoom_Menu.instance = this;
  }

  _CloseMenu() {
    this.menuRoot.isVisible = false;
    this.guiToggle.Disable();
  }

  Init(advTexture: AdvancedDynamicTexture, menuManager: GUI_MenuManager) {
    const _this = this;
    const exitButton = advTexture.getControlByName("ExitRoomMenu_ExitButton");
    const cancelButton = advTexture.getControlByName(
      "ExitRoomMenu_CancelButton"
    );

    exitButton?.onPointerDownObservable.add(() => {
      _this._CloseMenu();
      EditingSessionManager.instance.ExitRoom();
    });
    cancelButton?.onPointerDownObservable.add(() => {
      _this._CloseMenu();
    });

    this.menuRoot = advTexture.getControlByName("ExitRoom_Root");

    const menu = this.menuRoot;
    const moveControl = advTexture.getControlByName("ExitRoomMenu_TitleText");
    const toggleControl = advTexture.getControlByName("ExitRoom_Toggle");
    const menuDict = menuManager.CreateDefaultBehaviour(
      menu,
      moveControl as Control,
      toggleControl as Control,
      "Exit"
    );

    this.guiToggle = menuDict["guiToggle"];

    const toggleImage = advTexture.getControlByName("ExitRoom_Image") as Control;
    toggleImage.isEnabled = false;
    menu.isVisible = false;
  }
}
