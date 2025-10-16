import { Vector3 } from "@babylonjs/core";
import { serverobjectType } from "../enums/enums";

export class MeasurementData{
    /**
     * Annotation id represents the index inside the list of annotations
     */
    measurement_instance_id: number
    startPoint: Vector3
    endPoint: Vector3
    distanceMeasured: number

    constructor(
        measurement_instance_id: number,
        startPoint: Vector3,
        endPoint: Vector3,
        distanceMeasured: number
    ){
        this.measurement_instance_id = measurement_instance_id
        this.startPoint = startPoint
        this.endPoint = endPoint
        this.distanceMeasured = distanceMeasured      
    }
}