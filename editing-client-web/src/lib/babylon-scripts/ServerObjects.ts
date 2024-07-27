/**
 * @fileoverview
 * Defines the list of classes that represents each type of server object managed serialized on the server such as users, mesh_instances, lights.
 * 
 * 
 * Documentation @author
 */
import { SocketHandler } from "./WebSocketManager";
import { Array3ToAxes } from "../utils/ArrayTools";
import { Mesh, Nullable, Scene, Vector3, SceneLoader, Color3, StandardMaterial, PBRMaterial} from "@babylonjs/core";
import { MathUtilities } from "../utils/Math";
import { ModelLoader, ServerModelMetadata } from "./ModelLoader";
import { ServerObjectManager } from "./ServerObjectManager";
import { DC_EventData } from "../event-listener/EventListener";
import { DC_GlobalEventData } from "../event-listener/GlobalEventListener";

const _LIVE_VERSION = "__LIVE_VERSION";

class ServerObject {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  constructor() {
    this.position = new Vector3(0, 0, 0);
    this.rotation = new Vector3(0, 0, 0);
    this.scale = new Vector3(1, 1, 1);
  }

  UpdateTransform(position?: Vector3, rotation?: Vector3, scale?: Vector3) {
    if (position) {
      this.position = position;
    }
    if (rotation) {
      this.rotation = rotation;
    }
    if (scale) {
      this.scale = scale;
    }
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
  
  mesh: Nullable<Mesh>; //Mesh object (The model object) associated with this ModelMaster instance
  /**
   * @desc 
   * below is the model meta data.. e.g. name..
   * @param modelId is used as a part of a message request to load the model from the server
   */
  modelId: any;
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
    this.dateCreated = jsonData.dateCreated
      ? jsonData.dateCreated
      : this.dateCreated;
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
    const RecloneMesh = function (modelState: ModelState) {
      if (modelState.mesh === null) {
        console.warn(
          "Model State Mesh was still waiting clone while reclone was called."
        );
        return;
      }

      const oldMesh = modelState.mesh;
      const metadata = modelState.mesh.metadata;
      const parentMesh = modelState.mesh.parent;

      modelState.mesh = (_this.mesh as Mesh).clone();

      modelState.mesh.name = oldMesh.name;
      modelState.mesh.isVisible = oldMesh.isVisible;
      modelState.mesh.metadata = metadata;
      modelState.mesh.setParent(parentMesh);

      oldMesh.dispose()

      modelState.ApplyTransform();
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
      _this.cloneCount += 1;
      //Obtain mesh by cloning to share geometry data. See BabylonJs api for Mesh.clone().
      //Saves memory and easily allow mesh change.
      modelState.mesh = mesh.clone();
      modelState.mesh.name = mesh.name + " " + _this.cloneCount;
      modelState.mesh.isVisible = true;
      modelState.mesh.metadata = new ServerModelMetadata(modelState.instanceId, modelState.editable);

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
      modelState.ApplyTransform();

      //Now that this state has a mesh assigned, allow children's meshes to parent to this mesh.
      modelState.childIds.forEach((childId: any) => {
        const childState = ServerObjectManager.instance.GetModelState(childId);
        if (childState?.mesh !== null) {
          childState?.mesh.setParent(modelState.mesh);
          childState?.ApplyTransform();
        }
      });

      if(modelState.editable)
        ServerObjectManager.instance?.setEnvironmentMesh(modelState.mesh);

    };

    //If master already has mesh, assign immediately.
    if (this.mesh !== null) {
      AssignMesh(this.mesh);
      return;
    }

    //Else, add to callback list for once master copy of mesh has been loaded by BabylonJS.
    this._pendingMeshCallbacks.push(AssignMesh);
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
    this.modelStates.set(modelState.instanceId, modelState);
    if (modelState.mesh === null) {
      this.CloneMesh(modelState);
    }
  }
  RemoveModelState(instanceId: any) {
    if (this.modelStates.has(instanceId)) {
      this.modelStates.delete(instanceId);
    }
  }

