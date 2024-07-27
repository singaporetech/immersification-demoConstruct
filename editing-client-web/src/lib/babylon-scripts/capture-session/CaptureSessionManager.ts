/**
 * @fileoverview Deprecated!
 * TODO: Remove file and all references.
 * 
 */

import { JoinSessionEvent, LeaveSessionEvent} from "./CaptureSessionEvents";
import { DC_GlobalEvents, DC_GlobalEventData } from "../../event-listener/GlobalEventListener";
import { SocketHandler } from "../WebSocketManager";
import { Vector3, Color3, Camera, Mesh, Scene, SceneLoader} from "@babylonjs/core";
import { Array3ToAxes } from "../../utils/ArrayTools";
import { ModelLoader } from "../ModelLoader";

export class NewViewerEvent implements DC_GlobalEventData{
    static readonly UniqueSymbol: unique symbol = Symbol("_NewViewerEvent")
    
    sessionUserInfo: SessionUserInfo
    constructor(sessionUserInfo: SessionUserInfo){
        this.sessionUserInfo = sessionUserInfo
    }

    Key(): symbol{
        return NewViewerEvent.UniqueSymbol
    }
}

export class DeleteViewerEvent implements DC_GlobalEventData{
    static readonly UniqueSymbol: unique symbol = Symbol("_DeleteViewerEvent")
    
    sessionUserInfo: SessionUserInfo
    constructor(sessionUserInfo: SessionUserInfo){
        this.sessionUserInfo = sessionUserInfo
    }

    Key(): symbol {
        return DeleteViewerEvent.UniqueSymbol
    }
}

export class NewMarkerEvent implements DC_GlobalEventData{
    static readonly UniqueSymbol: unique symbol = Symbol("_NewMarkerEvent")
    
    markerInfo: Marker
    constructor(markerInfo: Marker){
        this.markerInfo = markerInfo
    }

    Key(): symbol{
        return NewMarkerEvent.UniqueSymbol
    }
}

export class DeleteMarkerEvent implements DC_GlobalEventData{
    static readonly UniqueSymbol: unique symbol = Symbol("_DeleteMarkerEvent")
    static readonly Key = "DeleteMarkerEvent"

    idToDelete: number
    constructor(id: number){
        this.idToDelete = id
    }

    Key(): symbol{
        return DeleteMarkerEvent.UniqueSymbol
    }
}

export class ReconstructionMetadata{
    reconstructionId: string
    reconstructionVersion: string

    constructor(reconId: string, reconVer: string){
        this.reconstructionId = reconId
        this.reconstructionVersion = reconVer
    }
}

export class SessionUserInfo{

    static UserType={
        Host: 1,
        Viewer: 2
    }

    id: number
    userType: number
    displayName: string
    displayColor: Color3
    position: Vector3
    rotation: Vector3
    deleted: boolean
    mesh: Mesh | null

    constructor(id: number, userType: number, displayName:string, displayColor: Array<number> = [0.2, 0.2, 0.2]){
        this.id = id
        this.userType = userType
        this.displayName = displayName
        this.displayColor = new Color3(displayColor[0], displayColor[1], displayColor[2])
        this.position = new Vector3(0, 0, 0)
        this.rotation = new Vector3(0, 0, 0)
        this.deleted = false
        this.mesh = null
    }

    Delete(){
        this.mesh?.dispose()
        this.mesh = null
    }
}

export class Marker{
    static MarkerActions = {
        update: 0,
        create: 1,
        delete: 2
    }

    id: number
    position: Vector3
    normal: Vector3
    type: number
    visibility: boolean
    is_dirty: boolean

    constructor(id: number, position: Vector3, normal: Vector3, type: number, visibility: boolean){
        this.id = id
        this.position = position
        this.normal = normal
        this.type = type
        this.visibility = visibility
        this.is_dirty = false
    }

    ToServerFormat(){
        return {
            id: this.id,
            position: Array3ToAxes.ToArray(this.position),
            normal: Array3ToAxes.ToArray(this.normal),
            type: this.type,
            visibility: this.visibility
        }
    }
}

export class CaptureSessionManager{
    static NotificationCode={
        UpdatedModelVersion: 1,
        ClosedRoom: 2,
        CreatedMarker:  3,
        DeletedUser: 4
    }

    static instance: CaptureSessionManager | null

    private roomId: number | null = null
    private modelId: string | null = null
    private version: string | null = null
    
    private host: SessionUserInfo | null
    private thisViewer: SessionUserInfo | null
    private viewers: Map<number, SessionUserInfo> = new Map()// Array of editing client viewers
    private markers: Map<number, Marker> = new Map()

