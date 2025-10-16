/**
 * @fileoverview
 * Manages the behaviour that occurs when meshes are picked.
 */
import 
{
  Mesh,
  PointerEventTypes,
  Color3,
  Scene,
  PickingInfo,
  HighlightLayer
} from "@babylonjs/core";
import { ServerObjectManager } from "../roomController/ServerObjectManager";
import { ABaseTool } from "../tool/ABaseTool";
import { ColorScheme } from "../utilities/ColorScheme";
import { ServerModelMetadata } from "../utilities/data/ObjectsData";
import { EventData, EventListener } from "../utilities/delegates/EventListener";
import { VrManager } from "../modeController/vr/VrManager";
import { GaussianSplattingMesh } from "babylonjs";
import { renderState } from "../utilities/enums/enums";
import { DualStateHelper } from "../dualState/dualStateHelper";

export class SelectMeshEvent implements EventData
{
  public selectedModel: Mesh


  constructor(model: Mesh)
  {
    this.selectedModel = model
  }
}

export class DeselectMeshEvent implements EventData
{
  public deselectedModel: Mesh

  constructor(model: Mesh){
    this.deselectedModel = model
  }
}

/**
 * @description
 * Singleton class that handles what object is usedfor manipulation.
 */
export class ObjectPickingManager extends ABaseTool 
{
  public static instance: ObjectPickingManager | null = null;
  public static get ActiveInstance(): ObjectPickingManager | null
  {
    return ObjectPickingManager.instance
  }

  hoverObject: Mesh | null;
  pickedObject: Mesh | null;
  enterHover: boolean;
  
  onSelectListener: EventListener<SelectMeshEvent>
  onDeselectListener: EventListener<DeselectMeshEvent>

  onPick: ((pickInfo: PickingInfo)=>void) | null = null
  onPickOverride: (()=>void) | null = null

  hlLayer: HighlightLayer;

  constructor() 
  {
    super()
    this.pickedObject = null;
    this.hoverObject = null;
    this.enterHover = false;

    this.onSelectListener = new EventListener<SelectMeshEvent>
    this.onDeselectListener = new EventListener<DeselectMeshEvent>

    ObjectPickingManager.instance = this;
  }  

  Init(scene: Scene)
  {
    const _this = this
    _this.hlLayer = new HighlightLayer("hl1", scene,
      {
      mainTextureFixedSize: 256,
      blurHorizontalSize: 0.7,
      blurVerticalSize: 0.7,
    });
    _this.hlLayer.outerGlow = true;
    _this.hlLayer.innerGlow = false;
    scene.onPointerObservable.add((pointInfo) => 
      {
      if(pointInfo.type === PointerEventTypes.POINTERPICK)
      {        
        if(pointInfo.pickInfo?.hit)
        {
          if(_this.hoverObject !== null)
            DualStateHelper.instance.ToggleModelState(_this.hoverObject, renderState.gaussianOnly);

          if(!VrManager.getInstance?.inVR)
          {
            ObjectPickingManager.instance?.SelectObject(pointInfo.pickInfo.pickedMesh);
          
            if(_this.onPick)
              {
              _this.onPick(pointInfo.pickInfo)
            }
          }
        }
      }
      // if(pointInfo.type === PointerEventTypes.POINTERMOVE)
      // {
      //   if(_this.pickedObject != null) // is picking so stop condition
      //     return
        
      //   const pickResult: PickingInfo = scene.pick(scene.pointerX, scene.pointerY);

      //   if(pickResult.hit)
      //   {
      //     _this.enterHover = true;
          
      //     if(pickResult.pickedMesh === _this.hoverObject) // same object so dont loop
      //       return;
      //     else // not same object
      //     {
      //       if(_this.hoverObject !== null) //reset old object first if have
      //       {
      //         DualStateHelper.instance.ToggleModelState(_this.hoverObject, renderState.gaussianOnly)   
      //       }

      //       //proceed to apply to new object
      //       _this.hoverObject = pickResult.pickedMesh as Mesh;
      //       DualStateHelper.instance.ToggleModelState(_this.hoverObject, renderState.meshOnly)   
      //       console.log(_this.hoverObject);
      //     }
      //   }
      //   else if(!pickResult.hit)
      //   {
      //     if(_this.hoverObject !== null)
      //     {
      //       console.log("QGUUUUX!");
      //       DualStateHelper.instance.ToggleModelState(_this.hoverObject, renderState.gaussianOnly)   
      //       _this.hoverObject = null;
      //       console.log(pointInfo.pickInfo.pickedMesh);
      //     }
      //   }
      // }
    });
  }
  
