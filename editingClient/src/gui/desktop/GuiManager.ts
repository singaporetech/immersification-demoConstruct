/**
 * @fileoverview
 * GUIManager class acts as container for all of the GUI related components
 * Responsible for loading the .json file containing BabylonJS format GUI and
 * calling the initialize function for each of the components.
 * The class is intended to be used as a singleton instance
 * 
 */

import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { GizmoManager, Nullable, Scene } from "@babylonjs/core";

import { GuiMenuManager } from "../GuiMenu";
import { IUIGroup } from "../UIInterfaces";
import { CollaboratorNameplateMenuController } from "./CollaboratorNameplateMenuController";
import { CollaboratorsInfoPanelMenuController } from "./CollaboratorsInfoPanelMenuController";
import { MarkerMenuController } from "./MarkerMenuController";
import { ModelBrowserMenuController } from "./ModelBrowserMenuController";
import { ObjectsVisibilityMenuController } from "./ObjectsVisibilityMenuController";
import { RoomExitMenuController } from "./RoomExitMenuController";
import { RoomSelectMenuController } from "./RoomSelectMenuController";
import { TransformGizmoSelectMenuController } from "./TransformGizmoSelectMenuController";
import { TransformMenuController } from "./TransformMenuController";
import { AnnotationMenuController } from "./AnnotationMenuController";
import { MeasureMenuController } from "./MeasureMenuController";
import { AnnotationPlatesManager } from "../AnnotationPlatesController";
import {AssetConfig} from "../../config";

/**
 * @classdesc
 * Responsible for loading BabylonJS AdvancedDynamicTexture and initializing components used for UI.
 * This class controls the instating of the lobby browser as well as the in-scene menus (editing menus)
 * TODO: separate the lobby browser and in-scene menu management into different scripts
 */
export class GuiManager {
  static instance: GuiManager;
  scene: Nullable<Scene>;

    /**
   * Controller and UI for the desktop scene selection
   */
  roomSelectMenuController: RoomSelectMenuController;
  desktopRoomSelectionMenuBabylonAdvanceTexture: AdvancedDynamicTexture;

  /**
   * A reference to the base class `IUIGroup` of `DesktopUIGroup`.
   * Handles the initialization of all desktop UI and stores 
   * references to them
   */
  desktopUIGroup: IUIGroup | null = null
  markerAdvanceTexture: AdvancedDynamicTexture;  
  menuManager: GuiMenuManager;
  gizmoManager: GizmoManager

  _lastX: number;
  _lastY: number;
  _deltaX: number;
  _deltaY: number;

  constructor(gizmoManager: any) {
    this.scene = null;

    this.gizmoManager = gizmoManager

    // Room selection UI?
    this.desktopRoomSelectionMenuBabylonAdvanceTexture = AdvancedDynamicTexture.CreateFullscreenUI("Room Session GUI");

    // 3D Markers
    this.markerAdvanceTexture = AdvancedDynamicTexture.CreateFullscreenUI("3D Marker GUI");

    this.menuManager = new GuiMenuManager();

    this.roomSelectMenuController = new RoomSelectMenuController();

    this._lastX = 0;
    this._lastY = 0;
    this._deltaX = 0;
    this._deltaY = 0;

    GuiManager.instance = this;
  }

  /**
   * Initializes GuiManager. Called after loading the website.
   * @param {BabylonJS Scene} scene - Current scene being used in BabylonJS
   */
  Init(scene: Scene) {
    this.scene = scene;
    this.InitializeRoomSessionGUI();

    this.desktopUIGroup = new DesktopUIGroup(
      this.gizmoManager)
    
    this.desktopUIGroup.Initialize(scene)
  }
  
  /**
   * @desc Referencing the room selection GUI
  */
  async InitializeRoomSessionGUI() {
    const advTexture = this.desktopRoomSelectionMenuBabylonAdvanceTexture;
    //await advTexture.parseFromSnippetAsync("#I3VE1Y#28", false);
    await advTexture.parseFromURLAsync(AssetConfig.roomselectionUIDesktop, false);
    this.roomSelectMenuController.Init(this.desktopRoomSelectionMenuBabylonAdvanceTexture);
  }

  /**
   * Callback function to only allow input if it is a numerical value, or character used for numbers.
   * @desc Referencing the room selection GUI
  */
  static Input_OnlyAcceptNumbers(input: any) {
    const key = input.currentKey;
    if (isNaN(parseFloat(key)) && key !== "." && key !== "-") {
      input.addKey = false;
    } else {
      input.addKey = true;
    }
  }

  Uninit(){
    this.desktopUIGroup?.Uninitialize()
  }

  /**
   * Function to be called on every render update.
   */
  OnRenderUpdate() {
    this._deltaX = (this.scene?.pointerX as number) - this._lastX;
    this._deltaY = (this.scene?.pointerY as number) - this._lastY;

    this._lastX = this.scene?.pointerX as number;
    this._lastY = this.scene?.pointerY as number;

    this.menuManager.Update();
    this.desktopUIGroup?.Update()
  }

