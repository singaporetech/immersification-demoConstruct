import { ICameraInput, Camera } from "@babylonjs/core";

export interface ICustomCameraInput<TCamera extends Camera> extends ICameraInput<TCamera>{
    SetSpeed(speedScale: number): void
    SetAngularSensibility(rotateScale: number): void
}