import { Rectangle } from "@babylonjs/gui";
import { serverobjectType } from "../enums/enums";

export class AnnotationData{
    /**
     * Annotation id reprsents the index inside the list of annotations
     */
    public annotation_instance_id: number = -1;

    public annotated_objectState_type: serverobjectType = serverobjectType.model
    public annotated_objectState_id: number  = -1;

    public title: string = "NIL"
    public description: string = "NIL"
    public checkStatus: boolean = false
    public auditor: string = "NIL"

    constructor(
        annotation_Instance_ID?: number,

        annotated_object_type?: serverobjectType,
        annotated_object_instance_id?: number,

        title?: string,
        description?: string,
        auditor?: string,
        safetyCheckStatus?: boolean,
    ){
        this.annotation_instance_id = annotation_Instance_ID

        this.annotated_objectState_id = annotated_object_instance_id
        this.annotated_objectState_type = annotated_object_type

        this.title = title;
        this.description = description;
        this.checkStatus = safetyCheckStatus
        this.auditor = auditor;       
    }
}

/**
 * A class that contains the control scene oject annotation UI related to a single annotation.
 * Also contains other properties for indicating how the control scene objects will be displayed.
 */
export class AnnotationDataUIModel {
    collapsedUIControl:Rectangle = null;
    expandedUIControl:Rectangle = null;
    
    collapsedControlRemoved: boolean = false;    
    isExpanded: boolean = false;

    constructor(
        collapsedUIEntity?: Rectangle,
        expandedUIControl?: Rectangle,
    ){
        this.collapsedUIControl = collapsedUIEntity;
        this.expandedUIControl = expandedUIControl;
    }

    setExpanded(isExpanded:boolean)
    {
        this.isExpanded = isExpanded;
    }

    setControlRemoved(controlRemoved:boolean)
    {
        this.collapsedControlRemoved = controlRemoved;
    }
}