  ReloadModel() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const callback = function () {
      _this._RecloneMeshes();
    };
    ModelLoader.LoadModel(this, callback);
  }

  Initialize() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const callback = function () {
      _this._InvokeCallbacks();
    };
    ModelLoader.LoadModel(this, callback);
  }
}

export class UserState extends ServerObject {
  instanceId: Nullable<any>;
  username: Nullable<any>;
  displayColor: Color3;
  mesh: Nullable<Mesh>;
  material: Nullable<any>;
  constructor() {
    super();
    this.instanceId = null;
    this.username = null;
    this.mesh = null;
    this.material = null;
    this.displayColor = Color3.Random();
  }

  UpdateUserState(convertedData: {
    instanceId: number,
    username: string,
    displayColor: Color3,
    position: Vector3,
    rotation: Vector3
  }) {
    this.UpdateTransform(convertedData.position, convertedData.rotation);
    this.ApplyTransform()
  }

  ApplyTransform() {
    const mesh = this.mesh;
    if (mesh === null) {
      return;
    }
    const rotation = MathUtilities.vec3DegreeToRadian(this.rotation);

    mesh.position.x = this.position.x;
    mesh.position.y = this.position.y;
    mesh.position.z = this.position.z;

    mesh.rotation.x = rotation.x;
    mesh.rotation.y = rotation.y;
    mesh.rotation.z = rotation.z;

    mesh.scaling.x = this.scale.x;
    mesh.scaling.y = this.scale.y;
    mesh.scaling.z = this.scale.z;
  }