    private readonly networkUpdateInterval = 50
    private intervalFuncId: any = null
    private camera: Camera
    private scene: Scene
    private reconstructedMesh: Mesh | null = null

    private isInSession: boolean = false

    constructor(camera: Camera, scene: Scene){
        if(CaptureSessionManager.instance){
            CaptureSessionManager.instance.Uninit()
            CaptureSessionManager.instance = null
        }
        CaptureSessionManager.instance = this

        this.host = null
        this.thisViewer = null

        this.camera = camera
        this.scene = scene
    }

    Init(){
        //Subscribe to event listeners
        DC_GlobalEvents.AddCallback(JoinSessionEvent.UniqueSymbol, this._JoinEventCallback)
        DC_GlobalEvents.AddCallback(LeaveSessionEvent.UniqueSymbol, this._LeaveEventCallback)
    }

    Uninit(){
        CaptureSessionManager.instance = null

        //Unsubscribe from event listeners
        DC_GlobalEvents.RemoveCallback(JoinSessionEvent.UniqueSymbol, this._JoinEventCallback)
        DC_GlobalEvents.RemoveCallback(LeaveSessionEvent.UniqueSymbol, this._LeaveEventCallback)
        
        const ShutdownWebsocket = function(){
            SocketHandler.instance.CloseConnection()
        }
        
        //If in room, leave room
        if(this.isInSession){
            SocketHandler.SendData(SocketHandler.CodeToServer.CaptureServer_LeaveSession, {"session_id": this.roomId}, ShutdownWebsocket)
            clearInterval(this.intervalFuncId)
            //this._LeaveEventCallback(new LeaveSessionEvent())
            this.intervalFuncId = null
        }
    }

    UpdateHostInfo(hostData:{
        id: number,
        username: string,
        position: Array<number>
        rotation: Array<number>
    }){
        const host = this.host as SessionUserInfo

        if(host.id != hostData.id){
            console.warn("Host ID Mismatch")
            host.id = hostData.id
        }

        host.displayName = hostData.username
        host.position = Array3ToAxes.ToBabylonVec3(hostData.position)
        host.rotation = Array3ToAxes.ToBabylonVec3(hostData.rotation)
        
        if(host.mesh){
            host.mesh.position = host.position
            host.mesh.rotation = host.rotation
        }
    }

    UpdateUserInfos(userList: Array<{
        id: number,
        username: string,
        color: Array<number>
        position: Array<number>,
        rotation: Array<number>,
        deleted: boolean,
    }>){
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        const deleteList: Array<number> = new Array()

        userList.forEach((userInfo)=>{
            let viewer : SessionUserInfo | null = null
            
            if(this.thisViewer?.id === userInfo.id){
                return
            }
            if(this.host?.id === userInfo.id){
                return
            }

            //Create User Info if it does not exist
            if(!_this.viewers.has(userInfo.id)){
                viewer = new SessionUserInfo(userInfo.id,SessionUserInfo.UserType.Viewer, userInfo.username, userInfo.color) as SessionUserInfo

                SceneLoader.ImportMeshAsync("", "/loadAsset/model/", "pc_avatar_v3.obj", _this.scene).then(function(meshData){
                    if(!viewer) return;
    
                    viewer.mesh = meshData.meshes[0] as Mesh

                    viewer.mesh.scaling = new Vector3(0.2, 0.2, 0.2)

                    viewer.mesh.position = viewer.position
                    viewer.mesh.rotation = viewer.rotation
                })
                
                _this.viewers.set(userInfo.id, viewer)
                DC_GlobalEvents.Invoke(new NewViewerEvent(viewer))
            }else{
                viewer = _this.viewers.get(userInfo.id) as SessionUserInfo
            }

            if(userInfo.deleted){
                deleteList.push(viewer.id);
                
                viewer.deleted = userInfo.deleted
                viewer.mesh?.dispose();
                viewer.mesh = null

                DC_GlobalEvents.Invoke(new DeleteViewerEvent(viewer))
            }

            viewer.displayName = userInfo.username
            viewer.position = Array3ToAxes.ToBabylonVec3(userInfo.position)
            viewer.rotation = Array3ToAxes.ToBabylonVec3(userInfo.rotation)

            if(viewer.mesh){
                viewer.mesh.position = viewer.position
                viewer.mesh.rotation = viewer.rotation
            }
        })

        deleteList.forEach((id)=>{
            _this.viewers.delete(id)
        })
    }

