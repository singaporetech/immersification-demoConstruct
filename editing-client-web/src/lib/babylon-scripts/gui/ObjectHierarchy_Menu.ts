/**
 * @fileoverview
 * Defines the Model info menu class which displays the creation information of the
 * currently picked mesh in BabylonJS. Displays information such as Author, creation date,
 * description, that is stored in ModelLoader when the model information is downloaded.
 * 
 */
import {
  AdvancedDynamicTexture,
  Button,
  Container,
  Control,
  Image,
  TextBlock,
} from "@babylonjs/gui";
import { ColorScheme } from "../ColorScheme";
import { ObjectHierarchy, UpdatedHierarchyEvent } from "../ObjectHierarchy";
import { GUI_MenuManager } from "./GuiMenu";
import { PickingManager, SelectModelEvent } from "../PickingManager";


export class ObjectHierarchy_Menu {
  static instance: ObjectHierarchy_Menu;
  baseMenuElement: any;
  stackPanel: any;
  elements: any[];
  lastSelectedId: number;
  isSelecting: boolean;
  visibleElementCount: number;
  lastPointerDownTime: any;

  constructor() {
    this.baseMenuElement = null; //Control of one object entry to be duplicated. Contains child controls displaying text and images.
    this.stackPanel = null; //Control of the stack panel containing the object entries.
    this.elements = []; //List of the instances of object entries.

    this.lastSelectedId = -1; //Id for the last selection made.
    this.isSelecting = false; //bool for if selection has been made
    this.visibleElementCount = 0; //Counter for number of elements to set as visible.

    this.lastPointerDownTime = null; //A timestamp for the last pointer down event.

    ObjectHierarchy_Menu.instance = this;
  }

  /**
   * Callback function for when mouse hovers over control element.
   * Sets control to "Highlighted" colours.
   * Used as callback only for onPointer event.
   * @param {BabylonJS Control} control - the control to change color for.
   */
  Element_OnPointerEnter(control: any) {
    if (control._isSelected) {
      control.background = ColorScheme.backgroundLightPurple;
    } else {
      control.background = ColorScheme.GetGrayscale(3);
    }
  }

  /**
   * Callback function for when mouse hovers exit control element.
   * Sets control to regular colours.
   * Used as callback only for onPointer event.
   * @param {BabylonJS Control} control - the control to change color for.
   */
  Element_OnPointerExit(control: any) {
    if (control._isSelected) {
      control.background = ColorScheme.backgroundDarkPurple;
    } else {
      control.background = ColorScheme.GetGrayscale(2);
    }
  }

  /**
   * Callback function for when control element is clicked on.
   * Intended to be used as callback only.
   * @param {*} mousePos - mousePos passed in by observer function. Unused.
   * @param {*} eventState - eventState passed in by observer function. Unused.
   */
  Element_OnPointerDown(mousePos: any, eventState: any) {
    mousePos //Suppress Warning
    //ObjectHierarchy.instance.PickMeshFromMenu(eventState.target._idInArray);
    ObjectHierarchy.ActiveInstance?.PickFromMenu(eventState.target._idInArray);
    ObjectHierarchy_Menu.instance.lastPointerDownTime = performance.now();
  }

  /**
   * Callback function for when control element is clicked on then released.
   * Intended to be used as callback only.
   * @param {*} mousePos - mousePos passed in by observer function. Unused.
   * @param {*} eventState - eventState passed in by observer function. Unused.
   * @returns
   */
  Element_OnPointerUp(mousePos: any, eventState: any) {
    mousePos //Suppress Warning
    const control = eventState.target;
    const objHierMenu = ObjectHierarchy_Menu.instance;

    const diffTime = performance.now() - objHierMenu.lastPointerDownTime;
    if (diffTime < 180) {
      //objHier.PickMeshFromMenu(eventState.target._idInArray);
      return;
    }

    if (objHierMenu.lastSelectedId === -1) {
      return;
    }
    //If mouse released in the slider window area.
    if (control.name === "scrollViewer_window") {
      ObjectHierarchy.ActiveInstance?.SetStateInfoParent(
        objHierMenu.lastSelectedId,
        -1
      );
    } else if (
      control._idInArray !== undefined &&
      control._idInArray !== objHierMenu.lastSelectedId
    ) {
      //If control is a element that is not currently selected.
      ObjectHierarchy.ActiveInstance?.SetStateInfoParent(
        objHierMenu.lastSelectedId,
        control._idInArray
      );
    }
    objHierMenu.RefreshAllElement();
  }

  /**
   * Callback function for when the visibility icon on the element is clicked on.
   * Calls function to toggles mesh visibility state, and updates element display.
   * Intended to be used as callback only.
   * @param {*} mousePos - mousePos passed in by observer function. Unused.
   * @param {*} eventState - eventState passed in by observer function. Gets target image control from event state.
   */
  ElementVisible_OnPointerDown(mousePos: any, eventState: any) {
    mousePos //Suppress Warning
    const image = eventState.target;
    ObjectHierarchy.ActiveInstance?.ToggleModelVisibility(image.parent._idInArray);
    ObjectHierarchy_Menu.instance.RefreshAllElement();
  }

