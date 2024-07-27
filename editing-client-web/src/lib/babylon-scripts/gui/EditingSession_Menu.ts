import {
  AdvancedDynamicTexture,
  InputText,
  TextBlock,
} from "@babylonjs/gui";
import { ColorScheme } from "../ColorScheme";
import { EditingSessionManager, NewRoomInfo } from "../EditingSessionManager";
import { Color3, Nullable} from "@babylonjs/core";

export class EditingSession_Menu {
  static instance: EditingSession_Menu;
  baseRoomElement: any;
  stackPanel: any;
  elements: any[];
  visibleElementCount: number;
  selectedId: number;
  hasInitialised: boolean;
  postInitCallbacks: any[];
  createRoomSubMenu: any;
  userSettingSubMenu: any;
  lobbyMenuContainer: any;
  previewContainer: any;
  noSelectionContainer: any;
  roomNameText: any;
  roomDescText: any;
  roomAuthorsText: any;
  roomCreateDateText: any;
  roomModifiedDateText: any;
  joinRoomButton: any;

  constructor() {
    this.baseRoomElement = null;
    this.stackPanel = null;
    this.elements = [];

    this.visibleElementCount = 0;
    this.selectedId = -1;

    this.hasInitialised = false;
    this.postInitCallbacks = [];

    this.createRoomSubMenu = new CreateRoom_SubMenu();
    this.userSettingSubMenu = new UserSetting_SubMenu();

    this.lobbyMenuContainer = null;
    this.previewContainer = null;
    this.noSelectionContainer = null;

    this.roomNameText = null;
    this.roomDescText = null;
    this.roomAuthorsText = null;
    this.roomCreateDateText = null;
    this.roomModifiedDateText = null;
    this.joinRoomButton = null;

    EditingSession_Menu.instance = this;
  }

  _Element_OnPointerExit(control: any) {
    const selectedId = EditingSession_Menu.instance.selectedId;
    if (selectedId === control._idInArray) {
      control.background = ColorScheme.backgroundDarkPurple;
    } else {
      control.background = ColorScheme.GetGrayscale(2);
    }
  }

  _Element_OnPointerEnter(control: any) {
    const selectedId = EditingSession_Menu.instance.selectedId;
    if (selectedId === control._idInArray) {
      control.background = ColorScheme.backgroundLightPurple;
    } else {
      control.background = ColorScheme.GetGrayscale(3);
    }
  }
  _Element_OnPointerDown(mousePos: any, evntState: { target: any }) {
    const control = evntState.target;
    EditingSession_Menu.instance.SetElementSelection(control._idInArray);
  }

  SetElementSelection(index: number) {
    if (this.selectedId !== -1) {
      //Set previous selection's color
      const prevControl = this.elements[this.selectedId];
      prevControl.background = ColorScheme.GetGrayscale(2);
    }
    if (this.selectedId === index) {
      this.ShowPreviewInfo(false);
      this.selectedId = -1;
      return;
    }

    //Set New Color
    this.elements[index].background = ColorScheme.backgroundLightPurple;
    this.selectedId = index;

    //Change Parameters to new selection
    this.UpdatePreviewInfo();
    this.ShowPreviewInfo(true);
  }

  RefreshRoomElements(roomPreviews: any[]) {
    this.SetVisibleElements(roomPreviews.length);
    for (let i = 0; i < roomPreviews.length; ++i) {
      const roomPreview = roomPreviews[i];
      const controlElement = this.elements[i];
      const children = controlElement.children;

      children.forEach((childControl: InputText) => {
        if (childControl.name === "RoomNameText") {
          childControl.text = roomPreview.name;
        } else if (childControl.name === "RoomUsersText") {
          childControl.text = "---";
        }
      });
    }
  }

  AddNewElement(control: any = null) {
    if (!control) {
      control = this.baseRoomElement.clone();
    }

    control._idInArray = this.elements.length;

    control.name = "RoomLobbyMenu_RoomElement_" + this.elements.length;

    //On Pointer Observables
    control.onPointerEnterObservable.add(this._Element_OnPointerEnter);
    control.onPointerOutObservable.add(this._Element_OnPointerExit);
    control.onPointerDownObservable.add(this._Element_OnPointerDown);

    //Initializing children of control.
    const children = control.children;
    for (let i = 0; i < children.length; ++i) {
      children[i].isEnabled = false;
      if (children[i] instanceof TextBlock) {
        children[i].fontSizeInPixels = 16;
      }
    }
    this.elements.push(control);
    this.stackPanel.addControl(control);
  }

