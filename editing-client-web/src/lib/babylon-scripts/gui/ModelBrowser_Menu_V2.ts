/**
 * @fileoverview
 * Defines the menu behaviour for displaying the list of models available from backend server to download from.
 * 
 */

import { ModelBrowser } from "../ModelBrowser";
import { ColorScheme } from "../ColorScheme";
import {
  AdvancedDynamicTexture,
  Image,
  InputText,
  Rectangle
} from "@babylonjs/gui";
/**
 * @desc scene object was included to enable the drag and drop functionality
 * @desc gizmomanager was included to display the gizmos when the user drops the model into the virtual environment
 */
import { Scene } from "@babylonjs/core";
import { CameraSettings } from "../CameraSettings";
import { GUI_Menu, GUI_MenuManager, GUI_MenuToggle } from "./GuiMenu";
import { ModelBrowser_ObjectInfo_Menu } from "./ModelBrowser_ObjectInfo_Menu";
import { ButtonOptionMetadata } from "../components/ButtonOptionMetadata"
/**
 * Defines the ModelBrowser Menu class that binds BabylonJs Controls to objects managed by this class
 * and adds the relevant callback functions.
 * Meant to be used as a singleton instance of a class.
 */
export class ModelBrowser_Menu_V2 {
  static instance: ModelBrowser_Menu_V2;

