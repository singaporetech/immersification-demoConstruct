import {
  ObjectDataHelper,
  ModelState,
  ModelMaster,
  UserState,
  LightState,
  Marker,
  NewMarkerEvent,
  DeleteMarkerEvent,
  NewViewerEvent,
  DeleteViewerEvent
} from "./ServerObjects";
import { ObjectHierarchy } from "./ObjectHierarchy";
import { Mesh, Scene, Vector3 } from "@babylonjs/core";
import { Array3ToAxes } from "../utils/ArrayTools";
import { DC_GlobalEvents } from "../event-listener/GlobalEventListener";
import { Nullable } from "babylonjs";
import { EditingRoomMarkerUI_V2 } from "./gui/EditingRoomMarkerUI_V2";
/**
 * @class ServerObjectManager
 * Singleton - will only be instantiated once in its lifetime to manage all
 * server objects 
 * 
 */
export class ServerObjectManager {
  static instance: ServerObjectManager;

  scene: Scene
  
  selfUserId: number
  users: Map<number, UserState>;
  /**
   * modelMasters
   * Each unique model (by i mean, excluding clones/duplicates) is assigned a modelMasters
   * 
   * The map of modelMasters and model IDs to recognise a modelMaster is below
   * 
   */
  modelMasters: Map<string, ModelMaster>;
  /**
   * models
   * The modelstates and their associated IDs are stored in a map below 
   * 
   * Each modelstate object encapsulates the Mesh Object i.e. model
   * 
   */
  models: Map<number, ModelState>;
  lights: Map<number, LightState>;
  markers: Map<number, Marker>;
  
  pickedModel: any;
  modifiedModels: Map<any, any>;
  modifiedLights: Map<any, any>;
  modifiedMarkers: Array<any>;
  objectHierarchy: ObjectHierarchy;
  /**
   * @desc 
   * Contains the last time the list of models meta data fetched from the local server
   * Purpose is to feedback to UpdateModels(), but along with a client side ONLY model i.e. append client model instance to thist list to load
   *
   * 
   * For client-side model loading, especially for ghost meshes
   */
  lastModelListUpdate: any;

  baseEnvironmentMesh: any;

  constructor(scene: Scene) {
    this.scene = scene
    this.selfUserId = -1

    this.users = new Map(); //Stores User Server Objects as map with (instanceId, userState) as key-value pairs
    this.modelMasters = new Map(); //Stores Model master data as map with (model_id, modelMaster) key-value pairs
    this.models = new Map(); //Stores instances of models as map with (instanceId, modelState) key-value pairs
    this.lights = new Map(); //Stores instances of lights as map with (instanceId, lightState) key-value pairs
    this.markers = new Map();

    this.pickedModel = null;
    this.modifiedModels = new Map();
    this.modifiedLights = new Map();
    this.modifiedMarkers = new Array<any>();
    this.objectHierarchy = new ObjectHierarchy();
    ServerObjectManager.instance = this;

    this.lastModelListUpdate = null;

    this.baseEnvironmentMesh = null;
  }

  setEnvironmentMesh(mesh: Mesh)
  {
    this.baseEnvironmentMesh = mesh;
  }

/**
 * @desc
 * Was called whenever ParseData() in WebSocketManager.ts receives a response CodeToClient.NEW_RECONSTRUCTION
 * from the local server
 * 
 * 
 * @param jsonData  
 */
  _FindAndProcessLiveModelMasters(jsonData: any) {
    const modelIdName = jsonData.new_id;
    const idString = modelIdName.concat("_", ModelMaster.LIVE_VERSION);
    if (!this.modelMasters.has(idString)) {
      return;
    }
    const modelMaster = this.modelMasters.get(idString);
    modelMaster?.ReloadModel();
  }

  SetPickedModel(instanceId: number) {
    const pickedModel = this.GetModelState(instanceId);
    if (pickedModel === null) {
      return;
    }
    this.pickedModel = pickedModel;
  }

