import { Scene, Vector3 } from "@babylonjs/core";
import { MarkerMenuController } from "../../gui/desktop/MarkerMenuController";
import { VRMenuObject } from "../../gui/UIComponents";
import { ActionStates } from "../../utilities/enums/enums";
import { VrMarkerToolMenuController } from "../../gui/vr/VrMarkerToolMenuController";
import { VrManager } from "../../modeController/vr/VrManager";

export class VrMarkerToolManager extends VRMenuObject 
{
    public static instance: VrMarkerToolManager;

    public editingRoomMarkerManager: MarkerMenuController | null
    public menu: VrMarkerToolMenuController;

    public toolID = 3;
    public markerSelected = false;
    public markerID: any;

    public update()
    {
        super.update();

        if(!this.menu)
            return;
    }

    async init(uiTemplateUrl: string, 
      scaling: number = 1, 
      width:number = 1024, 
      height: number = 1024, 
      position: Vector3, 
      scene: Scene)
    {
      super.init(uiTemplateUrl, scaling, width, height, position, scene);
      
      this.toolID = 3;
      this.markerSelected = false;

      this.editingRoomMarkerManager = MarkerMenuController.instance;

      VrMarkerToolManager.instance = this;
    }

    async createMeshMenu(uiTemplateUrl: string, 
      scaling: number, 
      width:number, 
      height: number, 
      position: Vector3)
    {
      await super.createMeshMenu(uiTemplateUrl, scaling, width, height, position);
      this.menu = new VrMarkerToolMenuController();
      this.menu.Init(this.advTex, this.scene)
      this.menu.ActivateModelMenu();
    }

    public TryUpdateActionState(state: Number)
    {
      this.actionState = state as ActionStates;
    }

    public TryUpdateSelectedMarker(markerID: Number)
    {
      this.markerID = markerID;
      this.setMarkerSelected(true);
      console.log("Marker Updated after execute scene ready --->" + this.markerID);
    }
    
    public tryPerformAction()
    {
      super.tryPerformAction();
      console.log(this.actionState)
      switch(this.actionState)
      {
        case ActionStates.Add:
          if (this.markerSelected) 
          {
            var position_arr;
            if (VrManager.getInstance?.rightControllerRayHitInfo !== null) 
            {
                this.setMarkerSelected(false);
    
                var position = VrManager.getInstance?.rightControllerRayHitInfo.pickedPoint;
                position_arr = new Vector3(position?.x, position?.y, position?.z);
    
                if(position_arr)
                {
                  VrMarkerToolMenuController.instance?._HandleMarkerAdd_Position(this.markerID, position_arr);
                }
            }
          }
          console.log("Adding marker.");
          break;
        case ActionStates.Remove:
          console.log("Removing marker???.");
          break;
        case ActionStates.None:
          console.log("Action state is set to None.");
          break;
        default:
          console.log("Not supposed to happen.");
          break;
      }
    }

    public setMarkerSelected(bool: boolean)
    {
      this.markerSelected = bool;
    }
}