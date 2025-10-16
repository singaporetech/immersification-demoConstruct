import { AdvancedDynamicTexture, Control, Rectangle, TextBlock } from "@babylonjs/gui";
import { UIUtility } from "../../utilities/UIUtility";
import { SessionManager } from "../../roomController/SessionManager";
import { GuiMenuManager } from "../GuiMenu";

export class RoomExitMenuController {
  static instance: RoomExitMenuController;
  menuRoot: any;
  guiToggle: any;

  toggleControl: Rectangle | null = null

  constructor() {
    this.menuRoot = null;
    this.guiToggle = null;

    RoomExitMenuController.instance = this;
  }

  _CloseMenu() {
    this.menuRoot.isVisible = false;
    this.guiToggle.Disable();
  }

  // OnButtonHoverOn(){
  //   if(this.toggleControl){
  //     this.toggleControl.background = ColorScheme.hoverSelectable
  //     this.toggleControl.alpha = 1;
  //   }
  // }

  // OnButtonHoverOff(){
  //   if(this.toggleControl){
  //     this.toggleControl.background = ColorScheme.Selectable_Transparency
  //     this.toggleControl.alpha = .7;
  //   }
  // }

  Init(advTexture: AdvancedDynamicTexture) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const menuManager = GuiMenuManager.instance
    const exitButton = advTexture.getControlByName("ExitRoomMenu_ExitButton");
    const cancelButton = advTexture.getControlByName(
      "ExitRoomMenu_CancelButton"
    );

    exitButton?.onPointerDownObservable.add(() => {
      _this._CloseMenu();
      SessionManager.instance.ExitRoom();
    });
    cancelButton?.onPointerDownObservable.add(() => {
      _this._CloseMenu();
    });

    this.menuRoot = advTexture.getControlByName("ExitRoom_Root");

    const menu = this.menuRoot as Rectangle;
    const moveControl = advTexture.getControlByName("ExitRoomMenu_TitleText") as TextBlock;
    _this.toggleControl = advTexture.getControlByName("Navbar_HomeButton") as Rectangle;
    const menuDict = menuManager.CreateDefaultBehaviour(
      menu,
      moveControl as Control,
      _this.toggleControl as Control,
      "Exit"
    );

    this.guiToggle = menuDict["guiToggle"];

    const toggleImage = _this.toggleControl.children[0]
    toggleImage.isEnabled = false;
    menu.isVisible = false;

    _this.toggleControl.onPointerEnterObservable.add(UIUtility.SetHoverOn)
    _this.toggleControl.onPointerOutObservable.add(UIUtility.SetHoverOff)
  }
}
