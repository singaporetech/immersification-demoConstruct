/**
 * @fileoverview
 * Helps track and define the parent/child relationship of models
 * TODO: Overhual in progress, is not properly implemented
 * 
 */

import { ServerObjectManager } from "./ServerObjectManager";
import { PickingManager } from "./PickingManager";
import { ModelState } from "./ServerObjects";
import { DC_EventListener, DC_EventData} from "../event-listener/EventListener";

export class UpdatedHierarchyEvent implements DC_EventData{
  objectCount: number
  
  constructor(objectCount: number){
    this.objectCount = objectCount
  }
}

class StateInfo {
  modelState: ModelState;
  directChildren: number;
  totalChildren: number;
  childDepth: number;
  markDelete: boolean;
  constructor(modelState: ModelState) {
    this.modelState = modelState;
    this.directChildren = 0;
    this.totalChildren = 0;
    this.childDepth = 0;

    this.markDelete = false;
  }
}

export class ObjectHierarchy {
  private static instance: ObjectHierarchy;
  public static get ActiveInstance(){
    return ObjectHierarchy.instance
  }
  
  onUpdateHierarchyListener: DC_EventListener<UpdatedHierarchyEvent>

  stateInfos: StateInfo[];
  createdIds: Map<any, any>;
  deletedInfo: boolean;

  constructor() {
    this.stateInfos = [];
    this.createdIds = new Map();

    this.deletedInfo = false

    this.onUpdateHierarchyListener = new DC_EventListener<UpdatedHierarchyEvent>()

    ObjectHierarchy.instance = this;
  }

  GetStateInfoIndex(instanceId: number) {
    return this.stateInfos.findIndex(
      (info) => info.modelState.instanceId === instanceId
    );
  }

  ClearData() {
    PickingManager.ActiveInstance?.ClearSelection();
    this.stateInfos = [];
    this.createdIds.clear();
    this.onUpdateHierarchyListener.Invoke(new UpdatedHierarchyEvent(this.stateInfos.length))
  }

  //Recalculates parent depths for all child state Infos
  //Assumes child states are direct/indirect children of stateInfo.
  #_UpdateChildDepths(stateIndex: number) {
    //Calculate childDepths for state Info
    const stateInfo = this.stateInfos[stateIndex];
    const childCount = stateInfo.totalChildren;

