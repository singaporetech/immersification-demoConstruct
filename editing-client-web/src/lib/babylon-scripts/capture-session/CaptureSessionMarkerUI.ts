/**
 * @fileoverview Deprecated!
 * TODO: Remove file and all references.
 * 
 */

import { DC_GlobalEvents } from "../../event-listener/GlobalEventListener";
import {CaptureSessionManager, DeleteMarkerEvent, Marker, NewMarkerEvent, ReconstructionMetadata } from "./CaptureSessionManager";
import { AdvancedDynamicTexture, Image, Rectangle} from "@babylonjs/gui";
import { Scene, Camera, Engine, Vector3, Matrix, Observer, PointerInfo, PointerEventTypes, Vector2, Color4} from "@babylonjs/core";
import { ColorScheme } from "../ColorScheme";

class MarkerImageMetaData{
    markerId: number
    constructor(id: number){
        this.markerId = id
    }
}

export class CaptureSessionMarkerUI{
    static instance: CaptureSessionMarkerUI | null
    
    readonly DisplayStates ={
        None: 0,
        Partial: 1,
        All: 2
    }
    readonly ActionStates={
        None: 0,
        Add: 1,
        Remove: 2
    }
    readonly MarkerTypes={
        Exclamation: 0,
        Camera: 1,
        Shadow: 2,
        Surface: 3
    }

    baseImage: Image | null = null
    markerImages: Map<number, Image>
    markerVisibilityButton: Rectangle | null = null
    markerAddButton: Rectangle | null = null
    markerDeleteButton: Rectangle | null = null
    markerPopupContainer: Rectangle | null = null
    markerPopupButtons: Array<Rectangle> | null = null
    advDynamicTexture: AdvancedDynamicTexture
    scene: Scene

    sceneOnPointerObserver: Observer<any> | null = null

    displayState: number = 1
    actionState: number = 0
    storedPointInfo: PointerInfo  | null = null
    
    //For scaling marker size based on distance from camera.
    markerMinDistance: number = 5
    markerMaxDistance: number = 25
    markerMinScale: number = 0.25
    markerMaxScale: number = 1.0

    constructor(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        this.markerImages = new Map<number, Image>()

        if(CaptureSessionMarkerUI.instance){
            CaptureSessionMarkerUI.instance.Uninit()
            CaptureSessionMarkerUI.instance = null
        }
        CaptureSessionMarkerUI.instance = this
    }

    ToggleDisplayMarkers(displayState: number = -1){
        const _this = this;
        displayState = Math.round(displayState)
        if(displayState < -1 || displayState > 2){
            return
        }

        //If special case no state provided. Toggle on/off
        if(displayState === -1){
            this.displayState = this.displayState ? this.DisplayStates.None : this.DisplayStates.All
        }else{
            this.displayState = displayState
        }

        //Update UI to represent display state
        if(_this.markerVisibilityButton){
            const bgColor = Color4.FromHexString(_this.markerVisibilityButton.background)
            bgColor.a = _this.displayState ? 1.0 : 0.0
            _this.markerVisibilityButton.background = bgColor.toHexString()
        }
        
        //For each collaborator, enable display.
        this.markerImages.forEach((img, id)=>{
            const markerInfo = CaptureSessionManager.instance?.GetMarkerInfo(id)
            if(markerInfo !== undefined){
                _this.SetImageDisplayState(img, markerInfo.visibility)
            }
        })
    }

    NewMarkerEventCallback(event: NewMarkerEvent){
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI
        const newImage = _this.baseImage?.clone() as Image
        
        newImage.metadata = new MarkerImageMetaData(event.markerInfo.id)
        newImage.onPointerUpObservable.add((pointInfo, eventState)=>{
            if(pointInfo){}//Suppress Warning
            if(eventState.target === newImage){
                CaptureSessionManager.instance?.RequestDeleteMarker(newImage.metadata.markerId)
            }
        })

        _this.SetImageDisplayState(newImage, event.markerInfo.visibility)
        _this.SetImageSource(newImage, event.markerInfo.type)

        _this.markerImages.set(event.markerInfo.id, newImage)
        _this.advDynamicTexture.addControl(newImage)
    }

