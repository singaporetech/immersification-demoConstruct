import { ColorScheme } from "../../utilities/ColorScheme";
import {
  AdvancedDynamicTexture,
  Image,
  InputText,
  Rectangle,
} from "@babylonjs/gui";
import { Scene } from "@babylonjs/core";
import { vrModelBrowserToolManager as VrModelBrowserToolManager } from "../../modelBrowserTool/vr/vrModelBrowserToolManager";
import { VrManager } from "../../modeController/vr/VrManager";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { DesktopCameraSettings } from "../../cameraController/desktop/DesktopCameraSettings";
import { GuiMenu, GuiMenuToggle, GuiMenuManager, GuiToggleGroup } from "../GuiMenu";
import { ModelBrowserMenuController } from "../desktop/ModelBrowserMenuController";
import { ModelBrowserToolManager } from "../../modelBrowserTool/desktop/ModelBrowserToolManager";
import { VRMenuObject } from "../UIComponents";
import { AssetConfig, ColorsConfig as ColorConfig } from "../../config";

/**
 * Defines the ModelBrowser Menu class that binds BabylonJs Controls to objects managed by this class
 * and adds the relevant callback functions.
 * Meant to be used as a singleton instance of a class.
 */
export class VrModelBrowserToolMenuController //extends VRMenuObject
{
  static instance: VrModelBrowserToolMenuController;
  public parentBrowserToolCom: VrModelBrowserToolManager | undefined;

  public scene: Scene | undefined;

  modelLoadButtons: any[];
  modelLoadImages: any[];
  modelLoadText: any[];
  pageNumText: any;
  pageNumber: number;
  maxPages: number;
  defaultImgUrl: string;
  hasRefreshedOnce: boolean;

  toggleButton: Rectangle | null = null
  // assetInfoMenu: ModelBrowser_AssetInfo_MenuController

  public menuToggle: GuiMenuToggle;
  public toggleGroup: GuiToggleGroup;

  browserMenuContainer: Rectangle

  modelID: number;
  
  constructor() {
    this.modelLoadButtons = []; //Buttons for each model info and can be clicked to load models.
    this.modelLoadImages = []; //The Image control object for each model info
    this.modelLoadText = []; //The Text control object for each model info.

    this.pageNumText = null; //The string for displaying the current page in browser

    this.pageNumber = 0; //Current Page number
    this.maxPages = 1; //Maximum page number, calculated based on model count returned from ModelBrowser.

    this.defaultImgUrl = "editing/icons/image.png"; //Place holder image url if model info does not have a thumbnail.

    // this.assetInfoMenu = new ModelBrowser_AssetInfo_MenuController()

    this.hasRefreshedOnce = false;

    this.modelID = 99

    VrModelBrowserToolMenuController.instance = this;
  }

  _ToggleOnHoverOn(){
    const button = this.toggleButton
    if(button){
      if(button.metadata.isSelected){
        button.background = ColorConfig.selected_dark
        button.alpha = 1;
      }else{
        button.background = ColorConfig.hover_dark
        button.alpha = 1;
      }
    }
  }

  _ToggleOnHoverOff(){
    const button = this.toggleButton
    if(button){
      if(button.metadata.isSelected){
        button.background = ColorConfig.selected_dark
        button.alpha = 1;
      }else{
        button.background = ColorConfig.selectable_dark
        button.alpha = 1;
      }
    }
  }

