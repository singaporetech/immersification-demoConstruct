/**
 * @fileoverview
 * Defines the list of classes that represents each type of server object managed serialized on the server such as users, mesh_instances, lights.
 * 
 * 
 * Documentation @author
 */
import { SocketHandler } from "../../networking/WebSocketManager";
import { Mesh, Nullable, Scene, Vector3, SceneLoader, Color3, StandardMaterial, PBRMaterial, GaussianSplattingMesh

  
} from "@babylonjs/core";
import { ModelLoaderManager } from "../ModelLoaderManager";
import { ServerObjectManager } from "../ServerObjectManager";
import { Array3ToAxes } from "../../utilities/ArrayUtility";
import { ServerModelMetadata } from "../../utilities/data/ObjectsData";
import { EventData } from "../../utilities/delegates/EventListener";
import { DC_GlobalEventData } from "../../utilities/delegates/GlobalEventListener";
import { deviceInputType, modelType, serverobjectType } from "../../utilities/enums/enums";
import { MathUtility } from "../../utilities/MathUtility";
import { TransformComponent } from "./components/TransformComponent";
import { AnnotationComponent } from "./components/AnnotationComponent";
import { ObjectPickingManager } from "../../objectPickingSelection/ObjectPickingManager";

const _LIVE_VERSION = "__LIVE_VERSION";

export class ServerObject { // extends ObjectTransform TOOD: Check if the extend is implemented properly
  transform: TransformComponent
  // position: Vector3;
  // rotation: Vector3;
  // scale: Vector3;
  constructor() {
    this.transform = new TransformComponent()
  }
}

/**
 * @classdesc
 * 
 * The class is a central controller responsible for storing meta data (author, name, desc), 
 * the main master mesh, and cloned mesh, as well as their management (updating of the master and clone meshes).
 * 
 * The ModelMaster system clones meshes from the main mesh. That means, once the first time the mesh (model) is loaded 
 * into BabylonJS.Scene, subsequent models (same model) will be cloned, hence preventing repetitive transaction with the local server,
 * improving performance
 * 
 * It is also a class that manages the state of the models(mesh) and its clones through utilizing the ModelStates Object,
 * especially for model transformation...
 * 
 */
export class ModelMaster { 
  static LIVE_VERSION = _LIVE_VERSION;
  
  /**
   * Mesh object (The model object) associated with this ModelMaster instance
   */
  mesh: Nullable<Mesh>;

    /**
   * GS object (The model object) associated with this ModelMaster instance
   */
  gsMesh: any // <GaussianSplattingMesh>
  /**
   * @desc 
   * below is the model meta data.. e.g. name..
   * @param modelId is used as a part of a message request to load the model from the server
   */
  modelId: any;
  meshIteratioNID: number;
  gsIterationID: number;
  name: string;
  authors: string;
  description: string;
  dateCreated: string;
  modelStates: Map<any, any>;
  _pendingMeshCallbacks: any[];
  cloneCount: number;

  constructor(modelId: any) {
    this.mesh = null;
    this.modelId = modelId;
    this.meshIteratioNID = 0;
    this.gsIterationID = 0;

    this.name = "null";
    this.authors = "null";
    this.description = "null";
    this.dateCreated = "null";

    this.modelStates = new Map();
    this._pendingMeshCallbacks = [];
    this.cloneCount = 0;
  }
  /**
   * @desc
   * Copies model meta info: name, author etc. from a JSON data into this modelmaster instance - handled by CopyModelInfoFromJson()
   * 
   * Copies the new model version number into this modelmaster instance
   * 
   * Updates the serve the new meta info of the model
   * 
   * @param 
   * JSONData containing model meta data
   */
  UpdateModelMaster(newInfo: any) {
    this.CopyModelInfoFromJson(newInfo);
    newInfo.versionNumber = this.modelId.version;
    newInfo.gsVersionNumber = this.gsIterationID;
    SocketHandler.SendData(
      SocketHandler.CodeToServer.ModelInfo_SaveNewInfo,
      newInfo
    );
  }
  
