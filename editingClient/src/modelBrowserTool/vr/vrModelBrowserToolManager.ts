import { Scene, Vector3 } from "@babylonjs/core";
import { VrModelBrowserToolMenuController } from "../../gui/vr/VrModelBrowserToolMenuController";
import { VrManager } from "../../modeController/vr/VrManager";
import { VRMenuObject } from "../../gui/UIComponents";
import { ModelBrowserToolManager } from "../desktop/ModelBrowserToolManager";

export class vrModelBrowserToolManager extends VRMenuObject  //extends ABaseTool
{
    public static instance: any;

    public menu: VrModelBrowserToolMenuController;

    public toolID = 2;
    public modelSelected = false;
    public modelID: any; 

    // ================ Init and resets ================

    async init(uiTemplateUrl: string, 
      scaling: number = 1, 
      width:number = 1024, 
      height: number = 1024, 
      position: Vector3 = new Vector3(0,0,0), 
      scene: Scene)
    {
      super.init(uiTemplateUrl, scaling, width, height, position, scene);
      
      this.toolID = 2;
      this.modelSelected = false;
      
      vrModelBrowserToolManager.instance = this;
    }

    async createMeshMenu(uiTemplateUrl: string, 
        scaling: number, 
        width:number, 
        height: number, 
        position: Vector3)
    {
      await super.createMeshMenu(uiTemplateUrl, scaling, width, height, position);
      this.menu = new VrModelBrowserToolMenuController();
      this.menu.Init(this.advTex, this.scene, this);
      this.menu.ActivateModelMenu();
    }

    // ================ Update loop ================

    public update()
    {
      super.update();

      if(VrManager.getInstance?.inVR)
      {
        if(ModelBrowserToolManager.instance.GetupdateGhostMesh())
        {
          if(VrManager.getInstance?.rightControllerRayHitInfo !== null)
          {
            ModelBrowserToolManager.instance.ghostMesh.isVisible = true;
            ModelBrowserToolManager.instance.ghostMesh.position.copyFrom(VrManager.getInstance?.rightControllerRayHitInfo.pickedPoint);
          }
          else
          {
            var pos = VrManager.getInstance?.rightControllerRaycast?.origin;
            var dir = VrManager.getInstance?.rightControllerRaycast?.direction.scale(5);
            
            if(pos && dir)
              ModelBrowserToolManager.instance.ghostMesh.position.copyFrom(pos.add(dir));
          }
        }
      }
    }

    // ================ user actions ================

    public TryUpdateSelectedModel(modelNumber: Number)
    {
      this.modelID = modelNumber;
      this.setModelSelected(true);

      var corr = [0, 100, 0]
      ModelBrowserToolManager.instance.LoadGhostModel(this.modelID, 1, corr, this.scene);
    }
    
    public TrySpawnModel()
    {
      if ( this.modelSelected/* && VRManager.getInstance?.rightTriggerActive*/) 
      {
        this.setModelSelected(false);

        var position_arr;
        if (VrManager.getInstance?.rightControllerRayHitInfo !== null) 
        {        
          var position = VrManager.getInstance?.rightControllerRayHitInfo.pickedPoint;
          position_arr = [position?.x, position?.y, position?.z];
        }
        else
        {
          var pos = VrManager.getInstance?.rightControllerRaycast?.origin;
          var dir = VrManager.getInstance?.rightControllerRaycast?.direction.scale(5);

          if(pos && dir)
            position_arr = [pos?.x + dir?.x, pos?.y + dir?.y, pos?.z + dir?.z];
        }
        
        if(position_arr)
        {
          //Request model download will spawn the model
          ModelBrowserToolManager.instance.RequestModelDownload(this.modelID, 0, position_arr);          
          //Use delete ghost model to remove the preview
          ModelBrowserToolManager.instance.DeleteGhostModel();
        }
      }
    }

    public setModelSelected(bool: boolean)
    {
      this.modelSelected = bool;
    }
  }
