import { serverobjectType } from "../utilities/enums/enums";
import { PickingInfo, Vector3 } from "@babylonjs/core";
import { ServerObjectManager } from "../roomController/ServerObjectManager";
import { ObjectMetaData } from "../utilities/data/ObjectsData";
import { AnnotationData } from "../utilities/data/AnnotationData";
import { AnnotationPlatesManager } from "../gui/AnnotationPlatesController";
import { SocketHandler } from "../networking/WebSocketManager";

export class AnnotationDataManager //extends ABaseTool
{
    static instance: AnnotationDataManager | null = null

    // /**
    //  * The current state the tool is in.
    //  */
    // actionState: number = 0

    //recorded object the user wants to annotation (currently only works with markers)
    // targetObjectForAnnotationMetadata: any

    //Tracks input from user
    userInputs: AnnotationData;

    dataList: Map<number, AnnotationData> = new Map();
    deletionList: AnnotationData[]= []

    annotationPlateObjectsController: AnnotationPlatesManager;

    constructor()
    {
        // super();
    }

    Init()
    {
        if (AnnotationDataManager.instance != null)
            return;

        this.userInputs = new AnnotationData();

        this.annotationPlateObjectsController = new AnnotationPlatesManager();

        // //For testing only
        // for (let i = 0; i <= 10; i++) {
        //     const index = i;
        //     const data = {
        //         annotation_instance_id: i,
        //         annotated_object_instance_id: i,
        //         annotated_object_type: (i%2 == 0) ? serverobjectType.model : serverobjectType.marker,
        //         title: i.toString(),
        //         description: i.toString(),
        //         safetyCheckStatus: false,
        //         auditor: i.toString()
        //     }
        //     _this.CreateAnnotationEntry(data)
        // }
        AnnotationDataManager.instance = this;
    }

    // // ============ general tool functions ============

    // DeselectTool(): void {
    //     console.warn("DeselectTool not yet implemented");
    // }

    // // ============ annotation actions ============

    // /**
    //  * Set the selected action (add or remove) annotation
    //  */
    // SetToolActionState(actionState: number, callback?: (result?: any) => void)
    // {        
    //     const _this = AnnotationDataManager.instance;

    //     actionState = Math.round(actionState)
    //     if(actionState < 0 || actionState > 2){
    //         console.warn("Invalid State Number Entered!")
    //         return
    //     }
    //     _this.actionState = actionState;

    //     ObjectPickingManager.ActiveInstance?.ClearOnPickFunction()

    //     switch(_this.actionState){
    //         case ActionStates.None: 
    //             break;
    //         case ActionStates.Add:
    //             console.log("Setting add state");
    //             // _this.AssignOnPickAction();
    //             break;
    //         case ActionStates.Remove:
    //             console.log("Setting remove state");
    //             break;
    //         default:
    //             console.warn("this.actionState value was changed to invalid value.")
    //             break;
    //         }


    //     console.log(_this.actionState);
    //     //execute callback to update the desktop or vr ui (based on where the func was called from)
    //     if (callback) {
    //         callback();
    //     }
    // }

    GetAnnotated(metadata: ObjectMetaData)
    {
        var result = false;
        // if( metadata != MarkerImageMetaData || metadata != ServerModelMetadata)
        if(metadata == null)
        {
            console.log("Incorrect object selected or no `ObjectMetaData` class received for annotation.");
            result =  false
        }
        else
        {
            const objType = metadata.objectType;
            const objID = metadata.typeInstanceID

            switch(objType)
            {
                case(serverobjectType.model):
                    result = ServerObjectManager.instance.models.get(objID).annotation !== null
                    break;

                case(serverobjectType.marker):
                    result = ServerObjectManager.instance.markers.get(objID).annotation !== null
                    break;

                case(serverobjectType.measurement):
                    // result = ServerObjectManager.instance.markers.get(objID).annotation !== null
                    result =  false //temp for now since no measurements added in.
                    break;

                default:
                    console.log("Incorrect object selected or no `ObjectMetaData` class received for annotation.");
                    result =  false
                    break
            }
        }
        if(!result)
            console.log("Object available for annotation. Opening annotation input UI.")
        else
            console.log("Object already annotated or encountered error.")
        return result;
    }

