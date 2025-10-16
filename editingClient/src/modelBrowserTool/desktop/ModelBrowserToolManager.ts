/**
 * @import ModelMaster 
 * @desc To perform client side loading of mesh, especially if there is already a model instance on the client
 * 
 * @import Server Object Manager
 * @desc Access all available ModelMaster objects to peform client side loading of mesh
 */

import { ServerObjectManager } from "../../roomController/ServerObjectManager";
import { Mesh, Scene, PickingInfo, Color3 } from "@babylonjs/core";
import { ModelLoaderManager } from "../../roomController/ModelLoaderManager";
import { SocketHandler } from "../../networking/WebSocketManager";
import { ABaseTool } from "../../tool/ABaseTool";
import { ModelPreview_Data } from "../../utilities/data/ObjectsData";

export class ModelBrowserToolManager extends ABaseTool{
  static instance: ModelBrowserToolManager;
  modelPreviews: Map<string, ModelPreview_Data>;
  filter: string;
  displayedPreviews: ModelPreview_Data[];
  OnPreviewLoadCallbacks: any[];
  ghostMesh: Mesh;
  private updateGhostMesh: boolean;
  scene: any;
  cursorInfo: PickingInfo;

  constructor() {
    super()
    this.modelPreviews = new Map(); //Map of asset_id to model previews

    this.filter = "";
    this.displayedPreviews = [];

    this.OnPreviewLoadCallbacks = [];
    this.ghostMesh = new Mesh("defaultGhostMesh");
    this.updateGhostMesh = false;
    this.cursorInfo = null!;
    ModelBrowserToolManager.instance = this;
  }

  public SetToolActionState(actionState?: number, callback?: (result?: any) => void): void {
    throw new Error("Method not implemented.");
  }

  public DeselectTool() {
    return
  }

  _GetImageURL(id: string) {
    if (this.modelPreviews.has(id)) {
      return this.modelPreviews.get(id)?.thumbnailUrl;
    }
    return null;
  }

  GetPreview(index: number) {
    return this.displayedPreviews[index];
  }

  GetPreviewCount() {
    return this.displayedPreviews.length;
  }

  GetupdateGhostMesh() {
    return this.updateGhostMesh;
  }

  FetchModelPreviews() {
    const _this = this;

    const callback = function (jsonReply: any) {
      const prependMIME = function (data: string) {
        return "data:image/png;base64," + data;
      };
      const model_previews = jsonReply.model_previews;
      model_previews.forEach((preview: any) => {
        const thumbnailSrc = preview.thumbnail_data === null ? "null" : prependMIME(preview.thumbnail_data)
        const modelPreview = new ModelPreview_Data(
          preview.id,
          preview.name,
          thumbnailSrc
        );
        _this.modelPreviews.set(modelPreview.id, modelPreview);
      });

      _this.ApplyFilter();
      _this.OnPreviewLoadCallbacks.forEach((callback) => callback());
    };

    SocketHandler.SendData(
      SocketHandler.CodeToServer.Model_DownloadModelPreviews,
      {},
      callback
    );
  }

  RequestModelDownload(index: number, versionIndex: number, coordinates : (number | undefined)[]) {
    const preview = this.displayedPreviews[index]; // model ID to recognise models stored in the local server model directory database
    const sendData = {
      asset_id: [preview.id, "__LIVE_VERSION"],
      position: coordinates, //[0,0,0], //loading model into position deprecated://For now, just load model into origin.
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
  
    SocketHandler.SendData(
      SocketHandler.CodeToServer.EditServer_ClientRequest_CreateNewMeshObject,
      sendData
    );
    console.log("Model download request sent"); // for debugging purposes
  }

  /**
   * @desc
   * Loads the model directly from the local directory if available
   * The model loading will only affect client side therefore server does not know the client side model is loaded
   * 
   * @param index Button Index that will be used to identify which models to load
   * @param versionIndex Index to identify which model version to download
   * @param coordinates {x : number, y : number, z: number} - Coordinates to place the model
   * 
   * @returns Nothing. The Ghost Mesh object can be accessed through this ModelBrowser singleton instance!
   */
  LoadGhostModel(index: number, versionIndex: number, coordinates : (number | undefined)[], ghostScene: Scene) {
    this.scene = ghostScene;
    const preview = this.displayedPreviews[index]; // model ID to recognise models stored in the local server model directory database
    //Leon: I did a quick fix of using SocketHandler.SendData to get the download URL + extension
    //, then just putting everything in an arrow function to avoid the async issue.
    SocketHandler.SendData(
      SocketHandler.CodeToServer.Model_Build3DUrl,
      {
        id: preview.id,
        version: "1" // versionIndex
      },
      (jsonData: any) => {
        var modelFileName = jsonData.fileName;
        if(coordinates != undefined){
          ModelLoaderManager.DirectModelDownload(preview.id, versionIndex.toString(), modelFileName, (newMesh: Mesh) => {
            newMesh.position.x = coordinates[0]!;
            newMesh.position.y = coordinates[1]!;
            newMesh.position.z = coordinates[2]!;
            newMesh.isVisible = true;
            newMesh.visibility = 0.1;
            newMesh.renderOverlay = true;
            newMesh.overlayColor = Color3.FromHexString("#FBF9F9");
            newMesh.isPickable = false; 
            newMesh.name = "Ghost Mesh"
            this.ghostMesh = newMesh;
            this.updateGhostMesh = true; // Time to update GhostModelFollowsCursor
          }, ServerObjectManager.instance?.scene);  
        }
        else
        {
          console.log("Undefined coordinates!");
        }
      }
    )
  }

  /**
   * @desc Deletes the ghostMesh i.e. this.GhostMesh
   * Sets the ghost mesh back to default ghost mesh 
   */
  DeleteGhostModel() {
    if(this.ghostMesh.name != "defaultGhostMesh"){
      console.log("Deleting Ghost model.");
      this.ghostMesh.dispose();
      this.ghostMesh = new Mesh("defaultGhostMesh");
      this.updateGhostMesh = false;
      
    }
  }

  /**
   * @desc Updates the ghost model mesh in real time.
   * Called in @file EditingMode.tsx under @var onRender
   */
  GhostModelFollowsCursor() {
    if(this.updateGhostMesh == true){
      //update ghost mesh
      this.cursorInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
      this.ghostMesh.position.x = this.cursorInfo.pickedPoint?.x!;
      this.ghostMesh.position.y = this.cursorInfo.pickedPoint?.y!;
      this.ghostMesh.position.z = this.cursorInfo.pickedPoint?.z!;
    }
  }

  ClearFilter() {
    this.filter = "";
    this.displayedPreviews = [];
    this.displayedPreviews = Array.from(this.modelPreviews.values());
  }

  SetFilter(filter: string) {
    this.filter = filter.toLowerCase();
  }

  ApplyFilter() {
    const filterWords = this.filter.split(" ");
    if (this.filter.length === 0 || filterWords.length === 0) {
      this.ClearFilter();
      return;
    }

    this.displayedPreviews = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;

    const previewIt = this.modelPreviews.values();
    let iteration = previewIt.next();

    //For each preview stored,
    while (!iteration.done) {
      let passed = true;
      const modelPreview = iteration.value;
      //Check if model name contains all filter words.
      filterWords.forEach((word) => {
        const name = modelPreview.name.toLowerCase();
        if (!name.includes(word)) {
          passed = false;
        }
      });

      //If name contains all words, add to be displayed.
      if (passed) {
        _this.displayedPreviews.push(iteration.value);
      }

      iteration = previewIt.next();
    }
  }
}