  UpdatePreviewInfo() {
    const preview = EditingSessionManager.instance.GetPreview(this.selectedId);
    if (preview === null) {
      console.warn(
        "Preview was loaded as null from edit session manager! Aborting"
      );
      return;
    }

    this.roomNameText.text = preview.name;
    this.roomDescText.text = preview.description;
    this.roomAuthorsText.text = preview.authors;
    this.roomCreateDateText.text = preview.created_date;
    this.roomModifiedDateText.text = preview.modified_date;
  }

  ShowPreviewInfo(isVisible: boolean) {
    this.previewContainer.isVisible = isVisible;
    this.noSelectionContainer.isVisible = !isVisible;
  }

  SetVisibleElements(count: number) {
    count = count < 0 ? 0 : count;
    if (count > this.elements.length) {
      const createCount = count - this.elements.length;
      for (let i = 0; i < createCount; ++i) {
        this.AddNewElement();
      }
    }

    for (let i = 0; i < this.elements.length; ++i) {
      if (i >= count) {
        this.elements[i].isVisible = false;
      } else {
        this.elements[i].isVisible = true;
      }
    }
    this.visibleElementCount = count;
  }

  ShowLobbyMenu(isVisible: boolean) {
    if (this.lobbyMenuContainer.isVisible === false) {
      this.selectedId = -1;

      this.userSettingSubMenu.isVisible = false;
      this.createRoomSubMenu.isVisible = false;
      this.previewContainer.isVisible = false;
      this.noSelectionContainer.isVisible = true;
    }

    this.lobbyMenuContainer.isVisible = isVisible;
  }

  Init(advTexture: AdvancedDynamicTexture) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;

    this.lobbyMenuContainer = advTexture.getControlByName(
      "RoomLobbyMenu_Container"
    );
    this.baseRoomElement = advTexture.getControlByName(
      "RoomLobbyMenu_RoomElement_0"
    );
    this.stackPanel = advTexture.getControlByName(
      "RoomLobbyMenu_RoomListStackPanel"
    );

    this.previewContainer = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_Container"
    );
    this.noSelectionContainer = advTexture.getControlByName(
      "RoomLobbyMenu_NoSelection_Container"
    );

    this.roomNameText = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_Name_Text"
    );
    this.roomDescText = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_Desc_Text"
    );
    this.roomAuthorsText = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_Authors_Text"
    );
    this.roomCreateDateText = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_CreatedDate_Text"
    );
    this.roomModifiedDateText = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_ModifiedDate_Text"
    );

    this.joinRoomButton = advTexture.getControlByName(
      "RoomLobbyMenu_Preview_Join_Button"
    );
    this.joinRoomButton.onPointerDownObservable.add(
      () => {
        EditingSessionManager.instance.JoinRoom(_this.selectedId);
      }
    );

    const createRoomButton = advTexture.getControlByName(
      "RoomLobbyMenu_NoSelection_CreateRoom_Button"
    );
    const setUserButton = advTexture.getControlByName(
      "RoomLobbyMenu_NoSelection_SetUser_Button"
    );

    createRoomButton?.onPointerDownObservable.add(() => {
      _this.ShowLobbyMenu(false);
      _this.createRoomSubMenu.ResetInputs();
      _this.createRoomSubMenu.SetVisibility(true);
    });
    setUserButton?.onPointerDownObservable.add(() => {
      _this.ShowLobbyMenu(false);
      _this.userSettingSubMenu.SetVisibility(true);
    });

    const showMenuCallback = function () {
      _this.ShowLobbyMenu(true);
    };
    this.userSettingSubMenu.Init(advTexture, showMenuCallback);
    this.createRoomSubMenu.Init(advTexture, showMenuCallback);

    this.AddNewElement(this.baseRoomElement);
    this.SetVisibleElements(0);
    this.ShowPreviewInfo(false);

    this.hasInitialised = true;
    this.postInitCallbacks.forEach((funct) => {
      funct();
    });
  }
}

class EditSession_SubMenu {
  onExitMenuCallback: any;
  menuContainer: Nullable<any>;
  constructor() {
    this.onExitMenuCallback = null;
    this.menuContainer = null;
  }

  SetVisibility(isVisible: boolean) {
    this.menuContainer.isVisible = isVisible;
  }

  CloseSubMenu() {
    this.menuContainer.isVisible = false;
    if (this.onExitMenuCallback !== null) {
      this.onExitMenuCallback();
    }
  }
}

class CreateRoom_SubMenu extends EditSession_SubMenu {
  roomNameInput: any;
  baseReconstructionInput: any;
  authorsInput: any;
  constructor() {
    super();

    this.roomNameInput = null;
    this.baseReconstructionInput = null;
    this.authorsInput = null;
  }

