/**
 * @fileoverview
 * GUIManager class acts as container for all of the GUI related components
 * Responsible for loading the .json file containing BabylonJS format GUI and
 * calling the initialize function for each of the components.
 * The class is intended to be used as a singleton instance
 * 
 */

import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { GUI_MenuManager } from "./GuiMenu";
import { EditingSession_Menu } from "./EditingSession_Menu";
import { GizmoManager, Nullable, Scene } from "@babylonjs/core";
import { ModelBrowser_Menu_V2 } from "./ModelBrowser_Menu_V2";
import { ExitRoom_Menu_V2 } from "./ExitRoom_Menu_V2";
import { GizmoSelect_UI } from "./GizmoSelect_UI";
import { CollaboratorInfo_Menu } from "./CollaboratorInfo_Menu";
import { EditingRoomMarkerUI_V2 } from "./EditingRoomMarkerUI_V2";
import { EditingRoomUserInfoUI_V2 } from "./EditingRoomUserInfoUI_V2";
import { Transform_Menu as Transform_Menu } from "./Transform_Menu";
import { EditingRoomVisibility_Menu } from "./EditingRoomVisibility_Menu";

interface IEditorUIGroup{
  babylonAdvanceTexture: AdvancedDynamicTexture

  Initialize(scene: Scene): Promise<void>
  Uninitialize(): void
  SetVisibility(isVisible: boolean): void
  Update(): void
}

class EditorUIGroup_V2 implements IEditorUIGroup{
  babylonAdvanceTexture: AdvancedDynamicTexture

  gizmoManager: GizmoManager

  //top bar menu items
  transformMenu: Transform_Menu | null = null
  markerMenu: EditingRoomMarkerUI_V2 | null = null
  modelBrowserMenu: ModelBrowser_Menu_V2 | null = null

  collaboratorMenu: CollaboratorInfo_Menu | null = null

  exitRoomMenu: ExitRoom_Menu_V2 | null = null

  userInfoUI: EditingRoomUserInfoUI_V2 | null = null

  // Transform gizmo 3D/spatial UI
  gizmoUI: GizmoSelect_UI | null = null

  // bottom right world space visibility menu group
  visibilityMenu: EditingRoomVisibility_Menu | null = null;

  constructor(advTexture: AdvancedDynamicTexture, gizmoManager: GizmoManager){
    this.babylonAdvanceTexture = advTexture
    this.gizmoManager = gizmoManager
  }