  LoadMesh(scene: Scene){
    const _this = this
    SceneLoader.ImportMeshAsync("", "/loadAsset/model/", "pc_avatar_v3.glb", scene).then(function(meshData){
      _this.mesh = meshData.meshes[1] as Mesh
      const modelSCale = new Vector3(0.2, 0.2, 0.2)
      _this.mesh.scaling = modelSCale
      _this.scale = modelSCale

      const material = _this.mesh.material as PBRMaterial;
      material.albedoColor = Color3.Random();
      material.alpha
      material.roughness = 1;

      _this.mesh.material = material;      
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
    result.position = convertedData.position;
    result.rotation = convertedData.rotation;
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
  mesh: Nullable<Mesh>;
  instanceId: number; //unique ID to identify ModelState instances
  parentId: number; // ID to identify the instance's parent
  childIds: any[]; //an array of ID to identify the instance's children
  modelMaster: Nullable<ModelMaster>;
  markDelete: boolean;
  isVisible: boolean;
  editable: boolean

  constructor() {
    super();
    this.mesh = null;
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

    /**
     * @desc 
     * The Mesh object assigned to this Modelstate instance will receive the transformation information(coordinates, rotation, etc...)
     * from the ModelState object containing this info.
     * 
     * 
     */
  ApplyTransform() {
    const mesh = this.mesh;
    if (mesh === null) {
      return;
    }

    const rotation = MathUtilities.vec3DegreeToRadian(this.rotation);

    mesh.position.x = this.position.x;
    mesh.position.y = this.position.y;
    mesh.position.z = this.position.z;

    mesh.rotation.x = rotation.x;
    mesh.rotation.y = rotation.y;
    mesh.rotation.z = rotation.z;

    mesh.scaling.x = this.scale.x;
    mesh.scaling.y = this.scale.y;
    mesh.scaling.z = this.scale.z;
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

    this.position.x = mesh.position.x;
    this.position.y = mesh.position.y;
    this.position.z = mesh.position.z;

    this.rotation.x = MathUtilities.RadiansToDegrees(
      (this.mesh as Mesh).rotation.x
    );
    this.rotation.y = MathUtilities.RadiansToDegrees(
      (this.mesh as Mesh).rotation.y
    );
    this.rotation.z = MathUtilities.RadiansToDegrees(
      (this.mesh as Mesh).rotation.z
    );

    this.scale.x = mesh.scaling.x;
    this.scale.y = mesh.scaling.y;
    this.scale.z = mesh.scaling.z;
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
    this.ApplyTransform();
  }

  SetParentByServer(parentState: ModelState) {
    if (this.parentId === parentState.instanceId) {
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
    this.ApplyTransform();
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
      return true;
    }
    return false;
  }

  _Delete() {
    if (this.mesh) {
      this.mesh.dispose();
    }
  }

  MarkDelete() {
    this.markDelete = true;
  }

  IsMeshModified() {
    let result = false;
    //Compare position
    const rotationRad = MathUtilities.vec3DegreeToRadian(this.rotation);

    const posVec = new Vector3(
      this.position.x,
      this.position.y,
      this.position.z
    );
    const rotVec = new Vector3(rotationRad.x, rotationRad.y, rotationRad.z);
    const scaleVec = new Vector3(this.scale.x, this.scale.y, this.scale.z);

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
      instance_id: this.instanceId,
      parent_id: this.parentId,
      position: Array3ToAxes.ToArray(this.position),
      rotation: Array3ToAxes.ToArray(this.rotation),
      scale: Array3ToAxes.ToArray(this.scale),
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

    result.UpdateTransform(
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
      instanceId: data.instance_id,
      parentId: data.parent_id,
      modelId: { id: data.model_id[0], version: data.model_id[1] },
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

export class Marker{
  static MarkerActions = {
      update: 0,
      create: 1,
      delete: 2
  }

  mesh: Nullable<Mesh>

  id: number
  position: Vector3
  normal: Vector3
  type: number
  visibility: boolean
  isDirty: boolean
  markDelete: boolean;

  constructor(id: number, position: Vector3, normal: Vector3, type: number, visibility: boolean) {
    this.markDelete = false;

    this.mesh = null;
    this.id = id
    this.position = position
    this.normal = normal
    this.type = type
    this.visibility = visibility
    this.isDirty = false
  }

  ToServerFormat(){
      return {
          mesh: this.mesh,
          id: this.id,
          position: Array3ToAxes.ToArray(this.position),
          normal: Array3ToAxes.ToArray(this.normal),
          type: this.type,
          visibility: this.visibility
      }
  }

  static FromServerState(markerInfo: {
    mesh: Nullable<Mesh>
    id: number,
    position: Array<number>,
    normal: Array<number>,
    type: number,
    visibility: boolean,
    mark_delete: boolean
  }){
    return new Marker(
      markerInfo.id, 
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

export class NewMarkerEvent implements DC_EventData{
  static readonly UniqueSymbol: unique symbol = Symbol("NewMarkerEvent")
  
  markerInfo: Marker
  constructor(markerInfo: Marker){
      this.markerInfo = markerInfo
  }

  Key(): symbol{
    return NewMarkerEvent.UniqueSymbol
  }
}

export class DeleteMarkerEvent implements DC_EventData{
  static readonly UniqueSymbol: unique symbol = Symbol("DeleteMarkerEvent")

  idToDelete: number
  constructor(id: number){
      this.idToDelete = id
  }

  Key(): symbol{
    return DeleteMarkerEvent.UniqueSymbol
  }
}

export class NewViewerEvent implements DC_GlobalEventData{
  static readonly UniqueSymbol: unique symbol = Symbol("NewViewerEvent")
  
  userState: UserState
  constructor(userState: UserState){
      this.userState = userState
  }

  Key(): symbol{
    return NewViewerEvent.UniqueSymbol
  }
}

export class DeleteViewerEvent implements DC_GlobalEventData{
  static readonly UniqueSymbol: unique symbol = Symbol("DeleteViewerEvent")

  userState: UserState
  constructor(userState: UserState){
    this.userState = userState
  }

  Key(): symbol{
    return DeleteViewerEvent.UniqueSymbol
  }
}