  ClearPickedModel() {
    if (this.pickedModel && this.pickedModel.IsMeshModified()) {
      this.AddModifiedModel(this.pickedModel);
    }
    this.pickedModel = null;
  }
/**
 * @desc
 * Retrieves a ModelState instance i.e. the Model from the client side i.e. @class ServerObjectManager
 * 
 * 
 * 
 * @param instanceID 
 * @returns ModelState instance
 */
  GetModelState(instanceID: number) : ModelState | null{
    const val = this.models.get(instanceID)
    if(val)
      return val
    return null;
  }
/**
 * @desc
 * Retrieves a ModelMasters instance from the client side i.e. @class ServerObjectManager
 * 
 * If modelmaster is not found, it creates a new instance of modelmaster and add to client side
 * 
 * 
 * @returns ModelState instance
 */
  GetModelMaster(modelId: any) {
    const idString = modelId.id.concat("_", modelId.version);
    if (this.modelMasters.has(idString)) {
      return this.modelMasters.get(idString);
    } else {
      const newMaster = new ModelMaster(modelId);
      newMaster.Initialize();
      this.modelMasters.set(idString, newMaster);
      return newMaster;
    }
  }
  /**
   * @desc
   * If modelmaster is not found on the client side, it returns false
   * 
   * @param modelId An object containing {id: string, version: string}
   * @returns boolean status if TRUE = ModelMaster exist for the model instance else FALSE
   */
  FindModelMaster(modelId: any) {
    const idString = modelId.id.concat("_", modelId.version);
    if (this.modelMasters.has(idString)) {
      return true;
    } else {
      return false;
    }
  }

  GetUserState(userId: number){
    return this.users.get(userId);
  }

  GetMarkerInfo(markerId: number){
    return this.markers.get(markerId);
  }