  /**
   * @desc
   * Copies model meta info: name, author etc. from a JSON data into this modelmaster instance
   * 
   * USE CASE Example:
   * 
   * Its used in _HandleLoadMeshInfo() callback  in ModelLoader that receives a JSON data
   * after sending a requesting to the server for model information.   
   * 
   * 
   * @param 
   * JSONData containing model meta data
   */
  CopyModelInfoFromJson(jsonData: any) {
    this.name = jsonData.name;
    this.authors = jsonData.authors;
    this.description = jsonData.description;
    this.dateCreated = jsonData.dateCreated ? jsonData.dateCreated : this.dateCreated;
    this.meshIteratioNID = jsonData.version
    this.gsIterationID = jsonData.gsVersion
  }

  /**
   * @desc
   * Once the main mesh is available in this ModelMaster instance, 
   * the pending callbacks e.g. CloneMesh().AssignMesh() will all be called in FIFO fashion
   */
  _InvokeCallbacks() {
    if (this.mesh === null) {
      throw new Error(
        "Model Master cannot invoke callbacks while mesh is not loaded!"
      );
    }
    this._pendingMeshCallbacks.forEach((callback) => {
      callback(this.mesh);
    });
    this._pendingMeshCallbacks = [];
  }

  _RecloneMeshes() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const RecloneMesh = async function (modelState: ModelState) {
      if (modelState.mesh === null) {
        console.warn(
          "Model State Mesh was still waiting clone while reclone was called."
        );
        return;
      }

      const oldMesh = modelState.mesh;
      const metadata = modelState.mesh.metadata;
      const parentMesh = modelState.mesh.parent;
      const oldTransform = { position: modelState.transform.position.clone(), 
                              rotation: modelState.transform.rotation.clone(), 
                              scaling: modelState.transform.scaling.clone()
                            }
      await _this.UpdateMasterModelTransform(oldTransform);

      var selectedObject = null;
      // create mesh
      if(_this.mesh !== null && _this.mesh !== undefined)
      {
        let selected = ObjectPickingManager.instance.IsSameSelection(modelState.mesh);

        modelState.mesh = (_this.mesh as Mesh).clone();
        modelState.mesh.name = oldMesh.name;
        modelState.mesh.isVisible = oldMesh.isVisible;
        modelState.mesh.metadata = metadata;
        modelState.mesh.setParent(parentMesh);

        if(selected)        
        {          
          ObjectPickingManager.instance.ClearSelection();
          selectedObject = modelState.mesh;
        }

      }

      if(_this.gsMesh !== null&& _this.gsMesh !== undefined)
      {
        let selected = ObjectPickingManager.instance.IsSameSelection(modelState.gsMesh);

        modelState.gsMesh = _this.gsMesh.clone();
        modelState.gsMesh.name = "gs_" + oldMesh.name;
        modelState.gsMesh.isVisible = oldMesh.isVisible;
        modelState.gsMesh.metadata = metadata;
        modelState.gsMesh.setParent(parentMesh);

        if(selected)        
        {      
          ObjectPickingManager.instance.ClearSelection();    
          selectedObject = modelState.gsMesh;
        }
      }

      oldMesh.dispose()

      // await modelState.ApplyTransformToAll();
      ObjectPickingManager.instance.SelectObject(selectedObject);
    };

    for (const modelState of this.modelStates.values()) {
      RecloneMesh(modelState);
    }
  }

