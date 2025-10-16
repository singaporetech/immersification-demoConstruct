import {Vector3, Tools, UniversalCamera} from "@babylonjs/core"
import { ICustomCameraInput } from "../CameraInterfaces"
import { Nullable } from "babylonjs"

export class CustomUniversalCameraInput implements ICustomCameraInput<UniversalCamera>{
    
    camera: UniversalCamera
    htmlCanvas: any
    isAttached: boolean
    noPreventDefault: any

    _onKeyUp: any
    _onKeyDown: any
    _onLostFocus: any

    _keys: Array<any> = [];
    watchedKeys = [87, 83, 65, 68, 32, 16]
    
    moveSpeed = 5.0
    speedMaxLimit = 12.0
    speedMinLimit = 0.5

    inputElement: Nullable<HTMLElement>

    isMoveEnabled: boolean = true

    constructor(htmlCanvas: any, camera: UniversalCamera){
        this.htmlCanvas = htmlCanvas
        this.camera = camera
        this.isAttached = false
        this.inputElement = camera.getEngine().getInputElement()
    }

    _OnKeyDown(event:{
        keyCode: any;
        preventDefault: ()=>void
    }){
        if(this.inputElement){
            this.inputElement.tabIndex = 1
        }
        const _this = this
        if(_this.isMoveEnabled && _this.watchedKeys.indexOf(event.keyCode) !== -1){
            if(_this._keys.indexOf(event.keyCode) === -1){
                _this._keys.push(event.keyCode)
            }
        }
        if(!this.noPreventDefault){
            event.preventDefault()
        }
    }

    _OnKeyUp(event:{
        keyCode: any;
        preventDefault: ()=>void
    }){
        if(this.watchedKeys.indexOf(event.keyCode) !== -1){
            const index = this._keys.indexOf(event.keyCode)
            if(index >= 0){
                this._keys.splice(index, 1);
            }
            if(!this.noPreventDefault){
                event.preventDefault()
            }
        }
    }

    getClassName(){
        return "CustomUniversalCameraInput"
    }

    getSimpleName(){
        return "cus_uni_cam"
    }

    attachControl(noPreventDefault: any){
        if(!this.isAttached){
            const _this = this
            const engine = this.camera.getEngine()
            const element = engine.getInputElement()

            this._onKeyDown = function(event: {keyCode: any; preventDefault: ()=>void}){
                _this._OnKeyDown(event)
            }
            this._onKeyUp = function(event: {keyCode: any; preventDefault: ()=>void}){
                _this._OnKeyUp(event)
            }

            element?.addEventListener("keydown", this._onKeyDown, false)
            element?.addEventListener("keyup", this._onKeyUp, false);

            this.isAttached = true
            this.noPreventDefault = noPreventDefault

            Tools.RegisterTopRootEvents(this.htmlCanvas, [
                {
                    name: "blur",
                    handler: this._onLostFocus
                }
            ])
        }
    }

    checkInputs(){
        if(!this.isAttached){
            return;
        }

        const _this = this
        const camera = this.camera
        const dt = this.camera.getScene().deltaTime / 1000;

        this._keys.forEach((keyCode)=>{
            let dir = new Vector3()
            switch (keyCode) {
                case 87: //W
                  dir = camera.getDirection(new Vector3(0, 0, 1));
                  break;
                case 83: //S
                  dir = camera.getDirection(new Vector3(0, 0, -1));
                  break;
                case 65: //A
                  dir = camera.getDirection(new Vector3(-1, 0, 0));
                  break;
                case 68: //D
                  dir = camera.getDirection(new Vector3(1, 0, 0));
                  break;
                case 32: //Spacebar
                  dir = camera.getDirection(new Vector3(0, 1, 0));
                  break;
                case 16: //Left Shift?
                  dir = camera.getDirection(new Vector3(0, -1, 0));
                  break;
                default:
                  break;
              }
            camera.position.addInPlace(dir.scale(_this.moveSpeed * dt))
        })

    }

    detachControl(){
        const engine = this.camera.getEngine()
        const element = engine.getInputElement()
        if(this.isAttached){
            this.isAttached = false
            element?.removeEventListener("keydown", this._onKeyDown)
            element?.removeEventListener("keyup", this._onKeyUp)
            Tools.UnregisterTopRootEvents(this.htmlCanvas,[
                {
                    name: "blur",
                    handler: this._onLostFocus
                }
            ])
        }
    }

    EnableMovement(isEnabled: boolean){
        this.isMoveEnabled = isEnabled
    }
    
    SetSpeedScale(speedScale: number){
        this.moveSpeed = (this.speedMaxLimit - this.speedMinLimit) * speedScale + this.speedMinLimit;
    }

    SetSpeed(speed: number): void {
        speed = Math.max(this.speedMinLimit, speed)
        speed = Math.min(this.speedMaxLimit, speed)
        this.moveSpeed = speed
    }

    SetAngularSensibility(sensibilityScale: number){
        this.camera.angularSensibility = 8000 - (7800 * sensibilityScale)
    }
}