    for (let i = stateIndex + 1; i <= stateIndex + childCount; ++i) {
      const childState = this.stateInfos[i];
      let parentIndex = this.GetStateInfoIndex(childState.modelState.parentId);

      let count = 1;
      while (parentIndex !== stateIndex) {
        count += 1;
        const parentState = this.stateInfos[parentIndex];
        parentIndex = this.GetStateInfoIndex(parentState.modelState.parentId);
      }

      childState.childDepth = stateInfo.childDepth + count;
    }
  }

  #_RecursiveAddChildCount(childCount: number, parentInfo: StateInfo) {
    parentInfo.totalChildren += childCount;

    if (parentInfo.modelState.parentId !== -1) {
      const index = this.GetStateInfoIndex(parentInfo.modelState.parentId);
      const parentParent = this.stateInfos[index];
      this.#_RecursiveAddChildCount(childCount, parentParent);
    }
  }

  #_RecursiveCreateStateInfo(
    serverObjectManager: ServerObjectManager,
    modelState: ModelState
  ) {
    if (this.HasStateInfo(modelState.instanceId)) {
      return;
    }

    //Create stateInfo for this object;
    const currStateInfo = new StateInfo(modelState);
    this.createdIds.set(modelState.instanceId, true);

    //If no parent, simply add to end of array and return.
    if (modelState.parentId === -1) {
      this.stateInfos.push(currStateInfo);
      return;
    }

    //Get Parent State Info. If it doesn't exit, create it first.
    let parentIndex = this.GetStateInfoIndex(modelState.parentId);
    if (parentIndex === -1) {
      const parentState = serverObjectManager.GetModelState(
        modelState.parentId
      );
      this.#_RecursiveCreateStateInfo(
        serverObjectManager,
        parentState as ModelState
      );
      parentIndex = this.GetStateInfoIndex(modelState.parentId);
    }
    const parentStateInfo = this.stateInfos[parentIndex];

    //Add to child counters.
    parentStateInfo.directChildren += 1;
    this.#_RecursiveAddChildCount(1, parentStateInfo);

    currStateInfo.childDepth = parentStateInfo.childDepth + 1;

    //Insert into array by splice. Insert as last direct child.
    this.stateInfos.splice(
      parentIndex + parentStateInfo.totalChildren + 1,
      0,
      currStateInfo
    );
  }

  #IsValidModelIndex(index: number) {
    return index >= 0 && index < this.stateInfos.length;
  }

  HasStateInfo(instanceId: number) {
    return this.createdIds.has(instanceId);
  }

  ToggleModelVisibility(index: number) {
    if (!this.#IsValidModelIndex(index)) {
      console.warn("SetModelVisibility Invalid Index!");
      return;
    }
    const stateInfo = this.stateInfos[index];

    for (let i = index; i <= index + stateInfo.totalChildren; ++i) {
      this.stateInfos[i].modelState.SetVisibility();
    }
  }

  RequestDeleteModel(index: number) {
    if (!this.#IsValidModelIndex(index)) {
      console.warn("SetModelVisibility Invalid Index!");
      return;
    }

    //Delete selected modelstate and all total children under this state info.
    const stateInfo = this.stateInfos[index];
    for (let i = index; i <= index + stateInfo.totalChildren; ++i) {
      const currStateInfo = this.stateInfos[i];
      currStateInfo.modelState.MarkDelete();
      ServerObjectManager.instance.AddModifiedModel(currStateInfo.modelState);
    }
  }

  PickFromMenu(index: number) {
    if (!this.#IsValidModelIndex(index)) {
      console.warn("PickFromMenu Invalid Model Index!");
    }
    const modelState = this.stateInfos[index].modelState;
    if (modelState.mesh !== null) {
      PickingManager.ActiveInstance?.SelectObject(modelState.mesh);
    }
  }

  SetStateInfoParent(childIndex: number, parentIndex: number) {
    const childStateInfo = this.stateInfos[childIndex];

    //If parentIndex is a child of childIndex, return.
    if (
      parentIndex >= childIndex &&
      parentIndex <= childIndex + childStateInfo.totalChildren
    ) {
      return;
    }

    //If has parent, remove parent
    if (childStateInfo.modelState.parentId !== -1) {
      const oldParentIndex = this.GetStateInfoIndex(
        childStateInfo.modelState.parentId
      );
      const oldParentStateInfo = this.stateInfos[oldParentIndex];

      oldParentStateInfo.directChildren -= 1;
      this.#_RecursiveAddChildCount(
        -(childStateInfo.totalChildren + 1),
        oldParentStateInfo
      );

      childStateInfo.modelState.RemoveParentByClient();
      //Shift Child Objects out to end of array.
      const slice = this.stateInfos.slice(
        childIndex,
        childIndex + childStateInfo.totalChildren + 1
      );
      this.stateInfos.splice(childIndex, childStateInfo.totalChildren + 1);
      childIndex = this.stateInfos.length;
      this.stateInfos.push(...slice);

      //Need to recursively set child parent depths.
      childStateInfo.childDepth = 0;
      this.#_UpdateChildDepths(childIndex);
      ServerObjectManager.instance.AddModifiedModel(childStateInfo.modelState);
    }

    if (parentIndex === -1) {
      return;
    }

    //Set new parent.
    const newParentStateInfo = this.stateInfos[parentIndex];
    newParentStateInfo.directChildren += 1;
    childStateInfo.modelState.SetParentByClient(newParentStateInfo.modelState);

    if (parentIndex > childIndex) {
      parentIndex -= childStateInfo.totalChildren + 1;
    }

    //Insert into array by splice. Insert as last direct child.
    const slice = this.stateInfos.slice(
      childIndex,
      childIndex + childStateInfo.totalChildren + 1
    );
    this.stateInfos.splice(childIndex, childStateInfo.totalChildren + 1);
    this.stateInfos.splice(
      parentIndex + newParentStateInfo.totalChildren + 1,
      0,
      ...slice
    );

    this.#_RecursiveAddChildCount(
      childStateInfo.totalChildren + 1,
      newParentStateInfo
    );

    childStateInfo.childDepth = newParentStateInfo.childDepth + 1;
    this.#_UpdateChildDepths(childIndex);
    ServerObjectManager.instance.AddModifiedModel(childStateInfo.modelState);
  }

  ServerUpdateStateInfo(modelState: ModelState, newParentId: number) {
    if (modelState.parentId === newParentId) {
      return;
    }

    let stateIndex = this.GetStateInfoIndex(modelState.instanceId);
    const stateInfo = this.stateInfos[stateIndex];

    //If modelState has parent, shift stateInfo and children out of parent.
    if (modelState.parentId !== -1) {
      const oldParentIndex = this.GetStateInfoIndex(modelState.parentId);
      const oldParentStateInfo = this.stateInfos[oldParentIndex];

      oldParentStateInfo.directChildren -= 1;
      this.#_RecursiveAddChildCount(
        -(stateInfo.totalChildren + 1),
        oldParentStateInfo
      );

      if (newParentId > stateIndex) {
        newParentId -= stateInfo.totalChildren + 1;
      }

      //Shift Child Objects out to end of array.
      const slice = this.stateInfos.slice(
        stateIndex,
        stateIndex + stateInfo.totalChildren + 1
      );
      this.stateInfos.splice(stateIndex, stateInfo.totalChildren + 1);
      stateIndex = this.stateInfos.length;
      this.stateInfos.push(...slice);

      //Set child parent depths.
      stateInfo.childDepth = 0;
      this.#_UpdateChildDepths(stateIndex);
    }

    //Now set new stateinfo parent.
    if (newParentId === -1) {
      return;
    }

    //Set new parent.
    const parentIndex = this.GetStateInfoIndex(newParentId);
    const newParentStateInfo = this.stateInfos[parentIndex];
    newParentStateInfo.directChildren += 1;

    //Insert into array by splice. Insert as last direct child.
    const slice = this.stateInfos.slice(
      stateIndex,
      stateIndex + stateInfo.totalChildren + 1
    );
    this.stateInfos.splice(stateIndex, stateInfo.totalChildren + 1);
    this.stateInfos.splice(
      parentIndex + newParentStateInfo.totalChildren + 1,
      0,
      ...slice
    );

    this.#_RecursiveAddChildCount(
      stateInfo.totalChildren + 1,
      newParentStateInfo
    );
    stateInfo.childDepth = newParentStateInfo.childDepth + 1;
    this.#_UpdateChildDepths(stateIndex);
  }

  RebuildHierarchy() {
    const serverObjectManager = ServerObjectManager.instance;
    const modelsIt = serverObjectManager.models.values();

    let iteration = modelsIt.next();

    while (!iteration.done) {
      const modelState = iteration.value;
      if (this.HasStateInfo(modelState.instanceId)) {
        iteration = modelsIt.next();
        continue;
      }
      this.#_RecursiveCreateStateInfo(serverObjectManager, modelState);

      iteration = modelsIt.next();
    }
    this.onUpdateHierarchyListener.Invoke(new UpdatedHierarchyEvent(this.stateInfos.length))
  }

  BindNewModelStates(modelStates: ModelState[]) {
    const serverObjectManager = ServerObjectManager.instance;

    if(modelStates.length === 0){
      return;
    }

    modelStates.forEach((modelState) => {
      if (this.HasStateInfo(modelState.instanceId)) {
        return;
      }
      this.#_RecursiveCreateStateInfo(serverObjectManager, modelState);
    });
    this.onUpdateHierarchyListener.Invoke(new UpdatedHierarchyEvent(this.stateInfos.length))
  }

  DeleteStateInfo(modelState: ModelState) {
    const stateInfoIndex = this.GetStateInfoIndex(modelState.instanceId);
    if (stateInfoIndex === -1) {
      //State info has already been deleted.
      return;
    }

    const stateInfo = this.stateInfos[stateInfoIndex];

    if (modelState.parentId !== -1) {
      const parentStateIndex = this.GetStateInfoIndex(modelState.parentId);
      const parentState = this.stateInfos[parentStateIndex];

      if(!parentState.markDelete){
        parentState.directChildren -= 1;
        this.#_RecursiveAddChildCount(-(stateInfo.totalChildren + 1), parentState);
      }
    }

    this.deletedInfo = true
    stateInfo.markDelete = true
  }

  RemoveDeletedInfos(){
    if(!this.deletedInfo){
      return;
    }

    let index = 0;

    //For each stateinfo with mark delete.
    //Remove it and its children from the array.
    while(index < this.stateInfos.length){
      if(this.stateInfos[index].markDelete === false){
        index += 1;
        continue;
      }
      this.stateInfos.splice(index, this.stateInfos[index].totalChildren + 1)
    }

    this.deletedInfo = false
    this.onUpdateHierarchyListener.Invoke(new UpdatedHierarchyEvent(this.stateInfos.length))
  }

  PrintArray() {
    let string = "";
    for (let i = 0; i < this.stateInfos.length; ++i) {
      string += this.stateInfos[i].modelState.instanceId + ", ";
    }
  }
}