    UpdateMarkerInfos(markerList: Array<{
        id: number,
        position: Array<number>,
        normal: Array<number>,
        type: number,
        visibility: boolean,
        mark_delete: boolean
    }>){
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        const deleteList: Array<number> = new Array()
        markerList.forEach((marker)=>{
            //If Marker does not exist create
            if(!_this.markers.has(marker.id)){
                const newMarker = new Marker(
                    marker.id,
                    Array3ToAxes.ToBabylonVec3(marker.position),
                    Array3ToAxes.ToBabylonVec3(marker.normal),
                    marker.type,
                    marker.visibility
                )
                _this.markers.set(marker.id, newMarker)
                DC_GlobalEvents.Invoke(new NewMarkerEvent(newMarker))
            }
            
            //If Marked delete, delete and end early.
            if(marker.mark_delete){
                deleteList.push(marker.id)
                DC_GlobalEvents.Invoke(new DeleteMarkerEvent(marker.id))
                return;
            }

            //If Marker exists Update
            const currMarker = _this.markers.get(marker.id) as Marker
            currMarker.position = Array3ToAxes.ToBabylonVec3(marker.position)
            currMarker.normal = Array3ToAxes.ToBabylonVec3(marker.normal)
            
            if(currMarker.type != marker.type || currMarker.visibility != marker.visibility){
                currMarker.is_dirty = true
                currMarker.type = marker.type
                currMarker.visibility = marker.visibility 
            }
        })

        deleteList.forEach((value: number)=>{
            _this.markers.delete(value)
        })
    }

    HandleSessionEvents(jsonData: any){
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        const events: Array<number> = jsonData.events

        events.forEach(notificationCode => {
            switch(notificationCode){
                case CaptureSessionManager.NotificationCode.UpdatedModelVersion:
                    _this.modelId = jsonData.model_id
                    _this.version = jsonData.version
                    _this.reconstructedMesh?.dispose()
                    _this.reconstructedMesh = null
                    _this.LoadReconstructedMesh()
                    break;
                case CaptureSessionManager.NotificationCode.ClosedRoom:
                    _this._LeaveEventCallback(new LeaveSessionEvent())
                    break;
            }
        });
    }

    LoadReconstructedMesh(){
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        const setMesh = function(mesh: Mesh){
            mesh.metadata = new ReconstructionMetadata(_this.modelId as string, _this.version as string)
            _this.reconstructedMesh = mesh
        }
        ModelLoader.DirectModelDownload(this.modelId as string, this.version as string, setMesh, this.scene);
    }

    RequestCreateMarker(position: Vector3, normal: Vector3, type: number, visibility: boolean = true){
        const newMarker = new Marker(-1, position, normal, type, visibility);
        const sendData = {
            marker_info: newMarker.ToServerFormat(),
            session_id: this.roomId,
            action: Marker.MarkerActions.create
        }

        SocketHandler.SendData(SocketHandler.CodeToServer.CaptureServer_MarkerUpdate, sendData)
    }

    RequestDeleteMarker(markerId: number){
        if(!this.markers.has(markerId)){
            console.warn("Tried to delete non-existant marker ID")
        }
        const sendData = {
            marker_info: this.markers.get(markerId)?.ToServerFormat(),
            action: Marker.MarkerActions.delete,
            session_id: this.roomId
        }
        SocketHandler.SendData(SocketHandler.CodeToServer.CaptureServer_MarkerUpdate, sendData)
    }

    GetUserInfo(id: number){
        return this.viewers.get(id)
    }

    GetMarkerInfo(id: number){
        return this.markers.get(id)
    }

    _SendServerUpdate(){
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        const thisViewer = _this?.thisViewer as SessionUserInfo

        thisViewer.position = _this.camera.position
        thisViewer.rotation = _this.camera.absoluteRotation.toEulerAngles()

        const sendData = {
            room_id: _this.roomId,
            user_id: thisViewer.id,
            user_type: thisViewer.userType,
            user_position: Array3ToAxes.ToArray(thisViewer.position),
            user_rotation: Array3ToAxes.ToArray(thisViewer.rotation)
        }

        SocketHandler.SendData(SocketHandler.CodeToServer.CaptureServer_UserUpdate, sendData)
    }

    _ReceiveServerUpdate(jsonData:{
        host_info: any,
        viewer_infos: Array<any>,
        marker_infos: Array<any>,
        events: Array<number>
    }){
        const _this = CaptureSessionManager.instance as CaptureSessionManager

        _this.UpdateHostInfo(jsonData.host_info)
        _this.UpdateUserInfos(jsonData.viewer_infos)
        _this.UpdateMarkerInfos(jsonData.marker_infos)

        if(jsonData.events.length > 0){
            _this.HandleSessionEvents(jsonData)
        }
    }

