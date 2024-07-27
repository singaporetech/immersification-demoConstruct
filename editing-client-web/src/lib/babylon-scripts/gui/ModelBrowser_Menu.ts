/**
 * @fileoverview
 * Defines the menu behaviour for displaying the list of models available from backend server to download from.
 * 
 */
import { ModelBrowser } from "../ModelBrowser";
import { ColorScheme } from "../ColorScheme";
import {
  AdvancedDynamicTexture,
  Container,
  Control,
  Image,
} from "@babylonjs/gui";
import { GUI_MenuManager } from "./GuiMenu";
import { CameraSettings } from "../CameraSettings";

/**
 * Defines the ModelBrowser Menu class that binds BabylonJs Controls to objects managed by this class
 * and adds the relevant callback functions.
 * Meant to be used as a singleton instance of a class.
 */
export class ModelBrowser_Menu {
  static instance: ModelBrowser_Menu;
  modelLoadButtons: any[];
  modelLoadImages: any[];
  modelLoadText: any[];
  pageNumText: any;
  pageNumber: number;
  maxPages: number;
  defaultImgUrl: string;
  hasRefreshedOnce: boolean;
  constructor() {
    this.modelLoadButtons = []; //Buttons for each model info and can be clicked to load models.
    this.modelLoadImages = []; //The Image control object for each model info
    this.modelLoadText = []; //The Text control object for each model info.

    this.pageNumText = null; //The string for displaying the current page in browser

    this.pageNumber = 0; //Current Page number
    this.maxPages = 1; //Maximum page number, calculated based on model count returned from ModelBrowser.

    this.defaultImgUrl = "guicons/image.png"; //Place holder image url if model info does not have a thumbnail.

    this.hasRefreshedOnce = false;
    ModelBrowser_Menu.instance = this;
  }

  /**
   * Updates the display of various controls to match the state
   * of modelBrowser instance.
   */
  UpdateDisplayedButtons() {
    //Update text of buttons to match
    const modelBrowser = ModelBrowser.instance;
    const modelCount = modelBrowser.GetPreviewCount();
    const buttonCount = this.modelLoadButtons.length;

    const modelStartIndex = this.pageNumber * buttonCount;

    //Setting Page text
    if (this.maxPages === 0) {
      this.pageNumText.text = "Page 0 of 0";
    } else {
      this.pageNumText.text =
        "Page " + (this.pageNumber + 1) + " of " + this.maxPages;
    }

    //Setting number of visible buttons
    for (let i = 0; i < buttonCount; ++i) {
      this.modelLoadButtons[i].isVisible = false;
    }

    //Updating Information of visible buttons
    for (let i = 0; i < buttonCount; ++i) {
      const modelIndex = modelStartIndex + i;
      if (modelIndex >= modelCount) return;

      const displayInfo = modelBrowser.GetPreview(modelIndex);
      if (displayInfo === null) break;

      this.modelLoadButtons[i].isVisible = true;
      this.modelLoadText[i].text = displayInfo.name;
      if (displayInfo.thumbnailUrl !== "null") {
        this.modelLoadImages[i].source = displayInfo.thumbnailUrl;
        this.modelLoadImages[i].color = "red"
        this.modelLoadImages[i].background = "red"
      } else {
        this.modelLoadImages[i].source = this.defaultImgUrl;
        this.modelLoadImages[i].color = "red"
        this.modelLoadImages[i].background = "red"
      }
    }
  }

  /**
   * Recalculates parameters for displaying number of buttons and maximum pages.
   * Then calls to update the display of menu.
   */
  RefreshModelBrowserMenu() {
    const _this = ModelBrowser_Menu.instance;
    const modelCount = ModelBrowser.instance.GetPreviewCount();
    const buttonCount = _this.modelLoadButtons.length;

    _this.maxPages =
      Math.floor(modelCount / buttonCount) +
      (modelCount % buttonCount === 0 ? 0 : 1);
    if (_this.maxPages === 0) {
      _this.pageNumber = 0;
    } else {
      _this.pageNumber =
        _this.pageNumber >= _this.maxPages
          ? _this.maxPages - 1
          : _this.pageNumber;
    }

    _this.hasRefreshedOnce = true;
    _this.UpdateDisplayedButtons();
  }

  /**
   * Function for a control element to call to change page of modelInfos
   */
  NextPage() {
    if (this.pageNumber === this.maxPages - 1) {
      return;
    }

    this.pageNumber += 1;
    this.UpdateDisplayedButtons();
  }