  SetFlatEditorUIVisibility (isVisible: boolean) {
    this.desktopUIGroup?.SetVisibility(isVisible)
  }

  SetRoomLobbyVisibility(isVisible: boolean) {
    this.desktopRoomSelectionMenuBabylonAdvanceTexture.rootContainer.isVisible = isVisible;
  }

  SetMarkerUIVisibility(isVisible: boolean){
    this.markerAdvanceTexture.rootContainer.isVisible = isVisible
  }

  get pointerPos() {
    return { x: this.scene?.pointerX, y: this.scene?.pointerY };
  }

  get deltaPointerPos() {
    return { deltaX: this._deltaX, deltaY: this._deltaY };
  }
}

/**
 * @description
 * Highest level menu group for in-scene UI menu and objects.
 * All in-scene menu scripts are stored as reference variables.
 * GUI is created on website load NOT when you join the room
 */
class DesktopUIGroup implements IUIGroup{
  babylonAdvanceTexture: AdvancedDynamicTexture
  annotationAdvanceTexture: AdvancedDynamicTexture

  gizmoManager: GizmoManager


  // Room controls menus
  exitRoomMenu: RoomExitMenuController | null = null
  /**
   * bottom right world space visibility menu group
   */
  visibilityMenu: ObjectsVisibilityMenuController | null = null;

  //Tool specific menus  
  transformMenu: TransformMenuController | null = null
  gizmoUI: TransformGizmoSelectMenuController | null = null
  modelBrowserMenu: ModelBrowserMenuController | null = null
  markerMenu: MarkerMenuController | null = null
  measureMenu: MeasureMenuController | null = null;
  annotationMenuController: AnnotationMenuController | null = null

  /**
 * Reference to the manager that handles all spatial
 * annotation UI plates.
 */
  annotationPlatesManager: AnnotationPlatesManager;
    
  // User and collaboration menus
  collaboratorMenu: CollaboratorsInfoPanelMenuController | null = null
  userInfoUI: CollaboratorNameplateMenuController | null = null

  constructor(//advTexture: AdvancedDynamicTexture, 
    gizmoManager: GizmoManager){
      
    const genericAdvTexture = AdvancedDynamicTexture.CreateFullscreenUI("desktop generic GUI");
    const annotationAdvTexture = AdvancedDynamicTexture.CreateFullscreenUI("desktop annotation GUI");

    this.babylonAdvanceTexture = genericAdvTexture
    this.annotationAdvanceTexture = annotationAdvTexture

    this.gizmoManager = gizmoManager
  }

  public async Initialize(scene: Scene): Promise<void> {
    await this.babylonAdvanceTexture.parseFromURLAsync(AssetConfig.sceneUIDesktop, false);    
    await this.annotationAdvanceTexture.parseFromURLAsync(AssetConfig.annotationUIDesktop, false);
    
    this.transformMenu = new TransformMenuController()
    this.gizmoUI = new TransformGizmoSelectMenuController(this.gizmoManager)
    this.modelBrowserMenu = new ModelBrowserMenuController()
    this.annotationMenuController = new AnnotationMenuController();

    this.exitRoomMenu = new RoomExitMenuController()
    this.collaboratorMenu = new CollaboratorsInfoPanelMenuController()

    this.userInfoUI = new CollaboratorNameplateMenuController()
    this.markerMenu = new MarkerMenuController()

    this.visibilityMenu = new ObjectsVisibilityMenuController();

    this.annotationPlatesManager = new AnnotationPlatesManager();
    
    this.userInfoUI.Init(this.babylonAdvanceTexture, scene)

    this.markerMenu.Init(this.babylonAdvanceTexture, scene)
    this.transformMenu.Init(this.babylonAdvanceTexture, scene)
    this.annotationMenuController.Init(this.babylonAdvanceTexture, this.annotationAdvanceTexture, scene)

   /**
   * @desc modelBrowserMenu(AdvancedDynamicTexture, Scene)
   * @desc scene object was passed to this Init() enable model selection drag and drop functionality
   */

    this.modelBrowserMenu.Init(this.babylonAdvanceTexture, scene)
    this.gizmoUI.Init(this.babylonAdvanceTexture, "Transform_Gizmo_");
    this.exitRoomMenu.Init(this.babylonAdvanceTexture)
    this.collaboratorMenu.Init(this.babylonAdvanceTexture, this.userInfoUI.ToggleDisplayCollaborators)

    this.visibilityMenu.Init(this.babylonAdvanceTexture, scene);

    this.measureMenu = new MeasureMenuController();
    this.measureMenu.Init(this.babylonAdvanceTexture, scene);

    this.annotationPlatesManager.init(scene);
    
    this.SetVisibility(false)
  }

  public Uninitialize(): void {

  }

  public SetVisibility(isVisible: boolean): void {
    this.babylonAdvanceTexture.rootContainer.isVisible = isVisible
  }

  public Update(): void {
    this.markerMenu?.Update()
    this.userInfoUI?.Update()
  }
}