  ClearAllRoomData() {
    this.objectHierarchy.ClearData();
    this.ClearPickedModel();

    const modelIt = this.models.values();
    for (const modelState of modelIt) {
      modelState._Delete();
    }
    const masterIt = this.modelMasters.values();
    for (const master of masterIt) {
      master.mesh?.dispose();
    }

    //TODO: Move clearing of marker function to here
    // const markerIt = this.markers.values();
    // for (const markerState of markerIt) {
    //   markerState._Delete();
    // }
    EditingRoomMarkerUI_V2.instance?.ClearMarkers()

    this.users.clear();
    this.modelMasters.clear();
    this.models.clear();
    this.markers.clear();
    this.lights.clear();

    this.modifiedModels.clear();
    this.modifiedMarkers = [];
    this.modifiedLights.clear();
  }
  /**
   * @desc:
   * Called from @class EditingSessionManager @function FetchRoomModels() whenever
   * the same room is accessed/fetched again. Reloads all the instances in the room
   * 
   * Receives an array named mesh_updates, user_updates, marker_updates from the JSON file received by @function FetchRoomModels()
   * The JSON file is stored in the MONGODBdatabase under Rooms Collection
   * 
   * @param modelDataArray 
   */
  ReloadObjects(
    userDataArray: UserState[],
    modelDataArray: ModelState[],
    lightDataArray: LightState[],
    markderDataArray: Array<any>
  ) {
    this.users.clear();
    this.modelMasters.clear();
    this.models.clear();
    this.markers.clear();
    this.lights.clear();

    this.UpdateUsers(userDataArray);
    this.UpdateModels(modelDataArray);
    this.UpdateLights(lightDataArray);
    this.UpdateMarkers(markderDataArray);
  }
  /**
   * @desc:
   * Called from @class EditingSessionManager @function HandleRoomUpdate() whenever
   * there is a change with the model transformation or when the model is cloned or created 
   * 
   * Receives an array named mesh_updates from the JSON file received by @function HandleRoomUpdate()
   * The JSON file is stored in the MONGODBdatabase under Rooms Collection
   * 
   * This function handles three cases in the first pass ..
   * 1. If the modelID found in the database does not have any modelMaster instance i.e. no models in the scene for that modelID,
   * create OR ASSIGN (for clones) a modelMaster instance and modelState instance for the model
   * 
   * 2. If the modelID in the database is marked for deletion, then delete accordingly in the client side i.e. delete its ModelState
   * 
   * 3. Else
   *  - If model is a picked model by the user, then dont do anything
   *  - ELSE, update the transformation information of the model
   * 
   * 
   * @param modelDataArray 
   */
   UpdateModels(modelDataArray: ModelState[]) {
    const _this = this;
    const newModelStates = new Map();
    //First pass to assign independent variables
    modelDataArray.forEach((data) => {
      const convertedData = ObjectDataHelper.ConvertModelData(data);
      let modelState = _this.GetModelState(convertedData.instanceId);

      //In the case if model in the client does not exist, assigns the model to a modelmaster
      if (modelState === null || modelState === undefined) {
        //Create from json data and then clone mesh from model master.

        //creates a new instance of the ModelState object since instance of modelstate is not found
        modelState = ModelState.FromConvertedData(convertedData); 
        
        //Adds the modelstate to its supposed modelmaster. If modelmaster does not exist, returns a new instance of modelmaster
        const modelMaster = this.GetModelMaster(convertedData.modelId); // initializes a master copy of the model using initialize() from @ServerObject
        modelState.modelMaster = modelMaster!;
      
        modelState.SetEditable(convertedData.editable);

        modelMaster?.RegisterModelState(modelState); // Clone and register a new selectable and editable model
        //modelMaster.CloneMesh(modelState);
        
        //Adds the model to the client side
        _this.models.set(modelState.instanceId, modelState);
        newModelStates.set(modelState.instanceId, modelState);

      } else if (convertedData.markDelete) { // for models that are marked for deletion indicated in the database
        modelState?._Delete();
        ObjectHierarchy.ActiveInstance?.DeleteStateInfo(modelState as ModelState);
        _this.models.delete(modelState.instanceId);

        if(_this.pickedModel){
          _this.pickedModel = null;
        }
      } else {
        //Don't accept any updates if this model is being picked.
        if (modelState === _this.pickedModel) {
          return;
        }
        //Updates the modelstate object before mesh
        modelState?.UpdateTransform(
          convertedData.position,
          convertedData.rotation,
          convertedData.scale
        );
        //Transfer changed transformation information from the modelstate object to mesh
        modelState?.ApplyTransform();
      }
    });

    ObjectHierarchy.ActiveInstance?.RemoveDeletedInfos()

    //Second pass to ensure all states are created and handle parenting.
    modelDataArray.forEach((data) => {
      const convertedData = ObjectDataHelper.ConvertModelData(data);
      const modelState = _this.GetModelState(convertedData.instanceId);

      if (modelState === null) {
        return;
      }
      if (modelState?.parentId === convertedData.parentId) {
        return;
      }

      //Begin Steps to assign new parent.
      //Set Object hierarchy to update order first.
      if (!newModelStates.has(modelState?.instanceId)) {
        ObjectHierarchy.ActiveInstance?.ServerUpdateStateInfo(
          modelState as ModelState,
          convertedData.parentId
        );
      }

      //Remove Parent first.
      if (modelState?.parentId !== -1) {
        modelState?.RemoveParentByServer();
      }

      //Set new Parent
      if (convertedData.parentId !== -1) {
        const newParent = _this.GetModelState(convertedData.parentId);
        modelState?.SetParentByServer(newParent as ModelState);
      }
    });

    //Initialise every newly created modelstate to object hierarchy.
    const newModelArray = [];
    const modifiedModelIt = newModelStates.values();
    for (const modelState of modifiedModelIt) {
      newModelArray.push(modelState);
    }
    ObjectHierarchy.ActiveInstance?.BindNewModelStates(newModelArray);
  }


  UpdateUsers(userDataArray: any[]) {
    const _this = this;
    const GetUserState = function (instanceId: number) {
      if (_this.users.has(instanceId)) {
        return _this.users.get(instanceId);
      } else {
        return null;
      }
    };

    const deleteList: Array<number> = new Array()

    userDataArray.forEach((data: {
      id: number,
      username: string,
      color: Array<number>,
      position: Array<number>,
      rotation: Array<number>,
      deleted: boolean
    }) => {
      const convertedData = ObjectDataHelper.ConvertUserData(data);
      
      //Skip if data refers to self.
      if(convertedData.instanceId === _this.selfUserId){
        return;
      }
      
      let userState = GetUserState(convertedData.instanceId);
      //If userState not found, create new user
      if (userState === null || userState === undefined) {
        userState = UserState.FromConvertedData(convertedData);
        userState.UpdateUserState(convertedData)
        userState.LoadMesh(_this.scene)

        DC_GlobalEvents.Invoke(new NewViewerEvent(userState));

        _this.users.set(userState.instanceId, userState);
      } else if(convertedData.markDelete){
        console.log("Found Deleted User: ", convertedData.instanceId);
        deleteList.push(userState.instanceId)
        userState.UnloadMesh()
        DC_GlobalEvents.Invoke(new DeleteViewerEvent(userState))
      } else {//Update state normally.
        userState?.UpdateUserState(convertedData);
      }
    });

    deleteList.forEach((id)=>{
      _this.users.delete(id);
    })
  }

