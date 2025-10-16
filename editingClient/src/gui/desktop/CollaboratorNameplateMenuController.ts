/**
 * TOOD: Double check this....the collaborator functions are all very messy. Not sure which script is for the UI, and which is for the nameplate.
 */
import { DC_GlobalEvents } from "../../utilities/delegates/GlobalEventListener";
import { AdvancedDynamicTexture, Rectangle, TextBlock} from "@babylonjs/gui";
import { Scene, Color4, Camera, Engine, Vector3, Matrix} from "@babylonjs/core";
import { ServerObjectManager } from "../../roomController/ServerObjectManager";
import { NewCollaboratorEvent, DeleteCollaboratorEvent } from "../../roomController/objects/ServerObjects";

export class CollaboratorNameplateMenuController{
    static instance: CollaboratorNameplateMenuController | null

    viewerRectParent: Rectangle | null = null
    baseViewerRect: Rectangle | null = null    
    viewerRects: Map<number, Rectangle>

    duplicatedViewersParent: Rectangle | null = null

    advDynamicTexture: AdvancedDynamicTexture | null = null
    scene: Scene | null = null

    displayState: boolean = false

    constructor(){

        this.viewerRects = new Map<number, Rectangle>()

        if(CollaboratorNameplateMenuController.instance){
            CollaboratorNameplateMenuController.instance.Uninit()
            CollaboratorNameplateMenuController.instance = null
        }
        CollaboratorNameplateMenuController.instance = this
    }

    ToggleDisplayCollaborators(isDisplayed: boolean | null = null){
        const _this = CollaboratorNameplateMenuController.instance
        if(!_this) return

        if(isDisplayed === null){
            _this.displayState = !_this.displayState
            isDisplayed = _this.displayState
        }else{
            _this.displayState = isDisplayed
        }

        //For each collaborator, enable display.
        _this.viewerRects.forEach((rect: Rectangle)=>{
            rect.isVisible = isDisplayed as boolean
        })
    }

    NewViewerEventCallback(event: NewCollaboratorEvent){
        //Create new UI Box based on thing.
        const _this = CollaboratorNameplateMenuController.instance as CollaboratorNameplateMenuController
        const userState = event.userState
        const newRect = _this.baseViewerRect?.clone() as Rectangle
        const newRectText = newRect.children[0] as TextBlock

        newRect.background = Color4.FromColor3(userState.displayColor, 1.0).toHexString()
        newRect.isVisible = _this.displayState
        newRectText.text = userState.username

        _this.viewerRects.set(userState.instanceId, newRect)
        _this.advDynamicTexture?.addControl(newRect)
    }

    DeleteViewerEventCallback(event: DeleteCollaboratorEvent){
        const _this = CollaboratorNameplateMenuController.instance as CollaboratorNameplateMenuController
        const userState = event.userState

        if(!_this.viewerRects.has(userState.instanceId)){
            console.warn("UserState Info to delete does not exist!")
            return
        }

        const rect = _this.viewerRects.get(userState.instanceId) as Rectangle
        _this.viewerRects.delete(userState.instanceId)
        _this.advDynamicTexture?.removeControl(rect)
    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene){
        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        //Get Base menu Element
        this.baseViewerRect = this.advDynamicTexture.getControlByName("UserInfo_BaseElement") as Rectangle
        //Set Base Menu Element to invisible
        if(!this.baseViewerRect){
            throw("Base Viewer Container is Null!")
        }
        this.baseViewerRect.isVisible = false
        
        //Get Duplicate parent to group duplicated elements together.
        this.duplicatedViewersParent = this.advDynamicTexture.getControlByName("UserInfoDuplicates_Container") as Rectangle

        //Get Base Menu Parent
        this.viewerRectParent = this.baseViewerRect.parent as Rectangle | null
        
        this.ToggleDisplayCollaborators(false);

        DC_GlobalEvents.AddCallback(NewCollaboratorEvent.UniqueSymbol, this.NewViewerEventCallback);
        DC_GlobalEvents.AddCallback(DeleteCollaboratorEvent.UniqueSymbol, this.DeleteViewerEventCallback);
    }

    Uninit(){
        DC_GlobalEvents.RemoveCallback(NewCollaboratorEvent.UniqueSymbol, this.NewViewerEventCallback);
    }

    Update(){
        const _this = CollaboratorNameplateMenuController.instance as CollaboratorNameplateMenuController
        if(!_this.displayState){
            return
        }

        const invalidIds = new Array<number>()

        _this.viewerRects.forEach((rect: Rectangle, id: number)=>{
            const userInfo = ServerObjectManager.instance.GetUserState(id);
            if(userInfo === undefined){
                invalidIds.push(id)
                return
            }
            if(_this.scene === null){
                return
            }

            //Calculate world to screen point via Vector3.unproject
            //Get Rect of correspoding id,
            //Set rect top and left to match vector3.unproject value.
            const camera = _this.scene.activeCamera as Camera
            const engine = _this.scene.getEngine() as Engine
            const userPos = userInfo.transform.position.clone() as Vector3

            userPos.y -= 0.25

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