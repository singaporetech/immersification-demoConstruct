/**
 * @fileoverview
 * Defines the Model info menu class which displays the creation information of the
 * currently picked mesh in BabylonJS. Displays information such as Author, creation date,
 * description, that is stored in model master when the model information is downloaded.
 * 
 */
import { Nullable } from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Image } from "@babylonjs/gui";
import { ModelBrowser } from "../ModelBrowser";
import { ModelLoader } from "../ModelLoader";
import { ServerObjectManager } from "../ServerObjectManager";
import { ModelMaster } from "../ServerObjects";
import { GUI_MenuManager } from "./GuiMenu";
import { PickingManager, SelectModelEvent } from "../PickingManager";
import { CameraSettings } from "../CameraSettings";


export class ModelInfo_Menu {
  static instance: ModelInfo_Menu;
  modelThumbnail: any;
  modelNameInput: any;
  authorInput: any;
  createdDate: any;
  descriptionTextBlock: any;
  saveButton: any;
  resetButton: any;
  editDescriptionButton: any;
  editDescriptionOverlay: any;
  editDescriptionSaveButton: any;
  editDescriptionCancelButton: any;
  descriptionInput: any;
  downloadButton: any;
  currentModelMaster: Nullable<ModelMaster>;

  constructor() {
    //GUI Controls
    this.modelThumbnail = undefined; //Image Control to display thumbnail of model
    this.modelNameInput = undefined; //TextInput Field for user to input name
    this.authorInput = undefined; //TextInput Field for user to input author
    this.createdDate = undefined; //Text Control to display model creation date
    this.descriptionTextBlock = undefined; //Text Control to display model description.
    this.saveButton = undefined; //Button Control to save new model info
    this.resetButton = undefined; //Button Control to reset model info to unmodified state.

    this.editDescriptionButton = undefined; //Button Control to open menu to edit description
    this.editDescriptionOverlay = undefined; //Control to overlay menu.
    this.editDescriptionSaveButton = undefined; //Button Control to save edited description.
    this.editDescriptionCancelButton = undefined; //Button Control to cancel edited description.
    this.descriptionInput = undefined; //TextInput Field to input new description.

    this.downloadButton = undefined; //Button Control to download selected model as zipfile.

    this.currentModelMaster = null; //Tracks where to pull model info from.
    ModelInfo_Menu.instance = this;
  }

  /**
   * Function to reset displayed information to empty.
   * Used when no model is selected, or when no model Master was found.
   */
  ClearModelInfo() {
    const _this = ModelInfo_Menu.instance
    _this.modelThumbnail.source = "guicons/image.png";
    _this.modelNameInput.text = "---";
    _this.authorInput.text = "---";
    _this.descriptionTextBlock.text = "---";

    _this.currentModelMaster = null;
  }

  /**
   * Reset's all text fields to original state from model master.
   */
  ResetInputText() {
    const modelMaster = this.currentModelMaster;
    if (modelMaster === null) {
      return;
    }

    this.modelNameInput.text = modelMaster.name;
    this.authorInput.text = modelMaster.authors;
    this.descriptionTextBlock.text = modelMaster.description;
  }

  /**
   * Saves the current text input fields to update model master.
   */
  SaveInputText() {
    if (this.currentModelMaster === null) {
      return;
    }

    const newInfo = {
      id: this.currentModelMaster.modelId.id,
      name: this.modelNameInput.text,
      authors: this.authorInput.text,
      description: this.descriptionTextBlock.text,
    };
    this.currentModelMaster.UpdateModelMaster(newInfo);
    //ModelLoader.instance.UpdateModelMaster(newInfo);
  }

  /**
   * Loads model information (author, description, thumbnail) from
   * model master.
   */
  LoadModelInfoFromModelMaster(evnt: SelectModelEvent) {
    const _this = ModelInfo_Menu.instance
    let instanceId: number = evnt.selectedModel.metadata.instanceId
    let modelMaster: ModelMaster = ServerObjectManager.instance.GetModelState(instanceId)?.modelMaster as ModelMaster;
    _this.modelNameInput.text = modelMaster.name;
    _this.authorInput.text = modelMaster.authors;
    _this.descriptionTextBlock.text = modelMaster.description;
    _this.createdDate.text = modelMaster.dateCreated ? "Created on " + modelMaster.dateCreated : "Creation date missing";

    const src = ModelBrowser.instance._GetImageURL(modelMaster?.modelId.id);
    if (src === null) {
      _this.modelThumbnail.source = "guicons/image.png";
    } else {
      _this.modelThumbnail.source = src;
    }

    _this.currentModelMaster = modelMaster;
  }

  /**
   * Function for edit description button to call
   * to show description overlay.
   */
  OpenEditDescriptionOverlay() {
    this.editDescriptionOverlay.isVisible = true;
    this.descriptionInput.text = this.descriptionTextBlock.text;
  }

  /**
   * Function to call
   * to close description overlay.
   */
  CloseEditDescriptionOverlay(isSaving: boolean) {
    this.editDescriptionOverlay.isVisible = false;

    if (isSaving) {
      this.descriptionTextBlock.text = this.descriptionInput.text;
      this.SaveInputText();
    }
  }