  public SetToolActionState(actionState?: number, callback?: (result?: any) => void): void 
  {
    throw new Error("Method not implemented.");
  }
  
  public DeselectTool() 
  {
    return
  }
  

  static GetSelectedObject()
  {
    if(ObjectPickingManager.instance && ObjectPickingManager.instance.pickedObject){
      return ObjectPickingManager.instance.pickedObject
    }else{
      return null
    }
  }
  
  /**
   * Checks if a mesh is currently picked.
   * @returns {bool} - True of there is currently a picked object.
   */
  HasSelection() 
  {
    if (this.pickedObject !== null && this.pickedObject !== undefined) 
      {
      return true;
    }
    return false;
  }

  /**
   * Private function to check if picked mesh is same as input object.
   * @param {*} object - object to compare agaisnt/
   * @returns {bool} - True of pickedObject and object are the same.
   */
  public IsSameSelection(object: any)
   {
    if (this.HasSelection()) 
      {
      return this.pickedObject === object;
    }
    return false;
  }

  /**
   * Private Helper function to check if object is a Mesh type
   * @param {*} object - Any object type.
   * @returns true of object is type of Mesh.
   */
  _IsMesh(object: any) 
  {
    if(object instanceof Mesh || object instanceof GaussianSplattingMesh)
      return true
    return false;
    // return object instanceof Mesh;
  }

  /**
   * Clears picked selection to none and calls associated classes to deselect mesh.
   */
  ClearSelection() 
  {
    //Call Relevant classes to update selection State.
    if (!this.HasSelection()) 
      {
      console.warn(
        "Aborting. Clear Selection Called when no object was picked"
      );
      return;
    }
    if(!this.pickedObject)
      {
      return
    }

    // this.pickedObject.renderOverlay = false;  
    // this.hlLayer.removeMesh(this.pickedObject);
    this.hlLayer.removeAllMeshes();

    if (this.pickedObject.metadata != null && this.pickedObject.metadata instanceof ServerModelMetadata)
    {
      var modelState = ServerObjectManager.instance.GetModelState(this.pickedObject.metadata.typeInstanceID)
      var gsMesh = modelState.gsMesh;

      if(gsMesh === null || gsMesh === undefined)
      {
        DualStateHelper.instance.ToggleModelState(this.pickedObject, renderState.meshOnly)
      }
      else
      {
        DualStateHelper.instance.ToggleModelState(this.pickedObject, renderState.gaussianOnly)
      } 

      this.onDeselectListener.Invoke(new DeselectMeshEvent(this.pickedObject));
      ServerObjectManager.instance.ClearPickedModel();
    }

    this.pickedObject = null;
  }

  /**
   * Sets a new mesh selection after ensuring that it is a mesh type.
   * Calls associated functions to inform of new selection.
   * @param {*} targetObject - Object to set as selected.
   */
  SelectObject(object: any) 
  {
    if (!this._IsMesh(object)) 
    {
      return;
    }

    //Selecting same object. Clear selection and exit function.
    if (this.IsSameSelection(object)) // already selected, deselect
    {
      this.ClearSelection();
      return;
    }
    //New Selection
    //Clear current selection first
    if (this.HasSelection())
    {
      this.ClearSelection();
    }
    //Select Object For Each Component Here.
    if (object.metadata != null && object.metadata instanceof ServerModelMetadata && object.metadata.editable)
    {
      DualStateHelper.instance.ToggleModelState(object, renderState.meshOnly)    
      
      var modelState = ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID)
      var mesh = modelState.mesh;  
      // mesh.renderOverlay = true;
      // mesh.overlayColor = Color3.FromHexString(ColorScheme.GetPurpleScale(1));

      this.hlLayer.addMesh(mesh, Color3.FromHexString(ColorScheme.GetPurpleScale(1)));

      this.onSelectListener.Invoke(new SelectMeshEvent(mesh))
      ServerObjectManager.instance.SetPickedModel(mesh.metadata.typeInstanceID);
    }
    this.pickedObject = mesh;
    // ServerObjectManager.instance.SetPickedModel(object.metadata.typeInstanceID);
  }

  ClearOnPickFunction()
  {
    if(this.onPick)
      {
      this.onPick = null;
    }
    if(this.onPickOverride)
      {
      this.onPickOverride = null
    }
  }

  AssignOnPickFunction(onPick: ((pickInfo: PickingInfo)=>void), onPickOverride: (()=>void) | null = null) 
  {
    if(this.onPickOverride != null){
      this.onPickOverride()
    }
    this.onPick = onPick
    this.onPickOverride = onPickOverride
  }
}