    DeleteMarkerEventCallback(event: DeleteMarkerEvent){
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI

        if(!_this.markerImages.has(event.idToDelete)){
            console.warn("Marker To Delete does not exist as image!")
            return
        }
 
        const img = _this.markerImages.get(event.idToDelete) as Image
        _this.markerImages.delete(event.idToDelete)
        _this.advDynamicTexture.removeControl(img)
    }

    SetImageSource(img: Image, type: number){
        let srcString = "markers/"
        switch(type){
            case this.MarkerTypes.Exclamation:
                srcString += "exclamation-orange.png"
                break
            case this.MarkerTypes.Camera: 
                srcString += "camera-orange.png"
                break
            case this.MarkerTypes.Shadow:
                srcString += "shadow2-orange.png"
                break
                case this.MarkerTypes.Surface:
                srcString += "missingsurface-orange.png"
                break
            default:
                console.warn("Incorrect Marker Type!")
                return;
        }
        img.source = srcString
    }

    SetImageDisplayState(img: Image, markerVisibility: boolean){
        let isRendered = false
        switch(this.displayState){
            case this.DisplayStates.None:       isRendered = false; break;
            case this.DisplayStates.Partial:    isRendered = markerVisibility; break;
            case this.DisplayStates.All:        isRendered = true; break;
            default:
                break;
        }
        img.isVisible = isRendered
    }

    SetMarkerActionState(state: number){
        state = Math.round(state)
        if(state < 0 || state > 2){
            console.warn("Invalid State Number Entered!")
            return
        }

        //Handle behaviour for leaving current action State
        switch(this.actionState){
            case this.ActionStates.None: 
                break;
            case this.ActionStates.Add:
                if(this.markerPopupContainer){
                    this.markerPopupContainer.isVisible = false
                }
                if(this.markerAddButton){
                    this.markerAddButton.background = ColorScheme.GetGrayscale(2)
                }
                this.DisableMarkerPopupUI()
                break;
            case this.ActionStates.Remove:
                if(this.markerDeleteButton){
                    this.markerDeleteButton.background = ColorScheme.GetGrayscale(2)
                }
                this.markerImages.forEach((image)=>{
                    image.isEnabled = false;
                })
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
        }

        //If same state, handle as Toggle On/Off
        if(this.actionState === state && this.actionState !== this.ActionStates.None){
            this.actionState = this.ActionStates.None
        }else{ //Else switch to new state.
            this.actionState = state
        }

        //Handle behaviour for entering new action State
        switch(this.actionState){
            case this.ActionStates.None: 
                break;
            case this.ActionStates.Add:
                //Setup UI
                if(this.markerAddButton){
                    this.markerAddButton.background = ColorScheme.GetPurpleScale(0)
                }
                break;
            case this.ActionStates.Remove:
                //Setup UI
                if(this.markerDeleteButton){
                    this.markerDeleteButton.background = ColorScheme.GetPurpleScale(0)
                }
                this.markerImages.forEach((image)=>{
                    image.isEnabled = true;
                })
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
        }
    }

    EnableMarkerPopupUI(screenPos: Vector2){
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI
        if(!_this.markerPopupContainer) return
        if(_this.markerPopupContainer.isVisible) return

        _this.markerPopupContainer.isVisible = true
        _this.markerPopupContainer.leftInPixels = screenPos.x - _this.markerPopupContainer.widthInPixels / 2
        _this.markerPopupContainer.topInPixels = screenPos.y - _this.markerPopupContainer.heightInPixels / 2
        _this.markerPopupButtons?.forEach((rect)=>{
            rect.background = ColorScheme.GetGrayscale(2)
        })

        _this.scene.onPointerDown = ()=>{
            _this.scene.onPointerDown = undefined
            _this.DisableMarkerPopupUI()
        }
    }

    DisableMarkerPopupUI(){
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI
        if(!_this.markerPopupContainer) return
        if(!_this.markerPopupContainer.isVisible) return

        _this.markerPopupContainer.isVisible = false
    }