  UpdateLights(lightDataArray: LightState[]) {
    /**
     * For each light state in array,
     *      Find client light instance by ID
     *          Apply new state to light state
     */
    lightDataArray;
  }

  UpdateMarkers(markerDataArray: Array<{
    mesh: Nullable<Mesh>
    id: number,
    position: Array<number>,
    normal: Array<number>,
    type: number,
    visibility: boolean,
    mark_delete: boolean
  }>){
    const _this = this
    const deleteList: Array<number> = new Array()
    markerDataArray.forEach((markerUpdate)=>{
      //If Marker does not exist, create
      if(!_this.markers.has(markerUpdate.id)){
        const newMarker = Marker.FromServerState(markerUpdate);
        _this.markers.set(newMarker.id, newMarker)

        DC_GlobalEvents.Invoke(new NewMarkerEvent(newMarker))
      }

      //If Marked delete, delete and end function
      if(markerUpdate.mark_delete){
        deleteList.push(markerUpdate.id)
        DC_GlobalEvents.Invoke(new DeleteMarkerEvent(markerUpdate.id))
        return
      }

      //Else, find and update existing marker
      const currMarker = _this.markers.get(markerUpdate.id) as Marker
      currMarker.position = Array3ToAxes.ToBabylonVec3(markerUpdate.position)
      currMarker.normal = Array3ToAxes.ToBabylonVec3(markerUpdate.normal)

      if(currMarker.type != markerUpdate.type || currMarker.visibility != markerUpdate.visibility){
        currMarker.isDirty = true
        currMarker.type = markerUpdate.type
        currMarker.visibility = markerUpdate.visibility
      }
    })

    deleteList.forEach((id: number)=>{
      _this.markers.delete(id)
    })
  }

  AddModifiedModel(modelState: ModelState) {
    if (!this.models.has(modelState.instanceId)) {
      throw new Error(
        "Model State: " +
          modelState.instanceId +
          " does not exist in models map!"
      );
    }
    if (!this.modifiedModels.has(modelState.instanceId)) {
      this.modifiedModels.set(modelState.instanceId, modelState);
    }
  }

  RetrieveModifiedStates() {
    //Check if picked object has moved.
    if (this.pickedModel !== null && this.pickedModel.IsMeshModified()) {
      this.pickedModel.RetrieveTransform();
      this.AddModifiedModel(this.pickedModel);
    }

    const modelArray = [];
    const modifiedModelIt = this.modifiedModels.values();
    for (const modelState of modifiedModelIt) {
      modelArray.push(modelState.GetServerFormat());
    }

    const result = {
      model_states: modelArray,
      marker_states: this.modifiedMarkers
    };

    this.modifiedModels.clear();
    this.modifiedLights.clear();
    this.modifiedMarkers = [];

    return result;
  }

  _RequestNewMarker(position: Vector3, normal: Vector3, type: number){
    //Add New Marker to marker update list
    const newMarker = new Marker(-1, position, normal, type, true)
    this.modifiedMarkers.push({
      marker_info: newMarker.ToServerFormat(),
      action: Marker.MarkerActions.create
    })
  }

  _RequestDeleteMarker(markerId: number){
    //Add delete key to marker update list.
    if(!this.markers.has(markerId))
    {
      console.warn("Requested to delete non-existent marker")
      return
    }
    
    this.modifiedMarkers.push({
      marker_info: this.markers.get(markerId)?.ToServerFormat(),
      action: Marker.MarkerActions.delete
    })
    console.log("Deleting marker");
  }
}
