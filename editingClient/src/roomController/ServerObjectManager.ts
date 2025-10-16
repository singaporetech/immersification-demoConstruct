import {
  ObjectDataHelper,
  ModelState,
  ModelMaster,
  UserState,
  LightState,
  MarkerState,
  NewMarkerEvent,
  DeleteMarkerEvent,
  NewCollaboratorEvent,
  DeleteCollaboratorEvent,
  ServerObject
} from "./objects/ServerObjects";
import { ObjectHierarchy_Manager } from "../objectHierarchyTool/ObjectHierarchy";
import { Mesh, Scene, Vector3, Nullable } from "@babylonjs/core";
import { MarkerMenuController } from "../gui/desktop/MarkerMenuController";
import { Array3ToAxes } from "../utilities/ArrayUtility";
import { DC_GlobalEvents } from "../utilities/delegates/GlobalEventListener";
import { AnnotationComponent } from "./objects/components/AnnotationComponent";
import { AnnotationDataManager } from "../annotationTool/AnnotationDataManager";
import { AnnotationMenuController } from "../gui/desktop/AnnotationMenuController";
import { AnnotationPlatesManager } from "../gui/AnnotationPlatesController";
import VRAnnotationViewerMenuController from "../gui/vr/VRAnnotationViewerMenuController";
import { MeasureMenuController } from "../gui/desktop/MeasureMenuController";
import { serverobjectType } from "../utilities/enums/enums";
import { VrManager } from "../modeController/vr/VrManager";
import { ObjectPickingManager } from "../objectPickingSelection/ObjectPickingManager";
/**
 * @class ServerObjectManager
 * Singleton - will only be instantiated once in its lifetime to manage all
 * server objects 
 * 
 */
export class ServerObjectManager {
  static instance: ServerObjectManager;

  scene: Scene
  
  /** 
   * The ID of the local user of this device.
   * */
  selfUserId: number

  /**
   * The list of users connected to the current room. Does NOT includes local user inside.
   */
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
  markers: Map<number, MarkerState>;
  // annotations: Map<number, MarkerState>;
  
  pickedModel: any;
  modifiedModels: Map<any, any>;
  modifiedLights: Map<any, any>;
  modifiedMarkers: Array<any>;
  objectHierarchy: ObjectHierarchy_Manager;
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
    this.modelMasters = new Map(); //Stores Model master data as map with (asset_id, modelMaster) key-value pairs
    this.models = new Map(); //Stores instances of models as map with (instanceId, modelState) key-value pairs
    this.lights = new Map(); //Stores instances of lights as map with (instanceId, lightState) key-value pairs
    this.markers = new Map();

    this.pickedModel = null;
    this.modifiedModels = new Map();
    this.modifiedLights = new Map();
    this.modifiedMarkers = new Array<any>();
    this.objectHierarchy = new ObjectHierarchy_Manager();
    ServerObjectManager.instance = this;

    this.lastModelListUpdate = null;

    this.baseEnvironmentMesh = null;

