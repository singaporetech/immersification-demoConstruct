import { ABaseComponent } from "../../../tool/AComponent"
import { AnnotationData } from "../../../utilities/data/AnnotationData";

export class AnnotationComponent extends ABaseComponent {
    /**
     * Represents a global index of the objects in the scene.
     */
    global_instance_id: number = -1;

    /**
     * A reference ID that points to which entry in AnnotationToolManager.annotationDataList, 
     * the component will read annotation data from.
     */
    annotationDataID: number = -1;

    constructor(referenceAnnotationDataID: number)
    {
        super();
        this.annotationDataID = referenceAnnotationDataID;
    }

    updateReferenceID(annotationDataReferenceID: number)
    {
        this.annotationDataID = annotationDataReferenceID;
    }
}