import { Scene } from "@babylonjs/core"
import { CustomUniversalCameraInput } from "./camera/CustomUniversalCameraInput"

export class CameraSettings{
    private static instance: CameraSettings | null = null

    private scene: Scene

    private activeInput: CustomUniversalCameraInput | null
    private inputs: Map<string, CustomUniversalCameraInput>

    private cameraSpeed: number
    private cameraAngularSensibility: number

    constructor(scene: Scene){
        this.activeInput = null
        this.inputs = new Map()
        this.scene = scene

        this.cameraSpeed = 5.0
        
        this.cameraAngularSensibility = -1 //Wait for SetActiveCamera to retrieve sensibility

        CameraSettings.instance = this
    }

    static SetActiveCamera(key: string): boolean{
        if(!CameraSettings.instance){
            return false
        }

        const _this = CameraSettings.instance
        
        const input = _this.inputs.get(key);
        if(input === undefined){
            return false
        }

        _this.activeInput = input
        _this.scene.activeCamera = input.camera

        if(_this.cameraAngularSensibility = -1){
            _this.cameraAngularSensibility = input.camera.angularSensibility
        } else{
            input.camera.angularSensibility = _this.cameraAngularSensibility
        }
        input.SetSpeed(_this.cameraSpeed)

        return true
    }

    static BindCamera(cameraInput: CustomUniversalCameraInput, key: string): boolean{
        if(!CameraSettings.instance){
            return false
        }

        const _this = CameraSettings.instance
        if(_this.inputs.has(key)){
            console.warn("Camera Input Key Already Exists")
            return false
        }

        _this.inputs.set(key, cameraInput)
        return true
    }

    static EnableCameraMovement(canMove: boolean): boolean{
        if(!CameraSettings.instance){
            return false
        }
        CameraSettings.instance.activeInput?.EnableMovement(canMove)
        return true
    }

    static SetCameraSpeedScale(speedScale: number): boolean{
        if(!CameraSettings.instance){
            return false
        }
        CameraSettings.instance.activeInput?.SetSpeedScale(speedScale)
        return true
    }

    static SetCameraSpeed(speed: number): boolean{
        if(!CameraSettings.instance){
            return false
        }
        CameraSettings.instance.activeInput?.SetSpeed(speed)
        CameraSettings.instance.cameraSpeed = speed
        return true
    }

    static SetCameraAngularSensibility(sensibilityScale: number): boolean{
        if(!CameraSettings.instance){
            return false
        }
        const _this = CameraSettings.instance
        _this.activeInput?.SetAngularSensibility(sensibilityScale)

        _this.cameraAngularSensibility = sensibilityScale

        return true
    }
}