    _HandleMarkerAdd(pointInfo: PointerInfo){
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI

        //Check if mesh was picked
        if(pointInfo.type !== PointerEventTypes.POINTERPICK || !pointInfo.pickInfo?.hit || !pointInfo.pickInfo?.pickedMesh){
            return
        }
        //Check if currently in correct state.
        if(_this?.actionState !== _this.ActionStates.Add){
            return
        }

        const pickedMesh = pointInfo.pickInfo.pickedMesh
        //If picked mesh is not recognized as a reconstructed model
        if((pickedMesh.metadata instanceof ReconstructionMetadata) === false){
            return
        }
        
        //User has thus clicked on valid reconstruction mesh in marker add mode
        //Toggle Behaviour to popup marker sub-menu
        const camera = _this.scene.activeCamera as Camera
        const engine = _this.scene.getEngine() as Engine
        const screenPos = Vector3.Project(
            pointInfo.pickInfo.pickedPoint as Vector3,
            Matrix.Identity(),
            _this.scene.getTransformMatrix(),
            camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
        )
        _this.EnableMarkerPopupUI(new Vector2(screenPos.x, screenPos.y))

        _this.storedPointInfo = pointInfo
    }

    _HandleMarkerTypeSelection(markerType: number){
        if(markerType < 0 || markerType > 3){
            console.warn("Invalid Marker Type Entered: ", markerType)
            return
        }
        
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI
        if(_this.storedPointInfo === null){
            console.warn("Marker Spawn Requested but point info is null!")
            return;
        }

        //Retrieve Stored Click Location and create new marker
        const markerPos = _this?.storedPointInfo?.pickInfo?.pickedPoint as Vector3
        let markerNormal = _this?.storedPointInfo?.pickInfo?.getNormal() as Vector3
        markerNormal.y = 0 //Use only XZ plane for normal

        CaptureSessionManager.instance?.RequestCreateMarker(markerPos, markerNormal, markerType)
        _this.storedPointInfo = null
    }

