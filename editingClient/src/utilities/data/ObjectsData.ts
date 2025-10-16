import { Mesh, AbstractActionManager} from "@babylonjs/core"
import { ModelState } from "../../roomController/objects/ServerObjects"
import { serverobjectType } from "../enums/enums"

const INVAILD = -1;
// export class MarkerButtonMetadata{
//     public id: number
//     public isHovered
//     public isSelected

//     constructor(id: number = -1, hovered: boolean = false, selected: boolean = false){
//         this.id = id
//         this.isHovered = hovered
//         this.isSelected = selected
//     }
// }

export class ButtonMetadata{
    public id: number
    public isHovered
    public isSelected

    constructor(id: number = -1, hovered: boolean = false, selected: boolean = false){
        this.id = id
        this.isHovered = hovered
        this.isSelected = selected
    }
}

export class ObjectMetaData
{
  //A global ID which specifics the ID of the object compared to every object in the scene.
  globalInstanceID: number = INVAILD
  //An ID which specifics the ID of the object compared to every object of the same type in the scene.
  typeInstanceID: number
  objectType: serverobjectType

  constructor(instanceID: number, objectType: serverobjectType, globalInstanceID?: number){
    this.typeInstanceID = instanceID
    this.objectType = objectType
    this.globalInstanceID = globalInstanceID;
  }
}

export class MarkerImageMetaData extends ObjectMetaData
{
    meshObject: Mesh
    actionManager?: AbstractActionManager

    constructor(instanceID: number, objectType: serverobjectType, mesh: Mesh, actionManager?: AbstractActionManager, globalInstanceID?: number){
      super(instanceID, objectType, globalInstanceID)
        this.typeInstanceID = instanceID
        this.meshObject = mesh
        this.actionManager = actionManager
    }
}

export class ServerModelMetadata extends ObjectMetaData
{
    editable: boolean
  
    constructor(instanceID: number, objectType: serverobjectType, editable :boolean, globalInstanceID?: number) {
      super(instanceID, objectType, globalInstanceID)
      this.typeInstanceID = instanceID;
      this.editable = editable;
    }
  }
  
/**
 * @classdesc
 * A Object that holds values for displaying the model previews (not ghost models) in the model browser UIs
 */
export class ModelPreview_Data {
    id: string;
    versions: any[];
    name: string;
    thumbnailUrl: string;
    /**
     * Constructor
     * @param {string} id - A string to define the id of the model, as retrieved from backend.
     * @param {string} modelName - The display name of the model to show users.
     * @param {string} thumbnailUrl - A base64 encoded string for image to display as thumbnail.
     */
    constructor(id: string, modelName: string, thumbnailUrl: string) {
      this.id = id;
      this.versions = [];
      this.name = modelName;
      this.thumbnailUrl = thumbnailUrl;
    }
  }

export class ObjectHierarchyStateInfo {
  modelState: ModelState;
  directChildren: number;
  totalChildren: number;
  childDepth: number;
  markDelete: boolean;

  constructor(modelState: ModelState) {
    this.modelState = modelState;
    this.directChildren = 0;
    this.totalChildren = 0;
    this.childDepth = 0;

    this.markDelete = false;
  }
}