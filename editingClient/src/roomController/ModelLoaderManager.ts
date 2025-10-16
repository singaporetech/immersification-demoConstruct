import "@babylonjs/loaders";
import { PBRMaterial, Scene, SceneLoader, AbstractMesh, GaussianSplattingMesh} from "@babylonjs/core";
import { SocketHandler } from "../networking/WebSocketManager";
import { Buffer } from "buffer";
import { Mesh } from "@babylonjs/core";
import { ModelMaster } from "./objects/ServerObjects";

/**
 * 
 * @classdesc
 * This class mainly downloads models into the BabylonJS.Scene.
 * 
 * @function LoadModel references ModelMaster, which will encapsulate the Mesh object once it has been loaded into the scene and
 * process any pending callbacks that were called before the Mesh object was loaded.
 */
export class ModelLoaderManager{
  static instance: ModelLoaderManager;

  scene: Scene
  _htmlDownloadElement: any //html tag as download link starter.

  constructor(scene: Scene) {
    this.scene = scene;

    this._htmlDownloadElement = null;
    ModelLoaderManager.instance = this;
  }

  /**
   * @desc
   * Loads the mesh i.e. actual model into BabylonJS.Scene. The json file contains the directory of the model file,
   * hence, mesh is loaded from that OBJ file.
   * 
   * @param jsonData json file received from the server containing model meta information
   * @param modelMaster modelmaster managing the main mesh that will be loaded in, and its child meshes and clones
   * @callback modelMasterCallback process any pending callbacks that were cached when modelmaster tried cloning mesh(for e.g.) but 
   * main mesh wasnt loaded yet
   */
  async  _HandleLoadMeshAndInfo(jsonData: any, modelMaster: ModelMaster, modelMasterCallback: ()=>void) {
    //Call function to load babylonJS Mesh here!
    const dir = jsonData.directory;
    const meshFileName = jsonData.fileName;
    const gsFileName = jsonData.gsFileName;

    // load the recon mesh
    // add a check that skips mesh downloading if mesh is invaild, or if iteartion number is the same
    const importMesh = (meshFileName == "invaild" || jsonData.version === modelMaster.meshIteratioNID ) ? true : SceneLoader.ImportMeshAsync("", dir, meshFileName, this.scene)
    .then(function (meshData) {
      const validMeshes: any[] = [];
      meshData.meshes.forEach((mesh) => {

        //Set to disable shadows and lighting
        mesh.receiveShadows = false;
        if (mesh.material) {
          const material = mesh.material as PBRMaterial;
          material.unlit = true;
          material.disableLighting = true;
          material.backFaceCulling = false; // Disable back face culling to see the mesh from both sides
        }

        //Don't merge empty parent meshes.
        const _mesh = mesh as Mesh
        if (_mesh._geometry === null) {
          return;
        }
        if (mesh.parent) {
          mesh.setParent(null);
        }
        validMeshes.push(mesh);
      });

      const mergeMesh = Mesh.MergeMeshes(
        validMeshes,
        true,
        true,
        undefined,
        false,
        true
      );

      if(!mergeMesh){
        console.warn("Mesh Load Merge Mesh Failed: ", meshFileName)
        return
      }

      // mergeMesh.position.y = 5;
      mergeMesh.isPickable = true;
      mergeMesh.isVisible = false;
      mergeMesh.position.y = -10000;
    
      modelMaster.mesh = mergeMesh; // The main mesh i.e. main model is assigned to the ModelMaster instance
      modelMaster.mesh.name = modelMaster.name;
    });

    // load the GS mesh
    const importGS = (gsFileName == "invaild" || jsonData.gsVersion === modelMaster.gsIterationID ) ? true : SceneLoader.ImportMeshAsync
    ("", dir, gsFileName /* "1.splat" */, this.scene)
    .then(function (meshData) {
      const gsMesh = meshData.meshes[0];

      if(!gsMesh){
        console.warn("Mesh Load GS Mesh Failed: ", meshFileName)
        return
      }

      gsMesh.isPickable = false;
      gsMesh.isVisible = false;
      gsMesh.position.y = -1000;
      //mesh.createNormals(true);
    
      modelMaster.gsMesh = gsMesh;
      modelMaster.gsMesh.name = "gs_" + modelMaster.name;
    });

    modelMaster.CopyModelInfoFromJson(jsonData);

    // Wait for all mesh and GS to load before continuing
    await Promise.all([importMesh, importGS]);
    modelMasterCallback(); //process any request to cloneMesh() or RecloneMesh() or any other that was invoked beforem main model was loaded
  }