  public async Initialize(scene: Scene): Promise<void> {
    // await this.babylonAdvanceTexture.parseFromSnippetAsync("#9YK413#17", false);
    await this.babylonAdvanceTexture.parseFromURLAsync("editingGUI_V0.4a.json", false);
    
    this.transformMenu = new Transform_Menu()
    this.modelBrowserMenu = new ModelBrowser_Menu_V2()
    this.gizmoUI = new GizmoSelect_UI(this.gizmoManager)
    this.exitRoomMenu = new ExitRoom_Menu_V2()
    this.collaboratorMenu = new CollaboratorInfo_Menu()

    this.userInfoUI = new EditingRoomUserInfoUI_V2()
    this.markerMenu = new EditingRoomMarkerUI_V2()

    this.visibilityMenu = new EditingRoomVisibility_Menu();

    this.markerMenu.Init(this.babylonAdvanceTexture, scene)
    this.userInfoUI.Init(this.babylonAdvanceTexture, scene)
    this.transformMenu.Init(this.babylonAdvanceTexture, scene)

   /**
   * @desc modelBrowserMenu(AdvancedDynamicTexture, Scene)
   * @desc scene object was passed to this Init() enable model selection drag and drop functionality
   */

    this.modelBrowserMenu.Init(this.babylonAdvanceTexture, scene)
    this.gizmoUI.Init(this.babylonAdvanceTexture, "Transform_Gizmo_");
    this.exitRoomMenu.Init(this.babylonAdvanceTexture)
    this.collaboratorMenu.Init(this.babylonAdvanceTexture, this.userInfoUI.ToggleDisplayCollaborators)

    this.visibilityMenu.Init(this.babylonAdvanceTexture, scene);

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

/**
 * @classdesc
 * Responsible for loading BabylonJS AdvancedDynamicTexture and
 * initializing components used for UI. This class is intended to be used
 * as a singleton instance by the script intializing the BabylonJS scene.
 * Do not create more than one instance in this program's lifetime.
 */
export class GUIManager {
  static instance: GUIManager;
  scene: Nullable<Scene>;
  
  roomSessionBabylonAdvanceTexture: AdvancedDynamicTexture;
  markerAdvanceTexture: AdvancedDynamicTexture;  
  menuManager: GUI_MenuManager;
  gizmoManager: GizmoManager

  editorUIGroup: IEditorUIGroup | null = null

  editingSessionMenu: EditingSession_Menu;

  _lastX: number;
  _lastY: number;
  _deltaX: number;
  _deltaY: number;

  constructor(gizmoManager: any) {
    this.scene = null;

    this.gizmoManager = gizmoManager

    // Room selection UI?
    this.roomSessionBabylonAdvanceTexture = AdvancedDynamicTexture.CreateFullscreenUI("Room Session GUI");

    // 3D Markers while in the room
    this.markerAdvanceTexture = AdvancedDynamicTexture.CreateFullscreenUI("3D Marker GUI");

    this.menuManager = new GUI_MenuManager();

    this.editingSessionMenu = new EditingSession_Menu();

    this._lastX = 0;
    this._lastY = 0;
    this._deltaX = 0;
    this._deltaY = 0;

    GUIManager.instance = this;
  }

  /**
   * @desc Referencing the room selection GUI
  */
  //Callback function to only allow input if it is a numerical value, or character used for numbers.
  static Input_OnlyAcceptNumbers(input: any) {
    const key = input.currentKey;
    if (isNaN(parseFloat(key)) && key !== "." && key !== "-") {
      input.addKey = false;
    } else {
      input.addKey = true;
    }
  }

  /**
   * @desc Referencing the editor UI
  */
  /**
   * Initializes GuiManager
   * @param {BabylonJS Scene} scene - Current scene being used in BabylonJS
   */
  Init(scene: Scene) {
    this.scene = scene;
    //this.InitializeMarkerGUI(scene);
    this.InitializeRoomSessionGUI();

    //2D spatial
    // var plane = Mesh.CreatePlane("plane", 2);
    // plane.position.y = 2;

    // const advTexture = AdvancedDynamicTexture.CreateForMesh(plane);

    // This advTexture is for the entire flat PC GUI, including the markers
    const advTexture = AdvancedDynamicTexture.CreateFullscreenUI("Editing GUI");
    //this.editorUIGroup = new EditorUIGroup_V1(advTexture, this.gizmoManager, this.menuManager)
    this.editorUIGroup = new EditorUIGroup_V2(advTexture, this.gizmoManager)
    
    this.editorUIGroup.Initialize(scene)
  }
  
    /**
   * @desc Referencing the room selection GUI
  */
  async InitializeRoomSessionGUI() {
    const advTexture = this.roomSessionBabylonAdvanceTexture;
    //await advTexture.parseFromSnippetAsync("#I3VE1Y#28", false);
    await advTexture.parseFromURLAsync("EC_LobbyUI_v3.json", false);
    this.editingSessionMenu.Init(this.roomSessionBabylonAdvanceTexture);
  }

  Uninit(){
    this.editorUIGroup?.Uninitialize()
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
    this.editorUIGroup?.Update()
  }

  SetFlatEditorUIVisibility (isVisible: boolean) {
    this.editorUIGroup?.SetVisibility(isVisible)
  }

  SetRoomLobbyVisibility(isVisible: boolean) {
    this.roomSessionBabylonAdvanceTexture.rootContainer.isVisible = isVisible;
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