  /**
   * Private helper function to check if input index is valid.
   * @param {int} index - index to check validity.
   * @returns {bool} true or false.
   */
  #_IsValidElementIndex(index: number) {
    if (
      index >= 0 &&
      index < this.elements.length &&
      index < this.visibleElementCount
    ) {
      return true;
    }
    return false;
  }

  /**
   * Sets a element as selected when picked in the BabylonJs Scene, either through
   * clicking on the mesh, or through clicking the element in the menu.
   * @param {int} index - index of the element in list to set as selected.
   */
  SetNewSelectedElement(index: number) {
    if (!this.#_IsValidElementIndex(index)) {
      console.warn("Cannot Select Invalid Hierarchy Element ID: ", index);
      return;
    }

    this.lastSelectedId = index;
    this.isSelecting = true;
    const selectedControl = this.elements[index];
    selectedControl._isSelected = true;
    selectedControl.background = ColorScheme.backgroundDarkPurple;

    //Toggle all to unselected color.
    for (let i = 0; i < this.elements.length; ++i) {
      const control = this.elements[i];
      if (index === i) continue;
      control._isSelected = false;
      control.background = ColorScheme.GetGrayscale(2);
    }
  }

  /**
   * Sets Number of elements as visible in UI according to input visible count.
   * This value should correspond with the number of demoConstruct models loaded
   * in the scene.
   * @param {int} totalVisible - Number of ui elements to show.
   */
  SetVisibleElements(totalVisible: number) {
    if (totalVisible < 0) {
      console.warn(
        "Set Visible Elements Cannot set visible elements < 0: ",
        totalVisible
      );
      return;
    }
    //Create new elements if not enough.
    if (totalVisible > this.elements.length) {
      const createCount = totalVisible - this.elements.length;
      for (let i = 0; i < createCount; ++i) {
        this.AddNewElement();
      }
    }

    //Set visible status for each element.
    for (let i = 0; i < this.elements.length; ++i) {
      if (i >= totalVisible) {
        this.elements[i].isVisible = false;
      } else {
        this.elements[i].isVisible = true;
      }
    }

    this.visibleElementCount = totalVisible;
  }

  /**
   * Calls refresh element for every visible element.
   */
  RefreshAllElement() {
    for (let i = 0; i < this.visibleElementCount; ++i) {
      this.RefreshElement(i);
    }
  }

  /**
   * The sole method for updating the model information linked and to be displayed for this element.
   * Refreshes the text and visibility status by reading state from the ObjectHierarchy class.
   * @param {int} index - index in list of the element to refresh.
   */
  RefreshElement(index: number) {
    const stateInfo = ObjectHierarchy.ActiveInstance?.stateInfos[index];
    const modelState = stateInfo.modelState;
    const mesh = modelState.mesh;
    const control = this.elements[index];
    const children = control.children;

    //Resets color of control
    if (this.isSelecting && this.lastSelectedId === index) {
      control._isSelected = true;
      control.background = ColorScheme.backgroundDarkPurple;
    } else {
      control._isSelected = false;
      control.background = ColorScheme.GetGrayscale(2);
    }

    //Set width of control depending on child layer.
    control.width =
      parseInt(this.baseMenuElement.width) - stateInfo.childDepth * 20 + "px";

    //Set colour of child text and image controls depending on visible state.
    const newColor = modelState.isVisible
      ? ColorScheme.GetGrayscale(5)
      : ColorScheme.GetGrayscale(4);
    const newImage = modelState.isVisible
      ? "guicons/Visible.png"
      : "guicons/NotVisible.png";

    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      if (child instanceof TextBlock) {
        if (mesh !== null) {
          child.text = mesh.name;
        } else {
          child.text = "Loading...";
          const callback = function () {
            child.text = modelState.mesh?.name as string;
          };
          modelState.modelMaster?._pendingMeshCallbacks.push(callback);
        }
        child.color = newColor;
      } else if (child instanceof Image) {
        child.source = newImage;
      }
    }
  }

  ToggleModelVisibleState(index: number) {
    if (!this.#_IsValidElementIndex(index)) {
      console.warn("Cannot Toggle Invalid Hierarchy Element ID. Aborting.");
      return;
    }
    ObjectHierarchy.ActiveInstance?.ToggleModelVisibility(
      this.elements[index]._idInArray
    );
  }

  /**
   * Duplicates BaseElement and initializes it to be used to represent meshes in UI.
   * Called when count of initialized elements is not sufficient.
   * @param {*} control - Control to initialize as object hierarchy element, if any.
   */
  AddNewElement(control: any = null) {
    if (!control) {
      control = this.baseMenuElement.clone();
    }
    control._idInArray = this.elements.length;
    control._isSelected = false;
    control._isModelVisible = true;

    control.name = "HierarchyMenu_ModelElement_" + this.elements.length;
    control.onPointerEnterObservable.add(this.Element_OnPointerEnter);
    control.onPointerOutObservable.add(this.Element_OnPointerExit);
    control.onPointerDownObservable.add(this.Element_OnPointerDown);
    control.onPointerUpObservable.add(this.Element_OnPointerUp);

    control.background = ColorScheme.GetGrayscale(2);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    const children = control.children;
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      if (child instanceof TextBlock) {
        child.isEnabled = false;
        child.fontSizeInPixels = 14;
      }
      if (child instanceof Image) {
        child.onPointerDownObservable.add(this.ElementVisible_OnPointerDown);

        //One more pointer out observable as visisble icon is blocking control pointer out observable.
        child.onPointerOutObservable.add(() => {
          _this.Element_OnPointerExit(control);
        });
      }
    }

    this.elements.push(control);
    this.stackPanel.addControl(control);
  }

  /**
   * Called by PickingManager.
   * Updates this menu to display element that was picked if any.
   * @param {*} mesh
   * @returns
   */
  PickAssignedMesh(evnt: SelectModelEvent) {
    const _this = ObjectHierarchy_Menu.instance
    const index = ObjectHierarchy.ActiveInstance?.GetStateInfoIndex(
      evnt.selectedModel.metadata.instanceId
    );

    if (index === -1) {
      console.warn("Aborting. Mesh Not Found: ", evnt.selectedModel.name);
      return;
    }

    _this.SetNewSelectedElement(index);
  }

  /**
   * Called by picking manager.
   * Deselects currently picked element and resets it to default colors.
   */
  DeselectCurrent() {
    const _this = ObjectHierarchy_Menu.instance
    const control = _this.elements[_this.lastSelectedId];
    control._isSelected = false;
    control.background = ColorScheme.GetGrayscale(2);

    //this.lastSelectedId = -1; //-> don't reset select id
    _this.isSelecting = false;
  }

  /**
   * Deletes the currently selected mesh,
   * and refreshes menu to display updated state.
   */
  DeleteSelectedModel() {
    if (!this.#_IsValidElementIndex(this.lastSelectedId) && this.isSelecting) {
      return; //Invalid ID. Don't do anything.
    }

    ObjectHierarchy.ActiveInstance?.RequestDeleteModel(this.lastSelectedId);
  }

  _OnHierarchyUpdate(evnt: UpdatedHierarchyEvent){
    ObjectHierarchy_Menu.instance.SetVisibleElements(evnt.objectCount)
    ObjectHierarchy_Menu.instance.RefreshAllElement()
  }

  Init(advTexture: AdvancedDynamicTexture, menuManager: GUI_MenuManager) {
    //Initialize controls to use GUI_Menu functionality.
    this.baseMenuElement = advTexture.getControlByName(
      "HierarchyMenu_ModelElement_0"
    );
    this.stackPanel = advTexture.getControlByName(
      "HierarchyMenu_ModelListStackPanel"
    );

    const deleteButton = advTexture.getControlByName(
      "HierarchyMenu_TrashcanContainer"
    ) as Button;
    deleteButton.onPointerDownObservable.add(() => {
      ObjectHierarchy_Menu.instance.DeleteSelectedModel();
    });
    deleteButton.children[0].isEnabled = false;

    this.AddNewElement(this.baseMenuElement);
    this.SetVisibleElements(0);

    //See GuiMenu.js for menuManager class.
    const menu = advTexture.getControlByName(
      "HierarchyMenu_Container"
    ) as Container;
    const moveControl = advTexture.getControlByName(
      "HierarchyMenu_TitleText"
    ) as Control;
    const toggleControl = advTexture.getControlByName(
      "View_Menu_Toggle_0"
    ) as Control;
    const toggleImage = advTexture.getControlByName(
      "View_Menu_Image_0"
    ) as Image;

    menuManager.CreateDefaultBehaviour(
      menu,
      moveControl,
      toggleControl,
      "View"
    );
    toggleImage.isEnabled = false;

    const pickingManager = PickingManager.ActiveInstance
    if(pickingManager){
      pickingManager.onSelectListener.Subscribe(this.PickAssignedMesh)
      pickingManager.onDeselectListener.Subscribe(this.DeselectCurrent)
    }

    const objectHierarchy = ObjectHierarchy.ActiveInstance
    if(objectHierarchy){
      objectHierarchy.onUpdateHierarchyListener.Subscribe(this._OnHierarchyUpdate)
    }
  }

  Uninit(){
    const pickingManager = PickingManager.ActiveInstance
    if(pickingManager){
      pickingManager.onSelectListener.Unsubscribe(this.PickAssignedMesh)
      pickingManager.onDeselectListener.Unsubscribe(this.DeselectCurrent)
    }

    const objectHierarchy = ObjectHierarchy.ActiveInstance
    if(objectHierarchy){
      objectHierarchy.onUpdateHierarchyListener.Unsubscribe(this._OnHierarchyUpdate)
    }
  }
}