    RecordTargetAnnotationObjectData(metadata: ObjectMetaData)
    {
        // if( metadata != MarkerImageMetaData || metadata != ServerModelMetadata)
        if(metadata == null)
        {
            console.log("Incorrect object selected or no `ObjectMetaData` class received for annotation.");
            return
        }

        const _this = AnnotationDataManager.instance;
        _this.userInputs.annotated_objectState_type = metadata.objectType;
        _this.userInputs.annotated_objectState_id = metadata.typeInstanceID
    }

    /**
     * Used when a user request to create a new annotation by clicking on a UI button
     */
    RecordAnnotationUserInputs(jsonInputData: {
        title: string,
        description: string,
        auditor: string,
        CheckStatus: boolean})
    {
        const _this = AnnotationDataManager.instance;
        _this.userInputs.title = jsonInputData.title
        _this.userInputs.description = jsonInputData.description
        _this.userInputs.auditor = jsonInputData.auditor
        _this.userInputs.checkStatus = jsonInputData.CheckStatus     
    }

    /**
     * Calls RequesNewAnnotation when user confirms creation of a new annotation
     */
    AddAnnotationAction(pickInfo: PickingInfo)
    {
        const _this = AnnotationDataManager.instance as AnnotationDataManager 
        const pickPos = pickInfo.pickedPoint as Vector3 
        console.log("Adding annotation via PC");
        console.log("Coords - X:", pickPos.x, "Y:", pickPos.y, "Z:", pickPos.z);
        console.log("Object:", pickInfo)

    }

    CancelAnnotationAction()
    {

    }

    DeleteAnnotationAction()
    {

    }

    //Clears the metadata and other related annotation variables, and resets annotation action state to none.
    // ClearTargetObjectAnnotation()
    // {        
    //     // const _this = AnnotationDataManager.instance;                
    //     // AnnotationToolManager.instance.SetToolActionState(ActionStates.None); 
    //     // _this.targetObjectForAnnotationMetadata = null
    // }

    AssignOnPickAction() 
    {
        const _this = AnnotationDataManager.instance;
        // ObjectPickingManager.ActiveInstance?.AssignOnPickFunction(_this.AddAnnotationAction, _this.CancelAnnotationAction)
        console.log("picking action assgined")
    }

    // ============ annotation requests sent to server ============

    /**
     * Called when user clicks "create annotation" UI button, sends values stored in annotationInput to server
     */
    SendCreateNewAnnotationRequest_toServer()
    {
        const _this = AnnotationDataManager.instance;

        //annotation_instance_id will always be invaild (-1), let the server handle assigning the instance id for consistency across all clients.
        const sendData = {
            global_instance_id: "-1",
            annotation_instance_id: "-1",

            annotated_objectState_type: _this.userInputs.annotated_objectState_type.toString(),
            annotated_objectState_id: _this.userInputs.annotated_objectState_id.toString(),

            title: _this.userInputs.title,
            description: _this.userInputs.description,
            auditor: _this.userInputs.auditor,
            safetyCheckStatus: (_this.userInputs.checkStatus ? 0 : 1).toString(),
        };
        SocketHandler.SendData(
            SocketHandler.CodeToServer.EditServer_ClientRequest_CreateNewAnnotationObject,
            sendData
        );

        console.log("New annotation request sent to server");
    }

    /**
     * Called when user clicks "delete annotation" UI button, sends id values stored in annotationInput to server to request deletion
     * on server and all connected clients.
     */
    DeleteAnnotationRequest_toServer()
    {

    }
    // ============ annotation data entry and object creation based on requests from server ============
    /**
     * Adds or overwrites an entry in the annotationDataList.
     * @param jsonData An array of values to be coverted to a `AnnotationData` class
     * for storing in `annotationDataList`.
     */
    SetAnnotationEntry(jsonData: {
        annotation_instance_id: number,

        annotated_objectState_type: number,
        annotated_objectState_id: number,

        title: string,
        description: string,
        auditor: string
        safetyCheckStatus: boolean,})
    {
        const newEntry = new AnnotationData(jsonData.annotation_instance_id,
                                            jsonData.annotated_objectState_type,
                                            jsonData.annotated_objectState_id,
                                            jsonData.title,
                                            jsonData.description,
                                            jsonData.auditor,
                                            jsonData.safetyCheckStatus
        );
        this.dataList.set(jsonData.annotation_instance_id, newEntry);
    }

    DeleteAnnotationEntry()
    {

    }

    ClearAnnotationEntries()
    {
        const _this = AnnotationDataManager.instance as AnnotationDataManager 
        _this.dataList.clear();
    }
}