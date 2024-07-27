import { Scene } from "@babylonjs/core";
import { VRModelBrowserToolCom_Menu_V2 } from "./VRModelBrowserToolCom_Menu_V2";
import { VRManager } from "./VRManager";
import { ModelBrowser } from "../ModelBrowser";
import { vrMenuObject } from "./vrMenuObject";

export class VRModelBrowserToolCom extends vrMenuObject 
{
    public static instance: any;

    public menu: VRModelBrowserToolCom_Menu_V2;

    public toolID = 2;
    public modelSelected = false;
    public modelID: any; 

    public Update()
    {
      super.Update();

      if(VRManager.getInstance?.getinVR())
      {
        if(ModelBrowser.instance.GetupdateGhostMesh())
        {
          if(VRManager.getInstance?.rightControllerRayHitInfo !== null)
          {
            ModelBrowser.instance.ghostMesh.isVisible = true;
            ModelBrowser.instance.ghostMesh.position.copyFrom(VRManager.getInstance?.rightControllerRayHitInfo.pickedPoint);
          }
          else
          {
            var pos = VRManager.getInstance?.rightControllerRaycast?.origin;
            var dir = VRManager.getInstance?.rightControllerRaycast?.direction.scale(5);
            
            if(pos && dir)
              ModelBrowser.instance.ghostMesh.position.copyFrom(pos.add(dir));
          }
        }
      }
    }

    public Init(menuName: string, planeSize: number, scene: Scene)
    {
      super.Init(menuName, planeSize, scene);
      
      this.toolID = 2;
      this.modelSelected = false;
      
      VRModelBrowserToolCom.instance = this;
    }

    public async CreateMeshMenu(jsonFilename: string, planeSize: number)
    {
      await super.CreateMeshMenu(jsonFilename, planeSize);

      this.menu = new VRModelBrowserToolCom_Menu_V2();
      this.menu.Init(this.advancedTexture, this.scene, this);
      this.menu.ActivateModelMenu();
    }

    public TryUpdateSelectedModel(modelNumber: Number)
    {
      this.modelID = modelNumber;
      this.setModelSelected(true);
      console.log("Updated after execute scene ready");

      var corr = [0, 100, 0]
      ModelBrowser.instance.LoadGhostModel(this.modelID, 1, corr, this.scene);
    }
    
    public TrySpawnModel()
    {
      if ( this.modelSelected/* && VRManager.getInstance?.rightTriggerActive*/) 
      {
        this.setModelSelected(false);

        var position_arr;
        if (VRManager.getInstance?.rightControllerRayHitInfo !== null) 
        {        
          var position = VRManager.getInstance?.rightControllerRayHitInfo.pickedPoint;
          position_arr = [position?.x, position?.y, position?.z];
        }
        else
        {
          var pos = VRManager.getInstance?.rightControllerRaycast?.origin;
          var dir = VRManager.getInstance?.rightControllerRaycast?.direction.scale(5);

          if(pos && dir)
            position_arr = [pos?.x + dir?.x, pos?.y + dir?.y, pos?.z + dir?.z];
        }
        
        if(position_arr)
        {
          //Request model download will spawn the model
          ModelBrowser.instance.RequestModelDownload(this.modelID, 0, position_arr);          
          //Use delete ghost model to remove the preview
          ModelBrowser.instance.DeleteGhostModel();
        }
      }
    }

    public setModelSelected(bool: boolean)
    {
      this.modelSelected = bool;
    }
  }