    _JoinEventCallback(event: JoinSessionEvent){
        if(!CaptureSessionManager.instance){
            console.warn("CaptureSessionManager instance is null/undefined")
        }
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        
        if(_this.isInSession){
            console.log("Must Leave Current Session First!")
            return
        }else{
            _this.isInSession = true
        }
        
        const GenRandColor = function(){
            return [
                Math.random(),
                Math.random(),
                Math.random()
            ]
        }

        const GenRandName = function(){
            const names: Array<string> = [
                "Andy", "Benson", "Connor", "David", "Eileen", "Fender", "Garry", "Henderson", "Ipsy", "Jean", "Ken", "Larry", "Marilyn", "Noot"
            ]
            return names[Math.round(Math.random() * (names.length))]
        }

        const sendData = {
            session_id: event.captureRoomId,
            username: GenRandName(),
            color: GenRandColor()
        }
        const wsCallback = function(jsonData: {
            success: string
            reason: string
            model_id: string
            version: string
            user_id: number
            host_info: {
                id: number,
                username: string,
                position: Array<number>,
                rotation: Array<number>
            }
            marker_info: Array<{
                id: number,
                position: Array<number>,
                normal: Array<number>,
                type: number,
                visibility: boolean,
                mark_delete: boolean
            }>
        }){
            if(jsonData.success === "false"){
                console.log("Join Session Failed, reason: ", jsonData.reason)
                _this.isInSession = false
                return
            }
            console.log("Successfully connected: ", _this.modelId)
            console.log("Joined as user id: ", jsonData.user_id)
            
            const host_info = jsonData.host_info
            _this.host = new SessionUserInfo(host_info.id, SessionUserInfo.UserType.Host, host_info.username)
            _this.host.position = Array3ToAxes.ToBabylonVec3(host_info.position)
            _this.host.rotation = Array3ToAxes.ToBabylonVec3(host_info.rotation)
            
            SceneLoader.ImportMeshAsync("", "/loadAsset/model/", "pc_avatar_v3.glb", _this.scene).then(function(meshData){
                if(!_this.host) return;

                _this.host.mesh = meshData.meshes[0] as Mesh

                _this.host.mesh.scaling = new Vector3(0.15, 0.15, 0.15)
                _this.host.mesh.position = _this.host.position
                _this.host.mesh.rotation = _this.host.rotation
            })

            _this.roomId = event.captureRoomId
            _this.modelId = jsonData.model_id
            _this.version = jsonData.version

            if(_this.version != "0"){
                _this.LoadReconstructedMesh();
            }
            
            jsonData.marker_info.forEach((markerJson) => {
                const newMarker = new Marker(
                    markerJson.id,
                    Array3ToAxes.ToBabylonVec3(markerJson.position),
                    Array3ToAxes.ToBabylonVec3(markerJson.normal),
                    markerJson.type,
                    markerJson.visibility
                )
                _this.markers.set(newMarker.id, newMarker)
                DC_GlobalEvents.Invoke(new NewMarkerEvent(newMarker))
            });
            

            _this.thisViewer = new SessionUserInfo(jsonData.user_id, SessionUserInfo.UserType.Viewer, "John Doe")
            _this.intervalFuncId = setInterval(_this._SendServerUpdate, _this?.networkUpdateInterval)
        }

        SocketHandler.SendData(SocketHandler.CodeToServer.CaptureServer_JoinSession, sendData, wsCallback)
    }

    _LeaveEventCallback(event: LeaveSessionEvent){
        if(event){}//Suppress Warnings
        if(!CaptureSessionManager.instance){
            console.log("CaptureSessionManager instance is null/undefined")
        }
        const _this = CaptureSessionManager.instance as CaptureSessionManager
        
        if(!_this.isInSession){
            console.log("Not currently in session!")
            return
        }
        
        const sendData = {session_id: _this.roomId}
        const wsCallback = function(jsonData:{
            success: string
            reason: string
        }){
            _this.isInSession = false
            if(jsonData.success === "false"){
                console.log("Reason: ", jsonData.reason);
                return
            }

            //Regardless of leave room succeeds, clear scene data.
            _this.host?.Delete()
            _this.host = null

            _this.viewers.forEach((viewer)=>{
                viewer.Delete()
            })
            _this.viewers.clear()
            _this.reconstructedMesh?.dispose()
            _this.reconstructedMesh = null
        }
        SocketHandler.SendData(SocketHandler.CodeToServer.CaptureServer_LeaveSession, sendData, wsCallback)
        
        clearInterval(_this?.intervalFuncId)
    }
}