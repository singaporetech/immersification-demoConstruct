/**
 * @fileoverview Deprecated!
 * TODO: Remove file and all references.
 * 
 */

import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Scene } from "@babylonjs/core";
import { CollaboratorUserInfoUI } from "./CollaboratorUserInfoUI";
import { CaptureSessionMarkerUI } from "./CaptureSessionMarkerUI";

export class CaptureSessionGUIManager{
    static instance: CaptureSessionGUIManager | null = null

    sessionInfoAdvTexture: AdvancedDynamicTexture;

    collaboratorUserInfoUI: CollaboratorUserInfoUI | null = null
    captureSessionMarkerUI: CaptureSessionMarkerUI | null = null

    constructor(){
        this.sessionInfoAdvTexture = AdvancedDynamicTexture.CreateFullscreenUI("Capture Session UI")

        if(CaptureSessionGUIManager.instance){
            //Uninit
        }
        CaptureSessionGUIManager.instance = this
    }

    async Init(scene: Scene){
        //await this.sessionInfoAdvTexture.parseFromSnippetAsync("#XVJLZH#2", false)
        await this.sessionInfoAdvTexture.parseFromURLAsync("EC_MarkerCollab_UI_v2.json", false)
        this.collaboratorUserInfoUI = new CollaboratorUserInfoUI(this.sessionInfoAdvTexture, scene)
        this.collaboratorUserInfoUI?.Init()

        this.captureSessionMarkerUI = new CaptureSessionMarkerUI(this.sessionInfoAdvTexture, scene)
        this.captureSessionMarkerUI?.Init()
    }

    Uninit(){
        this.collaboratorUserInfoUI?.Uninit()
        this.captureSessionMarkerUI?.Uninit()
    }

    Update(){
        this.collaboratorUserInfoUI?.Update()
        this.captureSessionMarkerUI?.Update()
    }
}