  /**
   * Updates the display of various controls to match the state
   * of modelBrowser instance.
   */
  UpdateDisplayedButtons() {
    //Update text of buttons to match
    const modelBrowser = ModelBrowserToolManager.instance;
    const modelCount = modelBrowser.GetPreviewCount();
    const buttonCount = this.modelLoadButtons.length;

    const modelStartIndex = this.pageNumber * buttonCount;

    //Setting Page text
    if (this.maxPages === 0) {
      this.pageNumText.text = "Page 0 of 0";
    } else {
      this.pageNumText.text = "Page " + (this.pageNumber + 1) + " of " + this.maxPages;
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
      this.modelLoadText[i].text = displayInfo.name; //"hello";
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
    // const this = this.instance;
    const modelCount = ModelBrowserToolManager.instance.GetPreviewCount();
    const _this = VrModelBrowserToolMenuController.instance;

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
   * @param {GuiMenuManager} menuManager - Instance of menu manager to register the controls as a menu.
   */
  Init(advTexture: AdvancedDynamicTexture, scene: Scene, parentBrowserToolCom: VrModelBrowserToolManager)
  {
    this.scene = scene;
    this.parentBrowserToolCom = parentBrowserToolCom;

    // VrModelBrowserToolManager.instance.OnPreviewLoadCallbacks.push(
    //   // this.RefreshModelBrowserMenu
    // );
    ModelBrowserToolManager.instance.OnPreviewLoadCallbacks.push(
      this.RefreshModelBrowserMenu
    );
    const _this = this;
    //Initialize GUI below here!.
    //Initializing Load Model Buttons
    let count = 0;

    //Initialize Options for loading model.
    while (true) {
      //Keep loading for that control object until no more.
      const optionContainer = advTexture.getControlByName("Object_Option_" + count) as Rectangle;
      if (optionContainer === null) {
        break;
      }

      //Selectables for optionContainer
      optionContainer.metadata = new ButtonMetadata(count); //ButtonOptionMetadata(count);
      // onPointerDownObservable is not when the trigger is fully press
      // which leads to issues that if the user presses the trigger too slown model will spawn
      optionContainer.onPointerUpObservable.add((mousePosition: any, eventState: any) => {
        //Temp hack to make it so htis code will only run if the trigger is fully pressed (value === 1)
        scene.executeWhenReady(() => {
          // if(!VrManager.getInstance?.rightTriggerActive)
          // // if(!VrManager.getInstance?.inVR)
          //   return;
            
          mousePosition //Suppress Warning
          const button = eventState.target;
          let metaNum = button.metadata.id
          this.modelID = metaNum + (this.pageNumber * this.modelLoadButtons.length);  
          this.parentBrowserToolCom?.TryUpdateSelectedModel(this.modelID);
        })
      });

      optionContainer.onPointerEnterObservable.add((control: any) => {
        control.background = ColorConfig.hover_dark; //ColorScheme.backgroundLightPurple;
      });
      
      optionContainer.onPointerOutObservable.add((control: any) => {
        control.background = ColorConfig.selectable_dark //olorScheme.GetGrayscale(2);
      });

      //Initialise child objects in UI
      const children = optionContainer.getDescendants(true);
      for (let i = 0; i < children.length; ++i)
      {
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
    // const optionsContainer = advTexture.getControlByName("Objects_Options_Container");
    // optionsContainer.isEnabled = false;
    // const pageButtsContainer = advTexture.getControlByName("LoadModel_PageButtonContainer");
    // pageButtsContainer.isEnabled = false;

    //Initialize buttons for refreshing option data for models.
    const refreshButton = advTexture.getControlByName("LoadModel_RefreshButton");
    const nextPageButton = advTexture.getControlByName("LoadModel_RightArrow") as Image;
    nextPageButton.source = AssetConfig.arrowLeft_dark;
    const prevPageButton = advTexture.getControlByName("LoadModel_LeftArrow") as Image;
    prevPageButton.source = AssetConfig.arrowRight_dark;
    this.pageNumText = advTexture.getControlByName("LoadModel_PageText");

    refreshButton?.onPointerDownObservable.add(() => {
      ModelBrowserToolManager.instance.FetchModelPreviews();
    });
    nextPageButton?.onPointerDownObservable.add(() => {
      this.NextPage();
    });
    prevPageButton?.onPointerDownObservable.add(() => {
      this.PrevPage();
    });

    //Initialize Filter Text
    const filterTextInput = advTexture.getControlByName("Objects_FilterInputText") as InputText;
    filterTextInput?.onFocusObservable.add(() => {
        DesktopCameraSettings.EnableCameraMovement(false);
      }
    );
    filterTextInput?.onBlurObservable.add((textInput: any) => {
      DesktopCameraSettings.EnableCameraMovement(true);
      ModelBrowserToolManager.instance.SetFilter(textInput.text);
      ModelBrowserToolManager.instance.ApplyFilter();
      this.RefreshModelBrowserMenu();
    });
    
    const filterTextImage = advTexture.getControlByName("Objects_FilterImage") as Image;
    filterTextImage.isEnabled = false

    //Setting Up Toggle Group to show/hide modelbrowser menu
    //Creating GUI Menu to treat object browser as a toggle-able menu
    _this.browserMenuContainer = advTexture.getControlByName("Objects_Container") as Rectangle;
    _this.browserMenuContainer.isVisible = true

    //Create MenuToggle to treat a button as a toggle button
    const toggleButton = advTexture.getControlByName("Navbar_MenuToggle_Objects") as Rectangle;
    this.toggleButton = toggleButton
    toggleButton.onPointerEnterObservable.add(_this._ToggleOnHoverOn)
    toggleButton.onPointerOutObservable.add(_this._ToggleOnHoverOff)
    toggleButton.metadata = {
      isSelected: false
    }
  }

  public ActivateModelMenu()
  {
    this.browserMenuContainer.isVisible = true;
  }
}
