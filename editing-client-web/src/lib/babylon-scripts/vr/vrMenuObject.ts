import { Axis, Mesh, Scene, Space } from "@babylonjs/core";
import { AdvancedDynamicTexture} from "@babylonjs/gui";
import { VRManager } from "./VRManager";
import { ActionStates } from "../../utils/enums";

/**
 * @class vrMenuObject Base vr 3D UI object that can be used to create a simple planar menu for VR in 3D space.
 */
export class vrMenuObject
{
    private menuName: any;

    public scene: Scene;
    public advancedTexture: AdvancedDynamicTexture;
    public advTexMesh: Mesh;
    public actionState: ActionStates;
    
    _lastX: number;
    _lastY: number;
    _deltaX: number;
    _deltaY: number;  

    constructor()
    {
    }

    public Update()
    {

    }

    public TryPerformAction()
    {
    }

    public Init(menuName: string, planeSize: number, scene: Scene)
    {
      this.menuName = menuName;
      this.scene = scene;
      this.actionState = ActionStates.None;

      this._lastX = 0;
      this._lastY = 0;
      this._deltaX = 0;
      this._deltaY = 0;

      this.CreateMeshMenu(menuName, planeSize);
      
      this.scene.registerBeforeRender(() =>
      {
        this.Update();
      });
    }

    public async CreateMeshMenu(jsonFilename: string, planeSize: number)
    {
      //Create the 3D object for the 2D spatial UI plane
      this.advTexMesh = Mesh.CreatePlane(jsonFilename, planeSize, this.scene);
      this.advTexMesh.position.y = .5;

      // Assign the plan to the advTex for UI generation.
      // Use CreateForMesh for spatial UI
      this.advancedTexture = AdvancedDynamicTexture.CreateForMesh(this.advTexMesh);
      
      // Get the UI layout with pre-defined objects and nam es, etc from the json file.
      // Latest snippet UI #9YK413#22, #9YK413#23
      // await this.advancedTexture.parseFromURLAsync("editingGUI.json", false);
      await this.advancedTexture.parseFromURLAsync(jsonFilename + ".json", false);

      this.SetMenuVisibility(false);
    }
    
    public SetMenuVisibility(isVisible: boolean)
    {
      this.advTexMesh.setEnabled(isVisible);
      this.advancedTexture.rootContainer.isVisible = isVisible;

      if(isVisible)
      {
        this.advTexMesh.lookAt(VRManager.getInstance?.vrCamera.position);
        this.advTexMesh.rotate(Axis.Y, Math.PI, Space.LOCAL)
      }
    }
}