/**
 * @desc 
 * Clones the main mesh (the main model) that is cached in this ModelMaster instance
 * Each clone mesh is associated with its own ModelState instance, which contains information such as its coordinates
 * 
 * Essentially, the function does not load new meshes from the server, rather cloning the current mesh (if available) in the client side
 * 
 * If main mesh is not available, this function will assign a pending callback, so once the main mesh is available, all pending callbacks
 * will be invoked
 * 
 * @param modelState 
 * 
 * The modelState instance passed to this function will get a clone of the main model (main mesh), meta information of the model.
 */
  CloneMesh(modelState: ModelState) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    /**
     * @desc 
     * This function is a callback that will be invoked if the main mesh (i.e. mesh of this ModelMaster) is created
     * 
     * This function primarily does the cloning by first:
     * 
     * 1. Clone the main mesh and assign the cloned mesh to the @param modelState
     * 2. Pass all the meta data of the main mesh to @param modelState
     * 3. Retrieve the main mesh Model State through instanceId if available
     * 4. Set the assigned mesh in the modelState, its parent (i.e. mesh.parent) attribute to the main mesh Model as parent
     * 5. Assign all child meshes(related to the clone mesh) parent attribute to this clone mesh
     * @param mesh
     */
    const AssignMesh = function (mesh: Mesh) {
      if(_this.mesh === undefined || _this.mesh === null)
      {
        return;
      }
      _this.cloneCount += 1;
      //Obtain mesh by cloning to share geometry data. See BabylonJs api for Mesh.clone().
      //Saves memory and easily allow mesh change.
      modelState.mesh = _this.mesh.clone();
      modelState.mesh.name = _this.mesh.name + " " + _this.cloneCount;
      modelState.mesh.isVisible = true;
      modelState.mesh.isPickable = true;
      modelState.mesh.metadata = new ServerModelMetadata(modelState.instanceId, serverobjectType.model, modelState.editable, -1);

      //Set mesh parent first,
      if (modelState.parentId !== -1) {
        const parentState = ServerObjectManager.instance.GetModelState(
          modelState.parentId
        );
        if (parentState?.mesh !== null) {
          modelState.mesh.setParent(parentState?.mesh as Mesh);
        }
      }
      //Then apply transform values from state to mesh.
      modelState.ApplyTransformToAll();

      //Now that this state has a mesh assigned, allow children's meshes to parent to this mesh.
      modelState.childIds.forEach((childId: any) => {
        const childState = ServerObjectManager.instance.GetModelState(childId);
        if (childState?.mesh !== null) {
          childState?.mesh.setParent(modelState.mesh);
          childState?.ApplyTransformToAll();
        }
      });

      if(modelState.editable)
        ServerObjectManager.instance?.SetEnvironmentMesh(modelState.mesh);

      modelState.ReinitializeModelState(); //DO NOT REMOVE. TODO: Figure out a way to removing have to intialize the model everytime the GS or mesh is cloned.
    };

    //If master already has mesh, assign immediately.
    if (this.mesh !== undefined && this.mesh !== null) {
      AssignMesh(this.mesh);
      return;
    }

    //Else, add to callback list for once master copy of mesh has been loaded by BabylonJS.
    _this._pendingMeshCallbacks.push(AssignMesh);
  }

  CloneGSMesh(modelState: ModelState) {
    const _this = this;
    /**
     * @desc 
     * This function is a callback that will be invoked if the main mesh (i.e. mesh of this ModelMaster) is created
     * 
     * This function primarily does the cloning by first:
     * 
     * 1. Clone the main mesh and assign the cloned mesh to the @param modelState
     * 2. Pass all the meta data of the main mesh to @param modelState
     * 3. Retrieve the main mesh Model State through instanceId if available
     * 4. Set the assigned mesh in the modelState, its parent (i.e. mesh.parent) attribute to the main mesh Model as parent
     * 5. Assign all child meshes(related to the clone mesh) parent attribute to this clone mesh
     * @param mesh
     */
    const AssignGS = function (gsMesh: any) {
      if(_this.gsMesh === undefined || _this.gsMesh === null)
      {
        return;
      }

      modelState.gsMesh = _this.gsMesh.clone();
      modelState.gsMesh.name = _this.gsMesh.name + " " + _this.cloneCount;
      modelState.gsMesh.isVisible = true;
      modelState.gsMesh.isPickable = true;
      modelState.gsMesh.metadata = new ServerModelMetadata(modelState.instanceId, serverobjectType.model, modelState.editable, -1);

      modelState.ApplyTransformToAll();

      // modelState.setGSInteractable(true);
      modelState.ReinitializeModelState(); //DO NOT REMOVE. TODO: Figure out a way to removing have to intialize the model everytime the GS or mesh is cloned.
    };

    //If master already has mesh, assign immediately.
    if (this.gsMesh !== undefined && this.gsMesh !== null) {
      AssignGS(this.gsMesh);
      return;
    }
    //Else, add to callback list for once master copy of mesh has been loaded by BabylonJS.
    _this._pendingMeshCallbacks.push(AssignGS);
  }
  