    Init(){
        const _this = this

        //Setting up GUI Controls
        this.baseImage = this.advDynamicTexture.getControlByName("Marker_BaseElement") as Image
        if(!this.baseImage){
            throw("Base Image is Null!")
        }

        this.baseImage.isVisible = false
        this.baseImage.isEnabled = false

        //Setting Up Marker Actions
        this.markerAddButton = this.advDynamicTexture.getControlByName("Marker_ActionAdd_Toggle") as Rectangle
        this.markerDeleteButton = this.advDynamicTexture.getControlByName("Marker_ActionDelete_Toggle") as Rectangle
        this.markerAddButton.children[0].isEnabled = false
        this.markerDeleteButton.children[0].isEnabled = false

        this.markerAddButton.onPointerUpObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerAddButton)return
            _this.SetMarkerActionState(_this.ActionStates.Add)
        })

        this.markerDeleteButton.onPointerUpObservable.add((eventData, eventState)=>{
            if(eventData){} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.markerDeleteButton) return
            _this.SetMarkerActionState(_this.ActionStates.Remove)
        })

        //Setting up Marker View Toggle
        this.markerVisibilityButton = this.advDynamicTexture.getControlByName("ShowMarkers_Container") as Rectangle
        this.markerVisibilityButton.children[0].isEnabled = false
        this.markerVisibilityButton.onPointerUpObservable.add((mousePos, eventState)=>{
            mousePos // suppress warning
            if(eventState.target !== _this.markerVisibilityButton){
                return
            }
            _this.ToggleDisplayMarkers();
        })
        
        //Setting Up Marker Types Popup
        this.markerPopupContainer = this.advDynamicTexture.getControlByName("Marker_Types_Container") as Rectangle
        this.markerPopupContainer.isVisible = false
        const button0 = this.advDynamicTexture.getControlByName("Marker_Type_0") as Rectangle
        const button1 = this.advDynamicTexture.getControlByName("Marker_Type_1") as Rectangle
        const button2 = this.advDynamicTexture.getControlByName("Marker_Type_2") as Rectangle
        const button3 = this.advDynamicTexture.getControlByName("Marker_Type_3") as Rectangle

        this.markerPopupButtons = new Array(button0, button1, button2, button3)
        this.markerPopupButtons.forEach((rect, index)=>{
            //Prevent Child Image from blocking input
            rect.children[0].isEnabled = false
            
            //Add Observable to create marker at click position
            rect.onPointerDownObservable.add(()=>{
                rect.background = ColorScheme.GetPurpleScale(0)
            })
            rect.onPointerUpObservable.add((pointerPos, eventState)=>{
                if(pointerPos){} //Suppress Warning
                if(eventState.target !== rect) return
                _this._HandleMarkerTypeSelection(index)
                _this.DisableMarkerPopupUI()
            })
            rect.onPointerEnterObservable.add(()=>{
                rect.background = ColorScheme.GetGrayscale(3)
            })
            rect.onPointerOutObservable.add(()=>{
                rect.background = ColorScheme.GetGrayscale(2)
            })
        })

        //Event Subscription
        this.scene.onPointerObservable.add(this._HandleMarkerAdd);
        
        DC_GlobalEvents.AddCallback(NewMarkerEvent.UniqueSymbol, this.NewMarkerEventCallback);
        DC_GlobalEvents.AddCallback(DeleteMarkerEvent.UniqueSymbol, this.DeleteMarkerEventCallback)

        //Set Logic State after initializations
        this.ToggleDisplayMarkers(this.DisplayStates.All);
    }

    Uninit(){
        DC_GlobalEvents.RemoveCallback(NewMarkerEvent.UniqueSymbol, this.NewMarkerEventCallback);
        DC_GlobalEvents.RemoveCallback(DeleteMarkerEvent.UniqueSymbol, this.DeleteMarkerEventCallback);
        this.scene.onPointerObservable.remove(this.sceneOnPointerObserver)
    }

    UpdateMarkerState(img: Image, marker: Marker){
        this.SetImageDisplayState(img, marker.visibility)
        this.SetImageSource(img, marker.type)
    }

    Update(){
        const _this = CaptureSessionMarkerUI.instance as CaptureSessionMarkerUI
        if(_this.displayState === 0){
            return
        }

        const invalidIds = new Array<number>()
        const camera = _this.scene.activeCamera as Camera
        const engine = _this.scene.getEngine() as Engine
        const defaultMarkerSize = _this.baseImage?.widthInPixels as number

        _this.markerImages.forEach((img: Image, id: number)=>{
            //If user id does not exist, purge from map and continue.
            const markerInfo = CaptureSessionManager.instance?.GetMarkerInfo(id)
            if(markerInfo === undefined){
                invalidIds.push(id)
                return
            }

            //Process Dirty First
            if(markerInfo.is_dirty){
                _this.UpdateMarkerState(img, markerInfo)
            }

            //Update position by calculating world to screen point via Vector3.unproject
            const markerPos = markerInfo.position.clone() as Vector3
            const delta = markerPos.subtract(camera.position)

            const deltaLength = delta.length()

            //Set opacity of image based on distance
            img.alpha = deltaLength < _this.markerMinDistance ? 0.4 : 1

            //Set size of image based on distance to camera
            let imgScale = (deltaLength - _this.markerMinDistance) / (_this.markerMaxDistance - _this.markerMinDistance)
            imgScale = Math.min(imgScale, _this.markerMaxScale)
            imgScale = Math.max(_this.markerMinScale, imgScale)
            img.widthInPixels = Math.round(defaultMarkerSize * (1 / imgScale))
            img.heightInPixels = Math.round(defaultMarkerSize * (1 / imgScale))

            let screenPos: Vector3 | null = null            
            if(Vector3.Dot(camera.getForwardRay(1).direction, delta) <= 0){
                screenPos = new Vector3(-1000, -1000, 0)
            }else{
                screenPos = Vector3.Project(
                    markerPos,
                        Matrix.Identity(),
                        _this.scene.getTransformMatrix(),
                        camera.viewport.toGlobal(
                            engine.getRenderWidth(),
                            engine.getRenderHeight()
                        )
                )
            }
            
            img.topInPixels = screenPos.y - img.heightInPixels / 2
            img.leftInPixels = screenPos.x - img.widthInPixels / 2
        })

        invalidIds.forEach((value)=>{
            _this.markerImages.delete(value);
        })
    }
}