  /**
   * Function for a control element to call to change page of modelInfos
   */
  PrevPage() {
    if (this.pageNumber <= 0) {
      return;
    }
    this.pageNumber -= 1;
    this.UpdateDisplayedButtons();
  }

  /**
   * Init function that binds controls from BabylonJs AdvancedDynamicTexture and
   * adds relevant callbacks to enable this menu's required interactivity.
   * This class is dependent on the UI objects loaded into AdvanceDynamicTexture to have
   * the correct naming scheme in order to search for the controls.
   * @param {BabylonJS AdvancedDynamicTexture} advTexture - The instance to search controls from.
   * @param {GUI_MenuManager} menuManager - Instance of menu manager to register the controls as a menu.
   */
  Init(advTexture: AdvancedDynamicTexture, menuManager: GUI_MenuManager) {
    ModelBrowser.instance.OnPreviewLoadCallbacks.push(
      this.RefreshModelBrowserMenu
    );

    //Initialize GUI below here!.
    //Initializing Load Model Buttons
    let count = 0;

    //Initialize Options for loading model.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      //Keep loading for that control object until no more.
      const optionContainer = advTexture.getControlByName(
        "LoadModel_Option_Container_" + count
      ) as any;
      if (optionContainer === null) {
        break;
      }

      //Selectables for optionContainer
      optionContainer.buttonIndex = count;
      optionContainer.onPointerDownObservable.add(
        (mousePosition: any, eventState: any) => {
          mousePosition //Suppress Warning
          const button = eventState.target;
          const modelNum =
            button.buttonIndex + this.pageNumber * this.modelLoadButtons.length;

          ModelBrowser.instance.RequestModelDownload(modelNum, 0);
        }
      );
      optionContainer.onPointerEnterObservable.add((control: any) => {
        control.background = ColorScheme.backgroundDarkPurple;
      });
      optionContainer.onPointerOutObservable.add((control: any) => {
        control.background = ColorScheme.GetGrayscale(2);
      });

      //Initialise child objects in UI
      const children = optionContainer.getDescendants(true);
      for (let i = 0; i < children.length; ++i) {
        const control = children[i];
        control.isEnabled = false;

        if (control.name === "Name") {
          this.modelLoadText.push(control);
        } else {
          //Is Image Control.
          this.modelLoadImages.push(control);
        }
      }
      this.modelLoadButtons.push(optionContainer);

      count += 1;
    }

    //Initialize buttons for refreshing option data for models.
    const refreshButton = advTexture.getControlByName(
      "LoadModel_RefreshButton"
    );
    const nextPageButton = advTexture.getControlByName("LoadModel_RightArrow");
    const prevPageButton = advTexture.getControlByName("LoadModel_LeftArrow");
    this.pageNumText = advTexture.getControlByName("LoadModel_PageText");

    refreshButton?.onPointerDownObservable.add(() => {
      ModelBrowser.instance.FetchModelPreviews();
    });
    nextPageButton?.onPointerDownObservable.add(() => {
      this.NextPage();
    });
    prevPageButton?.onPointerDownObservable.add(() => {
      this.PrevPage();
    });

    //Initialize Filter Text
    const filterTextInput = advTexture.getControlByName(
      "LoadModel_FilterInputText"
    ) as any;
    filterTextInput?.onFocusObservable.add(
      () => {
        CameraSettings.EnableCameraMovement(false);
      }
    );
    filterTextInput?.onBlurObservable.add((textInput: any) => {
      CameraSettings.EnableCameraMovement(true);
      ModelBrowser.instance.SetFilter(textInput.text);
      ModelBrowser.instance.ApplyFilter();
      this.RefreshModelBrowserMenu();
    });

    //Initialize controls to use GUI_Menu functionality.
    //See GuiMenu.js for menuManager class.
    const menu = advTexture.getControlByName(
      "LoadModelMenu_Container"
    ) as Container;
    const moveControl = advTexture.getControlByName(
      "LoadModelMenu_TitleText"
    ) as Control;
    const toggleControl = advTexture.getControlByName(
      "View_Menu_Toggle_1"
    ) as Control;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    toggleControl?.onPointerDownObservable.add(() => {
      if (!_this.hasRefreshedOnce) {
        _this.RefreshModelBrowserMenu();
      }
    });

    menuManager.CreateDefaultBehaviour(
      menu,
      moveControl,
      toggleControl,
      "View"
    );

    const toggleImage = advTexture.getControlByName(
      "View_Menu_Image_1"
    ) as Image;
    toggleImage.isEnabled = false;
  }
}