/**
 * @desc
 * Cache the modelstate object to the ModelMaster. 
 * This is adding a model to a ModelMaster for tracking and management
 * 
 * However, if the modelState.mesh is null, the function assumes
 * that the modelstate passed is intended to be cloned with the ModelMaster mesh
 * @param modelState 
 */
  RegisterModelState(modelState: ModelState) {    
    this.modelStates.set(modelState.instanceId, modelState)

    if (modelState.mesh === null)
    {
      this.CloneMesh(modelState);
    }

    if(modelState.gsMesh === null)
    {
      this.CloneGSMesh(modelState);
    }
  }

  RemoveModelState(instanceId: any) {
    if (this.modelStates.has(instanceId)) {
      this.modelStates.delete(instanceId);
    }
  }

  ReloadModel() {
    const _this = this;
    const callback = function () {
      _this._RecloneMeshes();
    };
    ModelLoaderManager.LoadModel(this, callback);
  }

  Initialize() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const callback = function () {
      _this._InvokeCallbacks();
    };
    ModelLoaderManager.LoadModel(this, callback);
  }

  UpdateMasterModelTransform(convertedData: {
    position: Vector3,
    rotation: Vector3,
    scaling: Vector3
  }) {
    const _this = this;
    if(_this.mesh !== null && _this.mesh !== undefined)
    {
      _this.mesh.position = convertedData.position;
      // _this.mesh.rotation = convertedData.rotation;
      _this.mesh.rotation.x = MathUtility.DegreesToRadians(
        convertedData.rotation.x
      );
      _this.mesh.rotation.y = MathUtility.DegreesToRadians(
        convertedData.rotation.y
      );
      _this.mesh.rotation.z = MathUtility.DegreesToRadians(
        convertedData.rotation.z
      );

      _this.mesh.scaling = convertedData.scaling;
    }

    if(_this.gsMesh !== null&& _this.gsMesh !== undefined)
    {
      _this.gsMesh.position = convertedData.position;
      _this.gsMesh.rotation = convertedData.rotation;
      _this.gsMesh.scaling = convertedData.scaling;
    }
  }
}

export class UserState extends ServerObject {
  instanceId: Nullable<any>;
  username: Nullable<any>;
  displayColor: Color3;
  mesh: Nullable<Mesh>;
  material: Nullable<any>;
  deviceInput: Nullable<deviceInputType>

  constructor() {
    super();
    this.instanceId = null;
    this.username = null;
    this.mesh = null;
    this.material = null;
    this.displayColor = Color3.Random();
    this.deviceInput = deviceInputType.pc;
  }

  UpdateDeviceInput(convertedData: {
    inputType: deviceInputType })
  {
    this.deviceInput = convertedData.inputType;
  }

  UpdateUserState(convertedData: {
    instanceId: number,
    username: string,
    displayColor: Color3,
    position: Vector3,
    rotation: Vector3 }) 
  {
    this.transform.UpdateTransform(convertedData.position, convertedData.rotation);
    this.ApplyTransform()
  }

  ApplyTransform() {
    const mesh = this.mesh;
    if (mesh === null) {
      return;
    }
    var rotation = new Vector3();
    rotation = MathUtility.vec3DegreeToRadian(this.transform.rotation);
    mesh.position = this.transform.position
    mesh.rotation = rotation
    mesh.scaling = this.transform.scaling
  }

  /**
   * @description Imports and loads a 3D model of the user avatar.
   * @param scene 
   */
  LoadMesh(scene: Scene){
    const _this = this

    //if get user.deviceInput == VR
      //Load VR avatar
    // else load pc (default) avatar

    SceneLoader.ImportMeshAsync("", "editing/models/", "pc_avatar_v3.glb", scene).then(function(meshData){
      for(var meh of meshData.meshes)
      {
        if(meh.material)
        {
          const material = meh.material as PBRMaterial;
          material.albedoColor = Color3.Random();
          material.alpha
          material.roughness = 1;
          meh.material = material; 
        }
      }

      // 0 == root, 1 == the model. This is how BabylonJS imports things, alwaysd has a root named "__root__" as the highest level parent.
      _this.mesh = meshData.meshes[0] as Mesh
      const modelScale = new Vector3(0.2, 0.2, 0.2)
      _this.transform.scaling = _this.mesh.scaling = modelScale
    })
  }

