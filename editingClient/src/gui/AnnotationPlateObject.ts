import { Axis, Scene, Vector3 } from "@babylonjs/core";
import { Rectangle, TextBlock, Image } from "@babylonjs/gui";
import { AssetConfig, RenderConfig } from "../config";
import { AnnotationComponent } from "../roomController/objects/components/AnnotationComponent";
import { AnnotationDataManager } from "../annotationTool/AnnotationDataManager";
import { AnnotationMenuController } from "./desktop/AnnotationMenuController";
import VRAnnotationViewerMenuController from "./vr/VRAnnotationViewerMenuController";
import { SpatialUIObject } from "./UIComponents";
import { serverobjectType } from "../utilities/enums/enums";
import { ServerObjectManager } from "../roomController/ServerObjectManager";
import { VrManager } from "../modeController/vr/VrManager";

export class AnnotationPlateUIObject extends SpatialUIObject
{
    container:Rectangle;
    logoIcon: Image
    textField: TextBlock
    checkIcon: Image

    annotationComponent: AnnotationComponent;
    
    /**
     * Initializes the spatial UI plate object, and sets
     * the position and displayed text and images according to the annotation reference ID in `annotationComponent`.
     * @param objectName 
     * @param size 
     * @param position 
     * @param scene 
     */
    async init(uiTemplateUrl: string, 
        scaling: number = 1, 
        width:number = 1024, 
        height: number = 1024, 
        position: Vector3, 
        scene: Scene,
        annotationDataID?: number)
      {
        this.annotationComponent = new AnnotationComponent(annotationDataID);
        await super.init(uiTemplateUrl, scaling, width, height, position, scene);
    }

    async createMeshMenu(uiTemplateUrl: string, 
        scaling: number, 
        width:number, 
        height: number, 
        position: Vector3)
      {
        await super.createMeshMenu(uiTemplateUrl, scaling, width, height, position);
        this.container = this.advTex.getControlByName("base-container") as Rectangle;
        this.logoIcon = this.container.getChildByName("logo-icon") as Image
        this.logoIcon.isEnabled = false;
        this.textField = this.container.getChildByName("title-field") as TextBlock
        this.textField.isEnabled = false;
        this.checkIcon = this.container.getChildByName("check-icon") as Image
        this.checkIcon.isEnabled = false;

        this.container.onPointerDownObservable.add((eventData, eventState) => {
            if(eventData) {} //Suppress Warning
            if(!eventState.target) return            

            if(VrManager.instance.inVR)
            {
                var pos = new Vector3(0, 0, 0);
                var forwardDirection = this.scene.activeCamera.getDirection(Axis.Z);
                let forwardSpacing = AssetConfig.VRGUIDistanceFromCamera;
                pos = pos.copyFrom(this.scene.activeCamera.globalPosition).add(forwardDirection.scale(forwardSpacing));    
                VRAnnotationViewerMenuController.instance.SetViewerPoisiton(pos);                    
                VRAnnotationViewerMenuController.instance.OpenViewerAction();   
                VRAnnotationViewerMenuController.instance.OpenExpandedPanelAction(this.annotationComponent.annotationDataID);               
            }
            else
            {                    
                // AnnotationToolManager.instance.SetToolActionState(ActionStates.view, AnnotationMenuController.instance.UpdateSelectActionButtonState)
                AnnotationMenuController.instance.OpenAnnotationViewerAction();
                AnnotationMenuController.instance.ExpandAnnotationItemInViewerAction(this.annotationComponent.annotationDataID);   
                AnnotationMenuController.instance.CalculateGridHeight();        
            }
            this.setRenderingGroup(RenderConfig.worldSpace);
        })
        this.container.onPointerEnterObservable.add((eventData, eventState) => {
            if(eventData) {} //Suppress Warning
            if(!eventState.target) return        
            this.setRenderingGroup(RenderConfig.highlights);
        })
        this.container.onPointerOutObservable.add((eventData, eventState) => {
            if(eventData) {} //Suppress Warning
            if(!eventState.target) return        
            this.setRenderingGroup(RenderConfig.worldSpace);
        })
        
        this.updateDisplayFields();
        this.setPosition();
        this.setBillboardMode(true);
        this.setVisibility(true);
    }

    updateDisplayFields()
    {
        var logoPath;
        switch(AnnotationDataManager.instance.dataList.get(this.annotationComponent.annotationDataID).annotated_objectState_type)
        {
            case serverobjectType.model:
                {
                    logoPath = AssetConfig.objectIcon_dark;
                    break;
                }
            case serverobjectType.marker:
                {
                    logoPath = AssetConfig.markerIcon_dark
                    break;
                }
            // case serverobjectType.measurement:
            //     {
            // logoPath = config.markerIcon
            //         break;
            //     }
            default:
                {
                    logoPath = AssetConfig.missingIcon_dark;
                    break;
                }
        }

        this.logoIcon.source = logoPath;
        this.textField.text = AnnotationDataManager.instance.dataList.get(this.annotationComponent.annotationDataID).title;
        this.checkIcon.source = AnnotationDataManager.instance.dataList.get(this.annotationComponent.annotationDataID).checkStatus ?  AssetConfig.approvedIcon_color : AssetConfig.warningIcon_color;
    }

    setPosition()
    {
        var pos = new Vector3(0,0,0);
        var objectType = AnnotationDataManager.instance.dataList.get(this.annotationComponent.annotationDataID).annotated_objectState_type;
        var objectInstanceID = AnnotationDataManager.instance.dataList.get(this.annotationComponent.annotationDataID).annotated_objectState_id;
        
        switch(objectType)
        {
            case serverobjectType.model:
                {
                    pos.copyFrom(ServerObjectManager.instance.models.get(objectInstanceID).transform.position);
                    break;
                }
            case serverobjectType.marker:
                {
                    pos.copyFrom(ServerObjectManager.instance.markers.get(objectInstanceID).position);
                    break;
                }
            // case serverobjectType.measurement:
            //     {
            //         ServerObjectManager.instance.measurements.get(id).transform.position;
            //         break;
            //     }
            default:
                {
                    break;
                }
        }
        pos.y += AssetConfig.spatialUIoffset;
        
        super.setPosition(pos);
    }
}