  modelLoadButtons: any[];
  modelLoadImages: any[];
  modelLoadText: any[];
  pageNumText: any;
  pageNumber: number;
  maxPages: number;
  defaultImgUrl: string;
  hasRefreshedOnce: boolean;
  private spawnFlag: boolean; // Flag to track if model can be spawned
  toggleButton: Rectangle | null = null
  objectInfoMenu: ModelBrowser_ObjectInfo_Menu
  modelID: number;
  choiceCoords: any[];
  selectionObservable : any// Observable<PointerInfo> type


  
  readonly ActionStates={
    None: 0,
    Add: 1,
    Clear: 2
  } 

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
    this.choiceCoords = []; // chosen position by the user for model placement after ghost model is loaded there
    this.spawnFlag = false; // state toggle that allows model to spawn once only after button is clicked
    this.modelID = 99; // Tracks which model button is currently pressed;
    ModelBrowser_Menu_V2.instance = this;
    this.selectionObservable = null;
  }

  _ToggleOnHoverOn(){
    const button = ModelBrowser_Menu_V2.instance.toggleButton
    if(button){
      if(button.metadata.isSelected){
        button.background = ColorScheme.Selected
        button.alpha = 1;
      }else{
        button.background = ColorScheme.hoverSelectable
        button.alpha = 1;
      }
    }
  }

  _ToggleOnHoverOff(){
    const button = ModelBrowser_Menu_V2.instance.toggleButton
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
  spawnModelPointerClickEvent(modelNum: number, scene: Scene) {
    this.selectionObservable = scene.onPointerObservable.add((pointerInfo) => {
      if (this.spawnFlag && pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        if (pointerInfo.pickInfo?.pickedPoint) {
          // Spawn model logic here
          var coord = pointerInfo.pickInfo?.pickedPoint;
          var coord_arr = [coord?.x, coord?.y, coord?.z];
          console.log("X coordinates is: ", coord?.x);
          console.log("Y coordinates is: ", coord?.y);
          console.log("Z coordinates is: ", coord?.z);
          console.log("Model Number: ", modelNum);
          ModelBrowser.instance.RequestModelDownload(modelNum, 0, coord_arr);
          this.spawnFlag = false; // Reset flag after spawning
          ModelBrowser.instance.DeleteGhostModel();
          this.removeModelButtonSceneObservable();
        }
      }
    });
    //ensures that next onPointerObservable is not invoked
    //until another time a  button is pressed
    
    
  }

  private removeModelButtonSceneObservable(){
    this.selectionObservable.remove(this.selectionObservable); 
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
    const _this = ModelBrowser_Menu_V2.instance;
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
   * @desc This function is invoked in @function AssignOnPickFunction under @class PickManager
   * @param pickInfo PickingInfo instance found in @class PickManager
   */
  // onPickModelButton(pickInfo: PickingInfo){
  //   ModelBrowser_Menu_V2.instance.choiceCoords = [pickInfo.pickedPoint?.x, pickInfo.pickedPoint?.y, pickInfo.pickedPoint?.z];
  //   if(ModelBrowser_Menu_V2.instance.spawnFlag == true){
  //     if(ModelBrowser_Menu_V2.instance.modelNum != 99 || ModelBrowser_Menu_V2.instance.modelNum != undefined){
  //       ModelBrowser.instance.LoadGhostModel(ModelBrowser_Menu_V2.instance.modelNum , 0, ModelBrowser_Menu_V2.instance.choiceCoords);
  //       ModelBrowser_Menu_V2.instance.spawnFlag = false;
  //     }  
  //   }
  // }
  /**
   * @desc This function is invoked in @function AssignOnPickFunction under @class PickManager
   */
  resetModelPreview(){
    console.log("Model confirmed");
    ModelBrowser.instance.DeleteGhostModel();
    console.log(ModelBrowser_Menu_V2.instance.choiceCoords);
    ModelBrowser.instance.RequestModelDownload(ModelBrowser_Menu_V2.instance.modelID, 0, ModelBrowser_Menu_V2.instance.choiceCoords);
  }


  /**
   * Init function that binds controls from BabylonJs AdvancedDynamicTexture and
   * adds relevant callbacks to enable this menu's required interactivity.
   * This class is dependent on the UI objects loaded into AdvanceDynamicTexture to have
   * the correct naming scheme in order to search for the controls.
   * @param {BabylonJS AdvancedDynamicTexture} advTexture - The instance to search controls from.
   * @param {GUI_MenuManager} menuManager - Instance of menu manager to register the controls as a menu.
   * @param {BabylonJS Scene} scene - instance of scene passed from IEditorUIGroup in GUIManager.ts
   */
  Init(advTexture: AdvancedDynamicTexture, scene : Scene) {

    if(scene == null || scene == undefined){console.log("SCENE IS UNDEFINED in ModelBrowser_Menu_V2 INIT")}else{console.log("scene defined in MBV2")};

    scene
    ModelBrowser.instance.OnPreviewLoadCallbacks.push(
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
      optionContainer.metadata = new ButtonOptionMetadata(count);
      

      optionContainer.onPointerDownObservable.add((mousePosition: any, eventState: any) => {
        mousePosition //Suppress Warning
        const button = eventState.target;
        this.modelID = button.metadata.buttonIndex + this.pageNumber * this.modelLoadButtons.length;
        console.log("Model number selected!");
        var infoPick = scene.pick(scene.pointerX, scene.pointerY);
        this.choiceCoords = [infoPick.pickedPoint?.x, infoPick.pickedPoint?.y, infoPick.pickedPoint?.z];
        ModelBrowser.instance.LoadGhostModel(this.modelID, 1, ModelBrowser_Menu_V2.instance.choiceCoords, scene);
        this.spawnFlag = true;
        this.spawnModelPointerClickEvent(this.modelID, scene);
      });

      optionContainer.onPointerEnterObservable.add((control: any) => {
        control.background = ColorScheme.backgroundDarkPurple;
      });
      optionContainer.onPointerOutObservable.add((control: any) => {
        if(!this.spawnFlag){
          control.background = ColorScheme.GetGrayscale(2);
        }
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

    // Create MenuToggle to treat a button as a toggle button
    const toggleButton = advTexture.getControlByName("Navbar_MenuToggle_Objects") as Rectangle;
    this.toggleButton = toggleButton
    toggleButton.onPointerEnterObservable.add(_this._ToggleOnHoverOn)
    toggleButton.onPointerOutObservable.add(_this._ToggleOnHoverOff)
    toggleButton.metadata = {
      isSelected: false
    }
    const menuToggle = new GUI_MenuToggle(toggleButton, guiMenu);

    //Registering toggle menu and button to a toggle group
    const toggleGroup = GUI_MenuManager.instance.FindOrCreateToggleGroup("Navbar");
    toggleGroup.AddToggle(menuToggle)

    //Set menu toggle on pointer functions
    toggleButton.onPointerDownObservable.add(()=>{
      toggleGroup.ActivateToggle(menuToggle)      
    })
    toggleButton.children.forEach((control)=>control.isEnabled = false)

    this.objectInfoMenu.Init(advTexture)



  }
}