  UnloadMesh(){
    if(this.mesh){
      this.mesh.dispose()
      this.mesh = null
    }
  }

  static FromConvertedData(convertedData: {
    instanceId: number,
    username: string,
    displayColor: Color3,
    position: Vector3,
    rotation: Vector3
  }) {
    const result = new UserState();
    result.instanceId = convertedData.instanceId;
    result.username = convertedData.username;
    result.displayColor = convertedData.displayColor;
    result.transform.position = convertedData.position;
    result.transform.rotation = convertedData.rotation;
    return result;
  }
}

/**
 * @classdesc
 * ModelState class encapsulates anything that is a 3D object, whether its child mesh(e.g. car door)
 * or a parent mesh(e.g. car chassis)
 * 
 * This class encapsulates the model(mesh) with other information such as parentID(hierarchy information),
 * childIDs(hiearchy information), which modelMaster it is a part of, the rest is descriptive
 * 
 * Essentially this class is an element(data) for the ModelMaster system architecture
 */
export class ModelState extends ServerObject {
  static LIVE_VERSION = _LIVE_VERSION;
  modelType: modelType;
  mesh: Nullable<Mesh>;
  gsMesh: GaussianSplattingMesh;
  instanceId: number; //unique ID to identify ModelState instances
  parentId: number; // ID to identify the instance's parent
  childIds: any[]; //an array of ID to identify the instance's children
  modelMaster: Nullable<ModelMaster>;
  markDelete: boolean;
  isVisible: boolean;
  editable: boolean

  gsEnabled: boolean;
  
  annotation: AnnotationComponent = null;

  constructor() {
    super();
    this.mesh = null;
    this.gsMesh = null;
    this.instanceId = -1;
    this.parentId = -1;
    /**
     * @desc 
     * E.g. Car Model. Chassis = parent. wheels, doors, windows = child
     * Changes to the position of the parent will affect the children (meshes) too

     */
    this.childIds = []; //link to child ids. If parent was modified, expect children to be modified too.

    this.modelMaster = null;
    this.markDelete = false;
    this.isVisible = true;
    this.editable = false;

    this.gsEnabled = false;
    this.modelType = modelType.meshType;
  }

  ReinitializeModelState()
  {
    var gsVaild = (this.gsMesh !== null && this.gsMesh !== undefined);
    this.setGSInteractable(gsVaild);
    this.setMeshInteractable(!gsVaild);
    this.modelType = gsVaild ? modelType.dualType : modelType.meshType;
  }

  /**
   * @desc 
   * Set the editable variable of the modelState. Does NOT set the ispickable variable in this.mesh itself.
   * 
   * 
   */
  SetEditable(editable: boolean)
  {
    this.editable = editable;
  }

  setMeshInteractable(isInteractable: boolean)
  {
      if(this.mesh === null || this.mesh === undefined)
        return;

      var noGS = (this.gsMesh === null || this.gsMesh === undefined) // force set to visible if no GS is present.
      this.mesh.isVisible = noGS ? true : isInteractable;
      this.mesh.isPickable = noGS ? true : isInteractable;
  }

  setGSInteractable(isInteractable: boolean)
  {
    if(this.gsMesh === null || this.gsMesh === undefined)
      return;

    this.gsMesh.isVisible = isInteractable;
    this.gsMesh.isPickable = isInteractable;
  }

  /**
   * @desc 
   * All objects assigned to this Modelstate instance will receive the transformation information(coordinates, rotation, etc...)
   * from the ModelState object containing this info.
   */
  ApplyTransformToAll()
  {
    if(this.mesh !== null && this.mesh !== undefined 
      && this.mesh.isVisible)
      this.ApplyTransformToMesh(); 
    if(this.gsMesh !== null && this.gsMesh !== undefined 
      && this.gsMesh.isVisible)
      this.ApplyTransformToGS();
  }