  /**
   * (WIP) Function to download a selected model and associated files as a zip file.
   * @param {ModelMaster} modelMaster - Instance of model master to find model info on server.
   */
  DownloadModelAsZipFile(modelMaster: ModelMaster) {
    const _this = this;
    const sendData = {
      id: modelMaster.modelId.id,
      name: modelMaster.name,
      version: modelMaster.modelId.version,
    };

    const onResponse = function (jsonData: any) {
      const binaryData = Buffer.from(jsonData.zipData, "base64");

      const blob = new Blob([binaryData], { type: "application/zip" });

      if (_this._htmlDownloadElement === null) {
        _this._htmlDownloadElement = document.createElement("a");
        document.body.appendChild(_this._htmlDownloadElement);
      }

      _this._htmlDownloadElement.href = URL.createObjectURL(blob);
      _this._htmlDownloadElement.download = modelMaster.name + ".zip";
      _this._htmlDownloadElement.click();
    };

    SocketHandler.SendData(
      SocketHandler.CodeToServer.Download_ModelZipFile,
      sendData,
      onResponse
    );
  }

  /**
   * @desc LoadModel() loads and stores the model directly from the server into the 3D scene 
   * Only loads once, and its the master copy of the model if the no other copies of the model
   * are present in the scene currently
   * NOTE: Load does not mean load into the scene, it means retrieving from server to create a master model.
   */
  static LoadModel(modelMaster: ModelMaster, modelMasterCallback: ()=>void) {
    console.log("Loading in the model!");
    const sendData = {
      id: modelMaster.modelId.id, // unique model name
      version: modelMaster.modelId.version, // mesh iteration ID
      gsVersion: modelMaster.gsIterationID, // gs version ID
    };
    
    /**
     * @desc
     * A callback function that will receive json file from the server containing model details upon
     * invoking.
     * 
     * @callback _HandleLoadMeshAndInfo
     * 
     */
    const OnReceiveDownloadURL = function (jsonData: any) {
      ModelLoaderManager.instance._HandleLoadMeshAndInfo(
        jsonData,
        modelMaster,
        modelMasterCallback
      );
    };
    /**
     * @desc
     * Send a request to the server to retrieve model details such as where
     * the model would be on the file directory, date created, authors etc.
     * 
     * @callback OnReceiveDownloadURL will be invoked once the server responds, and usually with a JSON file
     * 
     */
    SocketHandler.SendData(
      SocketHandler.CodeToServer.Model_Build3DUrl, // = 3
      sendData, // = basic json (not the db document that contains the details of the models)
      OnReceiveDownloadURL
    );
  }

  static DirectModelDownload(modelId: string, versionID: string, fileName: string, setMeshCallback: (newMesh: Mesh)=>void, scene: Scene) {
  
    const directory = `/downloadModel/${modelId}/models/${versionID}/`

    SceneLoader.ImportMeshAsync("", directory, fileName, scene)
    .then(function(meshData){
      const validMeshes: any[] = [];
      meshData.meshes.forEach((mesh) => {
        //Don't merge empty parent meshes.
        const _mesh = mesh as Mesh
        if (_mesh._geometry === null) {
          return;
        }
        if (mesh.parent) {
          mesh.setParent(null);
        }
        validMeshes.push(mesh);
      });
      
      const mesh = Mesh.MergeMeshes(
        validMeshes,
        true,
        true,
        undefined,
        false,
        true
      );
      if(!mesh){
        console.warn("Mesh Load Merge Mesh Failed: ", modelId + "_" + versionID)
        return
      }
        mesh.isPickable = true;
        mesh.isVisible = true;

        setMeshCallback(mesh)
      })
  }
}
