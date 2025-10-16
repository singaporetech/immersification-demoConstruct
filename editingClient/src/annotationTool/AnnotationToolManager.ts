import { Scene, Vector3 } from "@babylonjs/core";
import { VRMenuObject } from "../gui/UIComponents";
import VRAnnotationToolMenuController from "../gui/vr/VRAnnotationViewerMenuController";
import { ActionStates, toolType } from "../utilities/enums/enums";
import { ABaseTool } from "../tool/ABaseTool";
import { AnnotationData } from "../utilities/data/AnnotationData";
import { AnnotationPlatesManager } from "../gui/AnnotationPlatesController";
import { ObjectPickingManager } from "../objectPickingSelection/ObjectPickingManager";
import { VrToolSelectorMenuController } from "../gui/vr/VrToolSelectorMenuController";

export class AnnotationToolManager extends ABaseTool
{
    //ID, instance, and tracking variables
    static instance: AnnotationToolManager;
    toolID = toolType.annotation;
    actionState: number = 0

    // ================ Init and resets ================

    public Init()
    {        
        this.toolID = toolType.annotation;   

        AnnotationToolManager.instance = this;
    }

        // ============ general tool functions ============

    DeselectTool()
    {
        VrToolSelectorMenuController.instance.ResetActiveToolIndex();
    }

    
    // ============ annotation actions ============

    /**
     * Set the selected action (add or remove) annotation
     */
    SetToolActionState(actionState: number, callback?: (result?: any) => void)
    {        
        const _this = AnnotationToolManager.instance;

        actionState = Math.round(actionState)
        if(actionState < 0 || actionState > 2){
            console.warn("Invalid State Number Entered!")
            return
        }
        _this.actionState = actionState;

        ObjectPickingManager.ActiveInstance?.ClearOnPickFunction()

        switch(_this.actionState){
            case ActionStates.None: 
                break;
            case ActionStates.Add:
                console.log("Setting add state");
                // _this.AssignOnPickAction();
                break;
            case ActionStates.Remove:
                console.log("Setting remove state");
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
        }

        if (callback) {
            callback();
        }
    }
}