  ApplyTransformToMesh() {
    const mesh = this.mesh;
    const rotation = MathUtility.vec3DegreeToRadian(this.transform.rotation);
    
    if (mesh === null)
      {
      return;
    }
    else
    {
      mesh.position.x = this.transform.position.x;
      mesh.position.y = this.transform.position.y;
      mesh.position.z = this.transform.position.z;
  
      mesh.rotation.x = rotation.x;
      mesh.rotation.y = rotation.y;
      mesh.rotation.z = rotation.z;
  
      mesh.scaling.x = this.transform.scaling.x;
      mesh.scaling.y = this.transform.scaling.y;
      mesh.scaling.z = this.transform.scaling.z;
    }
  }

  /**
   * @desc 
   * The gaussian splat object assigned to this Modelstate instance will receive the transformation information(coordinates, rotation, etc...)
   * from the ModelState object containing this info.
   */
  ApplyTransformToGS() {
    const gsMesh = this.gsMesh;
    const rotation = MathUtility.vec3DegreeToRadian(this.transform.rotation);
    if (gsMesh === null || gsMesh === undefined)
    {
      return;
    }
    else
    {
      gsMesh.position.x = this.transform.position.x;
      gsMesh.position.y = this.transform.position.y;
      gsMesh.position.z = this.transform.position.z;

      gsMesh.rotation.x = rotation.x;
      gsMesh.rotation.y = rotation.y;
      gsMesh.rotation.z = rotation.z;
  
      gsMesh.scaling.x = this.transform.scaling.x;
      gsMesh.scaling.y = this.transform.scaling.y;
      gsMesh.scaling.z = this.transform.scaling.z;
    }
  }

  /**
   * @desc 
   * Retrieves information from the Mesh Object assigned to this ModelState instance, and cache it into ModelState.
   * Its the reverse of ApplyTransform()
   */
  RetrieveTransform() {
    const mesh = this.mesh;
    if (mesh === null) {
      return;
    }

    this.transform.position.x = mesh.position.x;
    this.transform.position.y = mesh.position.y;
    this.transform.position.z = mesh.position.z;

    this.transform.rotation.x = MathUtility.RadiansToDegrees(
      (this.mesh as Mesh).rotation.x
    );
    this.transform.rotation.y = MathUtility.RadiansToDegrees(
      (this.mesh as Mesh).rotation.y
    );
    this.transform.rotation.z = MathUtility.RadiansToDegrees(
      (this.mesh as Mesh).rotation.z
    );

    this.transform.scaling.x = mesh.scaling.x;
    this.transform.scaling.y = mesh.scaling.y;
    this.transform.scaling.z = mesh.scaling.z;
  }
    /**
     * @desc 
     * E.g. Car Model. Chassis = parent. wheels, doors, windows = child
     * Removing the child of the mesh e.g. wheels, doors
     */
  _RemoveChild(childId: number) {
    const index = this.childIds.findIndex((id) => id === childId);
    if (index !== -1) {
      this.childIds.splice(index, 1);
    }
  }

  RemoveParentByServer() {
    if (this.parentId === -1) {
      return;
    }
    const parentState = ServerObjectManager.instance.GetModelState(
      this.parentId
    );
    parentState?._RemoveChild(this.instanceId);

    if (this.mesh === null) {
      return;
    }
    this.parentId = -1;
    this.mesh.setParent(null);
    this.ApplyTransformToAll();
  }

  SetParentByServer(parentState: ModelState) {
    if (this.parentId === parentState.instanceId) { //koko
      return;
    }
    if (this.parentId !== -1) {
      this.RemoveParentByServer();
    }

    this.parentId = parentState.instanceId;
    parentState.childIds.push(this.instanceId);

    if (this.mesh === null || parentState.mesh === null) {
      return;
    }
    //If both have mesh loaded and availabe, set transforms.
    this.mesh.setParent(parentState.mesh);
    this.ApplyTransformToAll();
  }

  RemoveParentByClient() {
    if (this.parentId === -1) {
      return;
    }

    const parentState = ServerObjectManager.instance.GetModelState(
      this.parentId
    );
    parentState?._RemoveChild(this.instanceId);

    if (this.mesh === null) {
      return;
    }
    this.parentId = -1;
    this.mesh.setParent(null);
    this.RetrieveTransform();
  }

