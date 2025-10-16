/**
 * @fileoverview
 * File to contain all base classes for UI which can either be used alone, or extended from.
 */
import { Axis, Matrix, Mesh, Nullable, Scene, Space, Vector2, Vector3} from "@babylonjs/core";
import { AdvancedDynamicTexture} from "@babylonjs/gui";
import { ActionStates } from "../utilities/enums/enums";
import { VrManager } from "../modeController/vr/VrManager";

/**
 * @classdesc
 * Defines a object that holds 3 BabylonGUI control objects to represent the
 * x, y and z axes.
 * For non-VR menus only
 */
export class Vector3UIControl {
  x: Nullable<any>;
  y: Nullable<any>;
  z: Nullable<any>;
  constructor() {
    this.x = null; //Must be a BabylonJS Control type.
    this.y = null;
    this.z = null;
  }
}


export class SpatialUIObject
{
  name: any;
  scene: Scene;
  advTex: AdvancedDynamicTexture;
  /**
   * The object mesh of the spatial object, from AdvancedDynamicTexture.
   */
  mesh: Mesh;
  
  actionState: ActionStates;

  isVisible: boolean = false;
  
  constructor()
  {
  }

  update()
  {

  }

  async init(uiTemplateUrl: string, 
          scale: number = 1, 
          width:number = 1024, 
          height: number = 1024, 
          position: Vector3 = new Vector3(0,0,0), 
          scene: Scene)
  {
    this.name = uiTemplateUrl;
    this.scene = scene;
    this.actionState = ActionStates.None;

    await this.createMeshMenu(uiTemplateUrl, scale, width, height, position);
    
    this.scene.registerBeforeRender(() =>
    {
      this.update();
    });
  }

  async createMeshMenu(uiTemplateUrl: string, 
                        scale: number, 
                        width:number, 
                        height: number, 
                        position: Vector3)
  {
    //Create the 3D object for the 2D spatial UI plane
    //Take it as 1024px = 1 world unit, so scale accordingly
    this.mesh = Mesh.CreatePlane(uiTemplateUrl, scale, this.scene);
    this.mesh.scaling.x = (width/1024) * scale 
    this.mesh.scaling.y =  (height/1024) * scale
    this.mesh.position.x = position.x;
    this.mesh.position.y = position.y;
    this.mesh.position.z = position.z;

    // this.mesh.lookAt
    // Assign the plan to the advTex for UI generation.
    // Use CreateForMesh for spatial UI
    this.advTex = AdvancedDynamicTexture.CreateForMesh(this.mesh, width, height);
    // Get the UI layout with pre-defined objects and nam es, etc from the json file.
    await this.advTex.parseFromURLAsync(uiTemplateUrl, false);
    
    this.setVisibility(false);
  }
  
  /**
   * Sets the visibile of the UI object.
   * @param isVisible true = visible, false = hidden
   */
  setVisibility(isVisible: boolean)
  {
    this.mesh.setEnabled(isVisible);
    this.mesh.isPickable = isVisible;
    this.advTex.rootContainer.isVisible = isVisible;

    if(isVisible)
    {
      this.resetLookAt();
    }
    this.isVisible = isVisible;
  }

  resetLookAt()
  {
    if(this.mesh.billboardMode == Mesh.BILLBOARDMODE_ALL)
    {
      this.mesh.rotation = new Vector3(0, 0, 0)
    }
    else
    {
      if(VrManager.instance.inVR)
      {
        this.mesh.lookAt(VrManager.instance.vrCamera.globalPosition);
      }
      else
      {
        this.mesh.lookAt(this.scene.activeCamera.globalPosition);
      }
      this.mesh.rotate(Axis.Y, Math.PI, Space.LOCAL)
    }
  }

  setBillboardMode(isBillboard: boolean, renderingGroupID?: number)
  {    
    this.setRenderingGroup(renderingGroupID);

    this.mesh.billboardMode = isBillboard ? Mesh.BILLBOARDMODE_ALL : Mesh.BILLBOARDMODE_NONE;
  }

  setPosition(position:Vector3)
  {
    this.mesh.position = position;
    this.resetLookAt();
  }

  setRenderingGroup(renderingGroupID?: number)
  {
    if (renderingGroupID === undefined)
      renderingGroupID = 0;

    this.mesh.renderingGroupId = renderingGroupID;
  }
}

/**
 * @class vrMenuObject Base vr 3D UI object that can be used to create a simple planar menu for VR in 3D space.
 */
export class VRMenuObject extends SpatialUIObject
{
    public tryPerformAction()
    {
    }
}