  ResetInputs() {
    var currentDate = new Date();
    var roomName = currentDate.toLocaleString();
    
    this.roomNameInput.text = "New Room " + roomName;    
    this.baseReconstructionInput.text = "dover_courtyard";
    this.authorsInput.text = "N/A";
  }

  Init(advTexture: AdvancedDynamicTexture, onExitCallback: any) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    this.onExitMenuCallback = onExitCallback;
    this.menuContainer = advTexture.getControlByName(
      "CreateRoomSubMenu_Container"
    );

    this.roomNameInput = advTexture.getControlByName(
      "CreateRoom_RoomName_Input"
    );
    this.baseReconstructionInput = advTexture.getControlByName(
      "CreateRoom_RoomDesc_Input"
    );
    this.authorsInput = advTexture.getControlByName("CreateRoom_Authors_Input");

    const createButton = advTexture.getControlByName(
      "CreateRoom_Create_Button"
    );
    const cancelButton = advTexture.getControlByName(
      "CreateRoom_Cancel_Button"
    );

    createButton?.onPointerDownObservable.add(() => {
      const newRoomInfo = new NewRoomInfo();

      newRoomInfo.roomName = _this.roomNameInput.text;
      newRoomInfo.baseReconstructionID = _this.baseReconstructionInput.text;
      newRoomInfo.authors = _this.authorsInput.text;
      
      EditingSessionManager.instance.CreateEmptyRoom(newRoomInfo);
      //Then close sub menu
      _this.CloseSubMenu();
      _this.ResetInputs();
    });
    
    cancelButton?.onPointerDownObservable.add(() => {
      _this.CloseSubMenu();
      _this.ResetInputs();
    });

    this.menuContainer.isVisible = false;
  }
}

class UserSetting_SubMenu extends EditSession_SubMenu {
  displayName: Nullable<any>;
  sliderR: Nullable<any>;
  sliderG: Nullable<any>;
  sliderB: Nullable<any>;
  colorPicker: Nullable<any>;
  colorLock: boolean;
  constructor() {
    super();
    this.displayName = null;
    this.sliderR = null;
    this.sliderG = null;
    this.sliderB = null;
    this.colorPicker = null;
    this.colorLock = false;
  }

  MatchSlidersToColorPicker() {
    if (this.colorLock) {
      return;
    }
    this.colorLock = true;
    const color = this.colorPicker?.value ?? new Color3();

    this.sliderR.value = color.r;
    this.sliderG.value = color.g;
    this.sliderB.value = color.b;

    this.colorLock = false;
  }

  MatchColorPickerToSlider() {
    if (this.colorLock) {
      return;
    }
    this.colorLock = true;

    //const color = this.colorPicker?.value ?? new Color3();

    this.colorPicker.value.r = this.sliderR.value;
    this.colorPicker.value.g = this.sliderG.value;
    this.colorPicker.value.b = this.sliderB.value;

    this.colorLock = false;
  }

  Init(advTexture: AdvancedDynamicTexture, onExitCallback: any) {
    const _this = this;

    this.onExitMenuCallback = onExitCallback;

    this.menuContainer = advTexture.getControlByName(
      "UserSettingSubMenu_Container"
    );

    this.displayName = advTexture.getControlByName(
      "UserSetting_DisplayName_TextInput"
    );
    this.sliderR = advTexture.getControlByName(
      "UserSetting_DisplayColor_SliderRed"
    );
    this.sliderG = advTexture.getControlByName(
      "UserSetting_DisplayColor_SliderGreen"
    );
    this.sliderB = advTexture.getControlByName(
      "UserSetting_DisplayColor_SliderBlue"
    );
    this.colorPicker = advTexture.getControlByName(
      "UserSetting_DisplayColor_Picker"
    );

    const sliderFunction = function () {
      _this.MatchColorPickerToSlider();
    };
    this.sliderR.onValueChangedObservable.add(sliderFunction);
    this.sliderG.onValueChangedObservable.add(sliderFunction);
    this.sliderB.onValueChangedObservable.add(sliderFunction);

    this.colorPicker.onValueChangedObservable.add(() => {
      _this.MatchSlidersToColorPicker();
    });

    const okButton = advTexture.getControlByName("UserSetting_Ok_Button");
    okButton?.onPointerDownObservable.add(() => {
      _this.CloseSubMenu();
      EditingSessionManager.instance.UpdateUserInformation(
        this.displayName.text,
        this.colorPicker.value
      );
    });

    this.menuContainer.isVisible = false;
  }
}