  SetParentByClient(parentState: ModelState) {
    if (this.parentId === parentState.instanceId) {
      return;
    }
    if (this.parentId !== -1) {
      this.RemoveParentByClient();
    }

    this.parentId = parentState.instanceId;
    parentState.childIds.push(this.instanceId);

    if (this.mesh === null || parentState.mesh === null) {
      return;
    }
    //If both have mesh loaded and availabe, set transforms.
    this.mesh.setParent(parentState.mesh);
    this.RetrieveTransform();
  }

  SetVisibility(isVisible?: boolean) {
    if (this.mesh) {
      if (!isVisible) {
        isVisible = !this.isVisible;
      }
      this.isVisible = isVisible as boolean;
      this.mesh.isVisible = isVisible as boolean;

      // if(this.gsMesh)
      // {
      //   this.gsMesh.isVisible = isVisible as boolean;
      // }
      return true;
    }
    return false;
  }

  _Delete() {
    if (this.mesh) {
      this.mesh.dispose();
    }
    if (this.gsMesh) {
      this.gsMesh.dispose();
    }
  }

  MarkDelete() {
    this.markDelete = true;
  }

  IsMeshModified() {
    let result = false;
    //Compare position
    const rotationRad = MathUtility.vec3DegreeToRadian(this.transform.rotation);

    const posVec = new Vector3(
      this.transform.position.x,
      this.transform.position.y,
      this.transform.position.z
    );
    const rotVec = new Vector3(rotationRad.x, rotationRad.y, rotationRad.z);
    const scaleVec = new Vector3(this.transform.scaling.x, this.transform.scaling.y, this.transform.scaling.z);

    if (!(this.mesh as Mesh).position.equals(posVec)) {
      result = true;
    }
    if (!(this.mesh as Mesh).rotation.equals(rotVec)) {
      result = true;
    }
    if (!(this.mesh as Mesh).scaling.equals(scaleVec)) {
      result = true;
    }
    return result;
  }

  GetServerFormat() {
    return {
      mesh_instance_id: this.instanceId,
      parent_id: this.parentId,
      position: Array3ToAxes.ToArray(this.transform.position),
      rotation: Array3ToAxes.ToArray(this.transform.rotation),
      scale: Array3ToAxes.ToArray(this.transform.scaling),
      mark_delete: this.markDelete,
    };
  }

  static FromEmpty(instanceId: number) {
    const result = new ModelState();
    result.instanceId = instanceId;
    return result;
  }
    /**
     * @desc 
     * Converts ServerObject (any) into ModelState Object
     * @param 
     * ServerObject instance 
     * @returns 
     * ModelState Object
     */
  static FromConvertedData(convertedData: any) {
    const result = new ModelState();
    result.instanceId = convertedData.instanceId;
    //result.parentId = convertedData.parentId;

    result.transform.UpdateTransform(
      convertedData.position,
      convertedData.rotation,
      convertedData.scale
    );
    return result;
  }
  /**
   * @desc
   * Performs a deep copy of this very instance with a new InstanceID
   * @param instanceId 
   * The instanceID that will be used to identify the duplicated model instance
   * 
   * @returns
   * A new ModelState Object tagged with a different instanceID but same modelID
   */
  DuplicateThisInstance(instanceId: number){
    const duplicate = new ModelState();
    duplicate.instanceId =  instanceId; //A different instanceID to identify this duplicated instance
    duplicate.parentId = this.parentId; // ID to identify the instance's parent
    duplicate.childIds =  this.childIds; //an array of ID to identify the instance's children
    duplicate.modelMaster = this.modelMaster;
    duplicate.markDelete =  this.markDelete;
    duplicate.isVisible = this.isVisible;
    duplicate.editable = this.editable;
    return duplicate;
  }
}

export class LightState extends ServerObject {
  instanceId: number;
  parentId: number;
  constructor() {
    super();
    this.instanceId = -1;
    this.parentId = -1;
  }

  GetServerFormat() {
    return {};
  }
}