    this.scene.registerBeforeRender( () =>
    {
        this.Update();
    });
  }

  SetEnvironmentMesh(mesh: Mesh)
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
  FindAndProcessLiveModelMasters(jsonData: any) {
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

  //TODO: Why is this here?
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
  GetModelMaster(modelID: any) {
    const idString = modelID.id.concat("_", modelID.version);
    if (this.modelMasters.has(idString))
    {
      return this.modelMasters.get(idString);
    }
    else 
    {
      const newMaster = new ModelMaster(modelID);
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
  GetModelMasterExist(modelId: any) {
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

  ClearRoomData() {

    //Clear all UI first before clearing data
    AnnotationPlatesManager.instance.clearGUIObjects();
    AnnotationMenuController.instance.clearGUIObjects();
    VRAnnotationViewerMenuController.instance.clearGUIObjects();
    MeasureMenuController.instance.clearGUIObjects();
    MarkerMenuController.instance?.ClearGUIMarkers()
    
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

    this.users.clear();
    this.modelMasters.clear();
    this.models.clear();
    this.markers.clear();
    this.lights.clear();

    this.modifiedModels.clear();
    this.modifiedMarkers = [];
    this.modifiedLights.clear();
    AnnotationDataManager.instance.ClearAnnotationEntries();
    MeasureMenuController.instance.clearMeasurementData();
    
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
  LoadRoomData(
    userDataArray: UserState[],
    modelDataArray: ModelState[],
    lightDataArray: LightState[],
    markderDataArray: Array<any>,
    measurement_instances: any,
    annotation_instances: any,
  ) {
    //Clear everything first, reset in case
    AnnotationPlatesManager.instance?.clearGUIObjects();
    this.users.clear();
    this.modelMasters.clear();
    this.models.clear();
    this.markers.clear();
    this.lights.clear();
    
    //set everything
    this.UpdateUserStates(userDataArray);
    this.UpdateModelStates(modelDataArray);
    this.UpdateLights(lightDataArray);
    this.UpdateMarkerStates(markderDataArray);
    this.UpdateAnnotationComponents(annotation_instances);
    this.UpdateMeasurementComponents(measurement_instances);
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
  UpdateModelStates(modelDataArray: ModelState[]) {
    const _this = this;
    const newModelStates = new Map();
    //First pass to assign independent variables
    modelDataArray.forEach((data) => {
      const convertedData = ObjectDataHelper.ConvertModelData(data);
      let modelState = _this.GetModelState(convertedData.instanceId);

      // If a master model in the client does not exist, create a modelmaster
      // and assign the model to that mmodelmaster
      if (modelState === null || modelState === undefined)
      {
        // Create from json data and then clone mesh from model master.

        // creates a new instance of the ModelState object since instance of modelstate is not found
        modelState = ModelState.FromConvertedData(convertedData); 
        
        // Adds the modelstate to its supposed modelmaster. 
        // If modelmaster does not exist, 
        // creates and returns a new instance of modelmaster
        const modelMaster = this.GetModelMaster(convertedData.modelId); // initializes a master copy of the model using initialize() from @ServerObject
        modelState.modelMaster = modelMaster!;
      
        modelState.SetEditable(convertedData.editable);

        //clones the master model meshes for this object
        modelMaster?.RegisterModelState(modelState); // Clone and register a new selectable and editable model
        
        //Adds the model to the client side
        _this.models.set(modelState.instanceId, modelState);
        newModelStates.set(modelState.instanceId, modelState);

      } 
      // for models that are marked for deletion indicated in the database
      else if (convertedData.markDelete) {
        modelState?._Delete();
        ObjectHierarchy_Manager.ActiveInstance?.DeleteStateInfo(modelState as ModelState);
        _this.models.delete(modelState.instanceId);

        if(_this.pickedModel){
          _this.pickedModel = null;
        }
      } 
      // Other conditions
      else {
        //Don't accept any updates if this model is being picked by user
        if ((ObjectPickingManager.instance.pickedObject !== null ) && 
        (modelState?.gsMesh === ObjectPickingManager.instance.pickedObject || modelState?.mesh === ObjectPickingManager.instance.pickedObject)) {
          return;
        }
        //Update normally
        else
        {
          //Updates the model object
          modelState?.transform.UpdateTransform(
            convertedData.position,
            convertedData.rotation,
            convertedData.scale
          );
          //Transfer changed transformation information from the modelstate object to mesh
          modelState?.ApplyTransformToAll();
        }
      }
    });

    ObjectHierarchy_Manager.ActiveInstance?.RemoveDeletedInfos()

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
        ObjectHierarchy_Manager.ActiveInstance?.ServerUpdateStateInfo(
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
    ObjectHierarchy_Manager.ActiveInstance?.BindNewModelStates(newModelArray);
  }

  UpdateUserStates(userDataArray: any[]) {
    const _this = this;
    const GetUserState = function (instanceId: number) {
      if (_this.users.has(instanceId)) 
      {
        return _this.users.get(instanceId);
      } 
      else 
      {
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
      if(convertedData.instanceId == _this.selfUserId){
        return;
      }
      let userState = GetUserState(convertedData.instanceId);
      //If userState not found, create new user
      if (userState === null || userState === undefined) 
      {
        userState = UserState.FromConvertedData(convertedData);
        userState.UpdateUserState(convertedData)
        userState.LoadMesh(_this.scene)

        DC_GlobalEvents.Invoke(new NewCollaboratorEvent(userState));

        _this.users.set(userState.instanceId, userState);
      } 
      //If marked for deletion, delete mesh
      else if(convertedData.markDelete) 
      {
        console.log("Found Deleted User: ", convertedData.instanceId);
        deleteList.push(userState.instanceId)
        userState.UnloadMesh()
        DC_GlobalEvents.Invoke(new DeleteCollaboratorEvent(userState))
      } 
      //Update state normally
      else
      {
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

  UpdateMarkerStates(markerDataArray: Array<{
    mesh: Nullable<Mesh>
    marker_instance_id: number,
    position: Array<number>,
    normal: Array<number>,
    type: number,
    visibility: boolean,
    mark_delete: boolean
  }>){
    const _this = this
    const deleteList: Array<number> = new Array()
    markerDataArray.forEach((markerUpdate) => {

      //If Marker does not exist, create instance of marker
      if(!_this.markers.has(markerUpdate.marker_instance_id)){
        const newMarker = MarkerState.FromServerState(markerUpdate);
        _this.markers.set(newMarker.marker_instance_id, newMarker)

        DC_GlobalEvents.Invoke(new NewMarkerEvent(newMarker))
      }
      // if marker is marked for deletion
      else if(markerUpdate.mark_delete){
        deleteList.push(markerUpdate.marker_instance_id)
        DC_GlobalEvents.Invoke(new DeleteMarkerEvent(markerUpdate.marker_instance_id))
        return
      }
      //Update normally
      else {
        const currMarker = _this.markers.get(markerUpdate.marker_instance_id) as MarkerState
        currMarker.position = Array3ToAxes.ToBabylonVec3(markerUpdate.position)
        currMarker.normal = Array3ToAxes.ToBabylonVec3(markerUpdate.normal)

        if(currMarker.type != markerUpdate.type || currMarker.visibility != markerUpdate.visibility){
          currMarker.isDirty = true
          currMarker.type = markerUpdate.type
          currMarker.visibility = markerUpdate.visibility
        }
      }
    })

    deleteList.forEach((id: number)=>{
      _this.markers.delete(id)
    })
  }

  UpdateAnnotationComponents(annotationDataArray: any[]){
    const _this = this
    const deleteList: Array<number> = new Array()

    annotationDataArray.forEach((annotationData: {
      annotation_instance_id: number,

      annotated_objectState_type: number,
      annotated_objectState_id: number,

      title: string,
      description: string,
      auditor: string,
      safetyCheckStatus: boolean,

      markedForDeletion: boolean
    }) => {
        annotationData.annotation_instance_id = Number(annotationData.annotation_instance_id)
        
        // If annotation not registered, add and create data and objects
        if(!AnnotationDataManager.instance.dataList.get(annotationData.annotation_instance_id))
        {
          //convert to properties
          annotationData.annotated_objectState_type = Number(annotationData.annotated_objectState_type)
          annotationData.annotated_objectState_id = Number(annotationData.annotated_objectState_id)
          annotationData.safetyCheckStatus = Number(annotationData.safetyCheckStatus) == 1 ? true : false;
          
          //Set annotation data and create spatial UI plates.
          const entry = annotationData
          AnnotationDataManager.instance.SetAnnotationEntry(entry);
          AnnotationPlatesManager.instance.addPlateObject(annotationData.annotation_instance_id);

          //Update annotation components in each scene object
          // const objectType:serverobjectType = annotationData.annotated_objectState_type;
          let stateObj:any;
          switch(annotationData.annotated_objectState_type as serverobjectType)
          {
            case(serverobjectType.model):
            {
              stateObj = _this.models.get(annotationData.annotated_objectState_id)
              break;
            }
            case(serverobjectType.marker):
            {
              stateObj = _this.markers.get(annotationData.annotated_objectState_id) 
              break;
            }
            default:
                console.log("Encountered invaild `serverobjectType` type.")
                break;
          }
          if(stateObj.annotation == null)
          {
            (stateObj).annotation = new AnnotationComponent(annotationData.annotation_instance_id);
          }
          else
          {
            stateObj.annotation.updateReferenceID(annotationData.annotation_instance_id)
            console.log("Encountered object already annotated! Updating annotation instance ID reference.")     
          }
        }
        //If registered and marked for deletion
        else if(AnnotationDataManager.instance.dataList.get(annotationData.annotation_instance_id) && annotationData.markedForDeletion)
        {
          console.log("annotationData.dataList key already contains data values of annotation. Will not update key:value map.");
          return;
        }
        // If registered do some updates
        else if(AnnotationDataManager.instance.dataList.get(annotationData.annotation_instance_id))
          {
            console.log("annotationData.dataList key already contains data values of annotation. Will not update key:value map.");
            return;
          }
    })

    if(VrManager.instance.inVR)
    {
      VRAnnotationViewerMenuController.instance.PopulateViewerItems();
    }
    else
    {
      AnnotationMenuController.instance.PopulateViewerItems();
    }
  }

  UpdateMeasurementComponents(dataArray: any[]){
    const _this = this
    const deleteList: Array<number> = new Array()
    dataArray.forEach((dataEntry: {
      measurement_instance_id: number,

      endPoint: any,
      startPoint: any,

      distanceMeasured: number,

      markedForDeletion: boolean
    }) => {
        dataEntry.measurement_instance_id = Number(dataEntry.measurement_instance_id)
        
        // If annotation not registered, add and create data and objects
        if(!MeasureMenuController.instance.measurementsList.get(dataEntry.measurement_instance_id))
        {
          console.log("Adding new measurements.");
          //convert to properties
          dataEntry.distanceMeasured = Number(dataEntry.distanceMeasured)
          dataEntry.endPoint = new Vector3(dataEntry.endPoint._x, dataEntry.endPoint._y, dataEntry.endPoint._z)
          dataEntry.startPoint = new Vector3(dataEntry.startPoint._x, dataEntry.startPoint._y, dataEntry.startPoint._z)

          //Set annotation data and create spatial UI plates.
          const entry = dataEntry
          MeasureMenuController.instance.TryAddMeasurementObject(entry);
          // MeasureMenuController.instance.addPlateObject(dataEntry.measurement_instance_id);
        }
        //If registered and marked for deletion
        else if(MeasureMenuController.instance.measurementsList.get(dataEntry.measurement_instance_id) && dataEntry.markedForDeletion)
        {
          console.log("measurementList.dataList key already contains data values of measurementList. Will not update key:value map.");
          return;
        }
        // If registered do some updates
        else if(MeasureMenuController.instance.measurementsList.get(dataEntry.measurement_instance_id))
          {
            console.log("measurementList.dataList key already contains data values of measurementList. Will not update key:value map.");
            return;
          }
    })

    if(VrManager.instance.inVR)
    {
      VRAnnotationViewerMenuController.instance.PopulateViewerItems();
    }
    else
    {
      AnnotationMenuController.instance.PopulateViewerItems();
    }
  }

  /**
   * @desc:
   * A update function that is executed every frame 
   * using BabylonJS's 'registerBeforeRender' function.
   */
  Update()
  {
    const _this = ServerObjectManager.instance;
    if(_this.pickedModel === null)
    {
      return;
    }

    if((_this.pickedModel as ModelState).gsMesh !== null && (_this.pickedModel as ModelState).gsMesh !== undefined)
      (_this.pickedModel as ModelState).ApplyTransformToGS();
  }

  //TODO
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

  RequestNewMarker(position: Vector3, normal: Vector3, type: number){
    //Add New Marker to marker update list
    const newMarker = new MarkerState(-1, position, normal, type, true)
    this.modifiedMarkers.push({
      marker_info: newMarker.ToServerFormat(),
      action: MarkerState.MarkerActions.create
    })
  }

  RequestDeleteMarker(markerId: number){
    //Add delete key to marker update list.
    if(!this.markers.has(markerId))
    {
      console.warn("Requested to delete non-existent marker")
      return
    }
    
    this.modifiedMarkers.push({
      marker_info: this.markers.get(markerId)?.ToServerFormat(),
      action: MarkerState.MarkerActions.delete
    })
    console.log("Deleting marker");
  }
}
