import { Scene, Vector3 } from "@babylonjs/core";
import { VRManager } from "./VRManager";
import { vrMenuObject } from "./vrMenuObject";
import { vrMarkerToolCom_Menu_v2 } from "./vrMarkerToolCom_Menu_v2";
import { ActionStates } from "../../utils/enums";
import { EditingRoomMarkerUI_V2 } from "../gui/EditingRoomMarkerUI_V2";

export class vrMarkerToolCom extends vrMenuObject 
{
    public static instance: any;

    public editingRoomMarkerManager: EditingRoomMarkerUI_V2 | null
    public menu: vrMarkerToolCom_Menu_v2;

    public toolID = 3;
    public markerSelected = false;
    public markerID: any;



    public Update()
    {
        super.Update();

        if(!this.menu)
            return;
    }

    public Init(menuName: string, planeSize: number, scene: Scene)
    {
      super.Init(menuName, planeSize, scene);
      
      this.toolID = 3;
      this.markerSelected = false;

      this.editingRoomMarkerManager = EditingRoomMarkerUI_V2.instance;

      vrMarkerToolCom.instance = this;
    }

    public async CreateMeshMenu(jsonFilename: string, planeSize: number)
    {
      await super.CreateMeshMenu(jsonFilename, planeSize);
      this.menu = new vrMarkerToolCom_Menu_v2();
      this.menu.Init(this.advancedTexture, this.scene)
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
    
    public TryPerformAction()
    {
      super.TryPerformAction();

      switch(this.actionState)
      {
        case ActionStates.Add:
          if (this.markerSelected) 
          {
            var position_arr;
            if (VRManager.getInstance?.rightControllerRayHitInfo !== null) 
            {
                this.setMarkerSelected(false);
    
                var position = VRManager.getInstance?.rightControllerRayHitInfo.pickedPoint;
                position_arr = new Vector3(position?.x, position?.y, position?.z);
    
                if(position_arr)
                {
                  vrMarkerToolCom_Menu_v2.instance?._HandleMarkerAdd_Position(this.markerID, position_arr);
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