export class ObjectDataHelper {
  static ConvertModelData(data: any) {
    const result = {
      instanceId: data.mesh_instance_id,
      parentId: data.parent_id,
      modelId: { id: data.asset_id[0], 
        version: data.asset_id[1] }, //version is deprecated. This version DOES NOT refer to iteration.
      position: Array3ToAxes.ToAxes(data.position),
      rotation: Array3ToAxes.ToAxes(data.rotation),
      scale: Array3ToAxes.ToAxes(data.scale),
      markDelete: data.mark_delete,
      editable: data.editable,
    };
    return result;
  }

  static ConvertUserData(data: {
    id: number,
    username: string,
    color: Array<number>,
    position: Array<number>,
    rotation: Array<number>,
    deleted: boolean
  }) {
    const result = {
      instanceId: data.id,
      username: data.username,
      displayColor: Color3.FromArray(data.color),
      position: Array3ToAxes.ToAxes(data.position),
      rotation: Array3ToAxes.ToAxes(data.rotation),
      markDelete: data.deleted
    };
    return result;
  }

  static GetLightData(data: any) {
    const result = {};
    data;
    return result;
  }
}

export class MarkerState{
  static MarkerActions = {
      update: 0,
      create: 1,
      delete: 2
  }

  mesh: Nullable<Mesh>

  marker_instance_id: number
  position: Vector3
  normal: Vector3
  type: number
  visibility: boolean
  isDirty: boolean
  markDelete: boolean;
  
  annotation: AnnotationComponent = null;

  constructor(marker_instance_id: number, position: Vector3, normal: Vector3, type: number, visibility: boolean) {
    this.markDelete = false;

    this.mesh = null;
    this.marker_instance_id = marker_instance_id
    this.position = position
    this.normal = normal
    this.type = type
    this.visibility = visibility
    this.isDirty = false

    // this.annotation = new AnnotationComponent(-1);
  }

  ToServerFormat(){
      return {
          mesh: this.mesh,
          marker_instance_id: this.marker_instance_id,
          position: Array3ToAxes.ToArray(this.position),
          normal: Array3ToAxes.ToArray(this.normal),
          type: this.type,
          visibility: this.visibility
      }
  }

  static FromServerState(markerInfo: {
    mesh: Nullable<Mesh>
    marker_instance_id: number,
    position: Array<number>,
    normal: Array<number>,
    type: number,
    visibility: boolean,
    mark_delete: boolean
  }){
    return new MarkerState(
      markerInfo.marker_instance_id, 
      Array3ToAxes.ToBabylonVec3(markerInfo.position),
      Array3ToAxes.ToBabylonVec3(markerInfo.normal),
      markerInfo.type,
      markerInfo.visibility)
  }

  _Delete() {
    if (this.mesh) {
      this.mesh.dispose();
    }
  }

  MarkDelete() {
    this.markDelete = true;
  }
}

export class NewMarkerEvent implements EventData{
  static readonly UniqueSymbol: unique symbol = Symbol("NewMarkerEvent")
  
  markerInfo: MarkerState
  constructor(markerInfo: MarkerState){
      this.markerInfo = markerInfo
  }

  Key(): symbol{
    return NewMarkerEvent.UniqueSymbol
  }
}

export class DeleteMarkerEvent implements EventData{
  static readonly UniqueSymbol: unique symbol = Symbol("DeleteMarkerEvent")

  idToDelete: number
  constructor(id: number){
      this.idToDelete = id
  }

  Key(): symbol{
    return DeleteMarkerEvent.UniqueSymbol
  }
}

export class NewCollaboratorEvent implements DC_GlobalEventData{
  static readonly UniqueSymbol: unique symbol = Symbol("NewCollaboratorEvent") //Symbol("NewViewerEvent")
  
  userState: UserState

  constructor(userState: UserState){
      this.userState = userState
  }

  Key(): symbol{
    return NewCollaboratorEvent.UniqueSymbol
  }
}

export class DeleteCollaboratorEvent implements DC_GlobalEventData{
  static readonly UniqueSymbol: unique symbol = Symbol("DeleteCollaboratorEvent") //Symbol("DeleteViewerEvent")

  userState: UserState

  constructor(userState: UserState){
    this.userState = userState
  }

  Key(): symbol{
    return DeleteCollaboratorEvent.UniqueSymbol
  }
}