  /**
   * Init function that binds controls from BabylonJs AdvancedDynamicTexture and
   * adds relevant callbacks to enable this menu's required interactivity.
   * This class is dependent on the UI objects loaded into AdvanceDynamicTexture to have
   * the correct naming scheme in order to search for the controls.
   * @param {BabylonJs AdvancedDynamicTexture} advTexture - AdvancedDynamicTexture to search for controls from.
   * @param {GUI_MenuManager} menuManager - Instance of menu manager to register the controls as a menu.
   */
  Init(advTexture: AdvancedDynamicTexture, menuManager: GUI_MenuManager) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    this.modelThumbnail = advTexture.getControlByName(
      "ModelInfoMenu_ModelThumbnail"
    );
    this.modelNameInput = advTexture.getControlByName(
      "ModelInfoMenu_ModelNameInput"
    );
    this.authorInput = advTexture.getControlByName("ModelInfoMenu_AuthorInput");
    this.descriptionTextBlock = advTexture.getControlByName(
      "ModelInfoMenu_DescriptionTextBlock"
    );
    this.createdDate = advTexture.getControlByName("ModelInfoMenu_CreatedText");

    this.saveButton = advTexture.getControlByName("ModelInfoMenu_SaveButton");
    this.resetButton = advTexture.getControlByName("ModelInfoMenu_ResetButton");

    //Setting On Focus observable for text inputs
    this.modelNameInput.onFocusObservable.add(
      () => {
        CameraSettings.EnableCameraMovement(false);
      }
    );
    this.authorInput.onFocusObservable.add(
      () => {
        CameraSettings.EnableCameraMovement(false);
      }
    );

    //Setting on Blur observable for text inputs
    this.modelNameInput.onBlurObservable.add(
      () => {
        CameraSettings.EnableCameraMovement(true);
      }
    );
    this.authorInput.onBlurObservable.add(() => {
      CameraSettings.EnableCameraMovement(true);
    });

    this.saveButton = advTexture.getControlByName("ModelInfoMenu_SaveButton");
    this.resetButton = advTexture.getControlByName("ModelInfoMenu_ResetButton");

    this.saveButton.onPointerDownObservable.add(
      () => {
        ModelInfo_Menu.instance.SaveInputText();
      }
    );
    this.resetButton.onPointerDownObservable.add(
      () => {
        ModelInfo_Menu.instance.ResetInputText();
      }
    );

    //Initialise edit description overlay functions.
    this.editDescriptionButton = advTexture.getControlByName(
      "ModelInfoMenu_DescriptionEditIcon"
    );
    this.editDescriptionOverlay = advTexture.getControlByName(
      "ModelInfoMenu_DescriptionInputOverlay"
    );
    this.descriptionInput = advTexture.getControlByName(
      "ModelInfoMenu_DescriptionInput"
    );
    this.editDescriptionSaveButton = advTexture.getControlByName(
      "ModelInfoMenu_DescSaveButton"
    );
    this.editDescriptionCancelButton = advTexture.getControlByName(
      "ModelInfoMenu_DescCancelButton"
    );

    this.editDescriptionButton.onPointerDownObservable.add(
      () => {
        _this.OpenEditDescriptionOverlay();
      }
    );
    this.editDescriptionSaveButton.onPointerDownObservable.add(
      () => {
        _this.CloseEditDescriptionOverlay(true);
      }
    );
    this.editDescriptionCancelButton.onPointerDownObservable.add(
      () => {
        _this.CloseEditDescriptionOverlay(false);
      }
    );
    this.descriptionInput.onFocusObservable.add(
      () => {
        CameraSettings.EnableCameraMovement(false);
      }
    );
    this.descriptionInput.onBlurObservable.add(
      () => {
        CameraSettings.EnableCameraMovement(true);
      }
    );

    //Initialise Download Buttons
    this.downloadButton = advTexture.getControlByName(
      "ModelInfoMenu_DownloadButton"
    );
    this.downloadButton.onPointerDownObservable.add(
      () => {
        if (_this.currentModelMaster !== null) {
          ModelLoader.instance.DownloadModelAsZipFile(_this.currentModelMaster);
        }
      }
    );

    //Initialise Menu as Movable Menu
    const menu: Control = advTexture.getControlByName("ModelInfoMenu_Container") as Control;
    const moveControl: Control = advTexture.getControlByName("ModelInfoMenu_TitleText") as Control;
    const toggleControl: Control = advTexture.getControlByName("Edit_Menu_Toggle_0") as Control;
    const menuObjects = menuManager.CreateDefaultBehaviour(
      menu,
      moveControl,
      toggleControl,
      "Edit"
    );

    menuObjects.guiMenu.OnEnableCallback = function () {
      menuObjects.guiMenu.container.isVisible = true;
      _this.editDescriptionOverlay.isVisible = false;
    };

    const toggleImage = advTexture.getControlByName(
      "Edit_Menu_Image_0"
    ) as Image;
    toggleImage.isEnabled = false;

    //Prep Menu logic for use.
    this.ClearModelInfo();

    const pickingManager = PickingManager.ActiveInstance
    if(pickingManager){
      pickingManager.onSelectListener.Subscribe(this.LoadModelInfoFromModelMaster)
      pickingManager.onDeselectListener.Subscribe(this.ClearModelInfo)
    }
  }

  Uninit(){
    const pickingManager = PickingManager.ActiveInstance
    if(pickingManager){
      pickingManager.onSelectListener.Unsubscribe(this.LoadModelInfoFromModelMaster)
      pickingManager.onDeselectListener.Unsubscribe(this.ClearModelInfo)
    }
  }
}
