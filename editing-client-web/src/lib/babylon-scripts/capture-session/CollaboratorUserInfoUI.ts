/**
 * @fileoverview Contains classes to manage and display stats info (name, actions, etc.) of other users to the GUI.
 * TODO: WIP feature, not implemented yet.
 */

import { DC_GlobalEvents } from "../../event-listener/GlobalEventListener";
import { CaptureSessionManager } from "./CaptureSessionManager";
import { AdvancedDynamicTexture, Rectangle, Control, Image, TextBlock} from "@babylonjs/gui";
import { Scene, Color4, Camera, Engine, Vector3, Matrix} from "@babylonjs/core";
import { NewViewerEvent, DeleteViewerEvent } from "./CaptureSessionManager";

export class CollaboratorUserInfoUI{
    private static instance: CollaboratorUserInfoUI | null

    viewerToggleRect: Rectangle | null = null
    viewerRectParent: Rectangle | null = null
    baseViewerRect: Rectangle | null = null    
    viewerRects: Map<number, Rectangle>

    advDynamicTexture: AdvancedDynamicTexture
    scene: Scene

    displayState: boolean = false

    constructor(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        this.viewerRects = new Map<number, Rectangle>()

        if(CollaboratorUserInfoUI.instance){
            CollaboratorUserInfoUI.instance.Uninit()
            CollaboratorUserInfoUI.instance = null
        }
        CollaboratorUserInfoUI.instance = this
    }

    ToggleDisplayCollaborators(isDisplayed: boolean | null = null){
        if(isDisplayed === null){
            this.displayState = !this.displayState
            isDisplayed = this.displayState
        }

        if(this.viewerToggleRect === null){
            return
        }

        const color = Color4.FromHexString(this.viewerToggleRect.background as string)
        color.a = isDisplayed ? 1.0 : 0
        this.viewerToggleRect.background = color.toHexString()

        //For each collaborator, enable display.
        this.viewerRects.forEach((rect: Rectangle)=>{
            rect.isVisible = isDisplayed as boolean
        })
    }

    NewViewerEventCallback(event: NewViewerEvent){
        //Create new UI Box based on thing.
        const _this = CollaboratorUserInfoUI.instance as CollaboratorUserInfoUI
        const sessionUser = event.sessionUserInfo
        const newRect = _this.baseViewerRect?.clone() as Rectangle
        const newRectText = newRect.children[0] as TextBlock

        newRect.background = Color4.FromColor3(sessionUser.displayColor, 1.0).toHexString()
        newRect.isVisible = _this.displayState
        newRectText.text = sessionUser.displayName

        _this.viewerRects.set(sessionUser.id, newRect)
        _this.advDynamicTexture.addControl(newRect)
    }

    DeleteViewerEventCallback(event: DeleteViewerEvent){
        const _this = CollaboratorUserInfoUI.instance as CollaboratorUserInfoUI
        const sessionUser = event.sessionUserInfo

        if(!_this.viewerRects.has(sessionUser.id)){
            console.warn("Viewer info to delete does not exist!")
            return;
        }

        const rect = _this.viewerRects.get(sessionUser.id) as Rectangle
        _this.viewerRects.delete(sessionUser.id)
        _this.advDynamicTexture?.removeControl(rect)
    }

    Init(){
        const _this = this

        const collabCont = this.advDynamicTexture.getControlByName("Collaborators_Container") as Control
        collabCont.isEnabled = false

        //Get Base menu Element
        this.baseViewerRect = this.advDynamicTexture.getControlByName("Collaborator_BaseElement_Container") as Rectangle
        //Set Base Menu Element to invisible
        if(!this.baseViewerRect){
            throw("Base Viewer Container is Null!")
        }
        this.baseViewerRect.isVisible = false
        
        //Get Base Menu Parent
        this.viewerRectParent = this.baseViewerRect.parent as Rectangle | null

        //Set collaboration button background to invisible
        this.viewerToggleRect = this.advDynamicTexture.getControlByName("ShowCollaborators_Container") as Rectangle
        if(!this.viewerRects){
            throw("Viewer Toggle Container is Null!")
        }
        const icon = this.viewerToggleRect.children[0] as Image
        icon.onPointerDownObservable.add((unusedPointInfo, eventState)=>{
            if(unusedPointInfo){}//Suppress Warnings
            
            if(eventState.currentTarget === icon){
                _this.ToggleDisplayCollaborators()
            }
        })
        
        this.ToggleDisplayCollaborators(false);

        DC_GlobalEvents.AddCallback(NewViewerEvent.UniqueSymbol, this.NewViewerEventCallback);
        DC_GlobalEvents.AddCallback(DeleteViewerEvent.UniqueSymbol, this.DeleteViewerEventCallback);
    }

    Uninit(){
        console.log("Uninit User Info UI")
        DC_GlobalEvents.RemoveCallback(NewViewerEvent.UniqueSymbol, this.NewViewerEventCallback);
        DC_GlobalEvents.RemoveCallback(DeleteViewerEvent.UniqueSymbol, this.DeleteViewerEventCallback);
    }

    Update(){
        const _this = CollaboratorUserInfoUI.instance as CollaboratorUserInfoUI
        if(!_this.displayState){
            return
        }

        const invalidIds = new Array<number>()

        _this.viewerRects.forEach((rect: Rectangle, id: number)=>{
            const userInfo = CaptureSessionManager.instance?.GetUserInfo(id)
            if(userInfo === undefined){
                invalidIds.push(id)
                return
            }

            //Calculate world to screen point via Vector3.unproject
            //Get Rect of correspoding id,
            //Set rect top and left to match vector3.unproject value.
            const camera = _this.scene.activeCamera as Camera
            const engine = _this.scene.getEngine() as Engine
            const userPos = userInfo.position.clone() as Vector3
            userPos.y -= 0.5

            const delta = userPos.subtract(camera.position)
            if(Vector3.Dot(camera.getForwardRay(1).direction, delta) <= 0){
                rect.top = -1000
                rect.left = -1000
                return
            }

            const screenPos = Vector3.Project(
                    userPos,
                    Matrix.Identity(),
                    _this.scene.getTransformMatrix(),
                    camera.viewport.toGlobal(
                        engine.getRenderWidth(),
                        engine.getRenderHeight()
                    )
                )
            
            rect.top = screenPos.y - parseFloat(rect.height.toString()) / 2 + "px"
            rect.left = screenPos.x - parseFloat(rect.width.toString()) / 2 + "px"
        })

        invalidIds.forEach((value)=>{
            _this.viewerRects.delete(value);
        })
    }
}