/**
 * @fileoverview
 * Manages the behaviour that occurs when meshes are picked.
 */
import {
  Mesh,
  PointerEventTypes,
  Color3,
  Scene,
  PickingInfo
} from "@babylonjs/core";
import { ColorScheme } from "./ColorScheme";
import { ServerModelMetadata } from "./ModelLoader";
import { ServerObjectManager } from "./ServerObjectManager";
import { DC_EventData, DC_EventListener } from "../event-listener/EventListener";
import { VRManager } from "./vr/VRManager";

export class SelectModelEvent implements DC_EventData{
  public selectedModel: Mesh

  constructor(model: Mesh){
    this.selectedModel = model
  }
}

export class DeselectModelEvent implements DC_EventData{
  public deselectedModel: Mesh

  constructor(model: Mesh){
    this.deselectedModel = model
  }
}

export class PickingManager {
  private static instance: PickingManager | null = null;
  public static get ActiveInstance(): PickingManager | null{
    return PickingManager.instance
  }

  pickedObject: Mesh | null;
  
  onSelectListener: DC_EventListener<SelectModelEvent>
  onDeselectListener: DC_EventListener<DeselectModelEvent>

  onPick: ((pickInfo: PickingInfo)=>void) | null = null
  onPickOverride: (()=>void) | null = null

  static GetSelectedObject(){
    if(PickingManager.instance && PickingManager.instance.pickedObject){
      return PickingManager.instance.pickedObject
    }else{
      return null
    }
  }

  constructor() {
    this.pickedObject = null;

    this.onSelectListener = new DC_EventListener<SelectModelEvent>
    this.onDeselectListener = new DC_EventListener<DeselectModelEvent>

    PickingManager.instance = this;
  }

  /**
   * Checks if a mesh is currently picked.
   * @returns {bool} - True of there is currently a picked object.
   */
  HasSelection() {
    if (this.pickedObject !== null && this.pickedObject !== undefined) {
      return true;
    }
    return false;
  }

  /**
   * Private function to check if picked mesh is same as input object.
   * @param {*} object - object to compare agaisnt/
   * @returns {bool} - True of pickedObject and object are the same.
   */
  #IsSameSelection(object: any) {
    if (this.HasSelection()) {
      return this.pickedObject === object;
    }
    return false;
  }

  /**
   * Private Helper function to check if object is a Mesh type
   * @param {*} object - Any object type.
   * @returns true of object is type of Mesh.
   */
  #IsMesh(object: any) {
    return object instanceof Mesh;
  }

  /**
   * Clears picked selection to none and calls associated classes to deselect mesh.
   */
  ClearSelection() {
    //Call Relevant classes to update selection State.
    if (!this.HasSelection()) {
      console.warn(
        "Aborting. Clear Selection Called when no object was picked"
      );
      return;
    }
    if(!this.pickedObject){
      return
    }

    this.pickedObject.renderOverlay = false;

    if (this.pickedObject.metadata != null && this.pickedObject.metadata instanceof ServerModelMetadata)
    {
      this.onDeselectListener.Invoke(new DeselectModelEvent(this.pickedObject));
      ServerObjectManager.instance.ClearPickedModel();
    }

    this.pickedObject = null;
  }

  /**
   * Sets a new mesh selection after ensuring that it is a mesh type.
   * Calls associated functions to inform of new selection.
   * @param {*} object - Object to set as selected.
   */
  SelectObject(object: any) {
    if (!this.#IsMesh(object)) 
      return;

    //Selecting same object. Clear selection and exit function.
    if (this.#IsSameSelection(object))
      {
      this.ClearSelection();
      return;
    }

    //New Selection
    if (this.HasSelection())
      {
      this.ClearSelection();
    }

    //Select Object For Each Component Here.
    if (object.metadata != null && object.metadata instanceof ServerModelMetadata && object.metadata.editable)
    {
      object.renderOverlay = true;
      object.overlayColor = Color3.FromHexString(ColorScheme.GetPurpleScale(1));
      
      this.onSelectListener.Invoke(new SelectModelEvent(object))
      ServerObjectManager.instance.SetPickedModel(object.metadata.instanceId);
    }

    this.pickedObject = object;
  }

  ClearOnPickFunction(){
    if(this.onPick){
      this.onPick = null;
    }
    if(this.onPickOverride){
      this.onPickOverride = null
    }
  }

  AssignOnPickFunction(onPick: ((pickInfo: PickingInfo)=>void), onPickOverride: (()=>void) | null = null) {
    if(this.onPickOverride != null){
      this.onPickOverride()
    }
    this.onPick = onPick
    this.onPickOverride = onPickOverride
  }

  Init(scene: Scene) {
    const _this = this
    scene.onPointerObservable.add((pointInfo) => {
      if(pointInfo.type === PointerEventTypes.POINTERPICK && pointInfo.pickInfo?.hit) {

        if(!VRManager.getInstance?.getinVR())
        {
          PickingManager.instance?.SelectObject(pointInfo.pickInfo.pickedMesh);
        
          if(_this.onPick){
            _this.onPick(pointInfo.pickInfo)
          }
        }

      }
    });
  }
}
