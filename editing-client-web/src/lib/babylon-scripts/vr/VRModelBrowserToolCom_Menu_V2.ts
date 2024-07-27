import { ModelBrowser } from "../ModelBrowser";
import { ColorScheme } from "../ColorScheme";
import {
  AdvancedDynamicTexture,
  Image,
  InputText,
  Rectangle,
} from "@babylonjs/gui";
import { CameraSettings } from "../CameraSettings";
import { ButtonOptionMetadata } from "../components/ButtonOptionMetadata"
import { ModelBrowser_ObjectInfo_Menu } from "../gui/ModelBrowser_ObjectInfo_Menu";
import { GUI_Menu, GUI_MenuManager, GUI_MenuToggle } from "../gui/GuiMenu";
import { Scene } from "@babylonjs/core";
import { VRModelBrowserToolCom } from "./VRModelBrowserToolCom";
import { VRManager } from "./VRManager";

/**
 * Defines the ModelBrowser Menu class that binds BabylonJs Controls to objects managed by this class
 * and adds the relevant callback functions.
 * Meant to be used as a singleton instance of a class.
 */
export class VRModelBrowserToolCom_Menu_V2
{
  public instance: VRModelBrowserToolCom_Menu_V2;
  public parentBrowserToolCom: VRModelBrowserToolCom | undefined;

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
  objectInfoMenu: ModelBrowser_ObjectInfo_Menu

  public menuToggle: any;
  public toggleGroup: any;
  
  constructor() {
    this.modelLoadButtons = []; //Buttons for each model info and can be clicked to load models.
    this.modelLoadImages = []; //The Image control object for each model info
    this.modelLoadText = []; //The Text control object for each model info.

    this.pageNumText = null; //The string for displaying the current page in browser

    this.pageNumber = 0; //Current Page number
    this.maxPages = 1; //Maximum page number, calculated based on model count returned from ModelBrowser.

    this.defaultImgUrl = "guicons/image.png"; //Place holder image url if model info does not have a thumbnail.

    this.objectInfoMenu = new ModelBrowser_ObjectInfo_Menu()

    this.hasRefreshedOnce = false;

    this.instance = this;
  }

  _ToggleOnHoverOn(){
    const button = this.toggleButton
    if(button){
      if(button.metadata.isSelected){
        button.background = ColorScheme.Selectable_Transparency
        button.alpha = 1;
      }else{
        button.background = ColorScheme.hoverSelectable
        button.alpha = 1;
      }
    }
  }

  _ToggleOnHoverOff(){
    const button = this.toggleButton
    if(button){
      if(button.metadata.isSelected){
        button.background = ColorScheme.Selected
        button.alpha = 1;
      }else{
        button.background = ColorScheme.Selectable_Transparency
        button.alpha = .7;
      }
    }
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
    // const this = this.instance;
    const modelCount = ModelBrowser.instance.GetPreviewCount();
    const buttonCount = this.modelLoadButtons.length;

    this.maxPages =
      Math.floor(modelCount / buttonCount) +
      (modelCount % buttonCount === 0 ? 0 : 1);
    if (this.maxPages === 0) {
      this.pageNumber = 0;
    } else {
      this.pageNumber =
        this.pageNumber >= this.maxPages
          ? this.maxPages - 1
          : this.pageNumber;
    }

    this.hasRefreshedOnce = true;
    this.UpdateDisplayedButtons();
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
  Init(advTexture: AdvancedDynamicTexture, scene: Scene, parentBrowserToolCom: VRModelBrowserToolCom)
  {
    this.scene = scene;
    this.parentBrowserToolCom = parentBrowserToolCom;

    ModelBrowser.instance.OnPreviewLoadCallbacks.push(
      // this.RefreshModelBrowserMenu
      this.RefreshModelBrowserMenu.bind(this)
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
      optionContainer.metadata = new ButtonOptionMetadata(count);
      // onPointerDownObservable is not when the trigger is fully press
      // which leads to issues that if the user presses the trigger too slowm model will spawn
      optionContainer.onPointerDownObservable.add((mousePosition: any, eventState: any) => {

        //Temp hack to make it so htis code will only run if the trigger is fully pressed (value === 1)
        scene.executeWhenReady(() => {
          if(!VRManager.getInstance?.rightTriggerActive)
            return;
            
          mousePosition //Suppress Warning
          const button = eventState.target;
          const modelNum = button.metadata.buttonIndex + this.pageNumber * this.modelLoadButtons.length;
          console.log("Model number selected...in VR, but only after executeWhenReady!");      
          this.parentBrowserToolCom?.TryUpdateSelectedModel(modelNum);
          console.log("FR number selected this time!");
        })
      });
      optionContainer.onPointerEnterObservable.add((control: any) => {
        control.background = ColorScheme.backgroundDarkPurple;
      });
      optionContainer.onPointerOutObservable.add((control: any) => {
        control.background = ColorScheme.GetGrayscale(2);
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

    //Initialize buttons for refreshing option data for models.
    const refreshButton = advTexture.getControlByName("LoadModel_RefreshButton");
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
    const filterTextInput = advTexture.getControlByName("Objects_FilterInputText") as InputText;
    filterTextInput?.onFocusObservable.add(() => {
        CameraSettings.EnableCameraMovement(false);
      }
    );
    filterTextInput?.onBlurObservable.add((textInput: any) => {
      CameraSettings.EnableCameraMovement(true);
      ModelBrowser.instance.SetFilter(textInput.text);
      ModelBrowser.instance.ApplyFilter();
      this.RefreshModelBrowserMenu();
    });
    
    const filterTextImage = advTexture.getControlByName("Objects_FilterImage") as Image;
    filterTextImage.isEnabled = false

    //Setting Up Toggle Group to show/hide modelbrowser menu
    //Creating GUI Menu to treat object browser as a toggle-able menu
    const browserMenuContainer = advTexture.getControlByName("Objects_Container") as Rectangle;
    browserMenuContainer.isVisible = false
    const guiMenu = new GUI_Menu(browserMenuContainer)
    guiMenu.OnEnableCallback = function(){
      guiMenu.container.isVisible = true
      if(_this.toggleButton){
        _this.toggleButton.metadata.isSelected = true
      }
    }
    guiMenu.OnDisableCallback = function(){
      guiMenu.container.isVisible = false
      if(_this.toggleButton){
        _this.toggleButton.metadata.isSelected = false
      }
    }

    //Create MenuToggle to treat a button as a toggle button
    const toggleButton = advTexture.getControlByName("Navbar_MenuToggle_Objects") as Rectangle;
    this.toggleButton = toggleButton
    toggleButton.onPointerEnterObservable.add(_this._ToggleOnHoverOn)
    toggleButton.onPointerOutObservable.add(_this._ToggleOnHoverOff)
    toggleButton.metadata = {
      isSelected: false
    }
    this.menuToggle = new GUI_MenuToggle(toggleButton, guiMenu);

    //Registering toggle menu and button to a toggle group
    this.toggleGroup = GUI_MenuManager.instance.FindOrCreateToggleGroup("Navbar");
    this.toggleGroup.AddToggle(this.menuToggle)

    //Set menu toggle on pointer functions
    toggleButton.onPointerDownObservable.add(()=>{
      this.ActivateModelMenu();
    })
    toggleButton.children.forEach((control)=>control.isEnabled = false)

    this.objectInfoMenu.Init(advTexture)
  }

  public ActivateModelMenu()
  {
    this.toggleGroup.ActivateToggle(this.menuToggle)
  }
}
