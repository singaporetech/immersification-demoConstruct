/**
 * @fileoverview
 * Defines a group of classes to used to initialize BabylonJS Control objects as menus
 * that can be moved around and shown/hidden by clicking another BabylonJs control object.
 */
import { Control } from "@babylonjs/gui";
import { ABaseTool } from "../tool/ABaseTool";
import { ColorScheme } from "../utilities/ColorScheme";
import { GuiManager } from "./desktop/GuiManager";

/**
 * @classdesc
 * Defines a control that can be dragged to move around in the babylonJS viewport
 * or toggled to be shown/hidden by a GUI_MenuToggle instance (another control).
 */
export class GuiMenu {
  container: Control;
  OnEnableCallback: any;
  OnDisableCallback: any;
  managedChildControls: any[];
  _callbackID: any;

  /**
   * Constructor to initialize control object as menu.
   * @class
   * @param {*} container - The control object that contains all other control elements as children.
   */
  constructor(container: Control) {
    this.container = container; //BabylonJS Control Container.
    this.OnEnableCallback = null; //Function called when container is disabled.
    this.OnDisableCallback = null; //Function called when container is enabled.
    this.managedChildControls = []; //Child BabylonJS Controls that need to be disabled together with container.

    this._callbackID = null;
  }

  /**
   * Disables this instance and invokes the OnDisableCallback.
   * Sets all child controls to be disabled if any.
   * @returns {None} No returned value.
   */
  Disable() {
    if (this.OnDisableCallback) {
      this.OnDisableCallback();
    }
    for (let i = 0; i < this.managedChildControls.length; ++i) {
      this.managedChildControls[i].isEnabled = false;
    }
  }

  /**
   * Enables this instance and invokes the OnEnableCallback.
   * Sets all child controls to be Enables if any.
   * @returns {None} No returned value.
   */
  Enable() {
    if (this.OnEnableCallback) {
      this.OnEnableCallback();
    }
    for (let i = 0; i < this.managedChildControls.length; ++i) {
      this.managedChildControls[i].isDisabled = true;
    }
  }

  /**
   * Sets up this instance as a draggable control object.
   * Adds a onPointerObservable callback to the control object
   * and registers this instance to be updated by the GUI_MenuManager
   * @returns {None} No returned value.
   */
  EnableDragMoveBehaviour(moveController: any) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const menu = this;
    menu._callbackID = this.container.name + " " + moveController.name;
    moveController.onPointerDownObservable.add(
      () => {
        const func = function () {
          const pointer = GuiManager.instance.deltaPointerPos;
          menu.container.left =
            parseFloat(menu.container.left.toString()) + pointer.deltaX + "px";
          menu.container.top =
            parseFloat(menu.container.top.toString()) + pointer.deltaY + "px";
        };
        GuiMenuManager.instance.AddCallback(func, menu._callbackID);
      }
    );

    moveController.onPointerUpObservable.add(
      () => {
        GuiMenuManager.instance.RemoveCallback(menu._callbackID);
      }
    );
  }
}

/**
 * @classdesc
 * Designates a control object as a button that toggles a GUI_Menu class to show/hide
 */
export class GuiMenuToggle {
  id: number;
  groupMember: number;
  control: any;
  isActive: boolean;
  linkedMenu: GuiMenu;
  activeColor: string;
  inactiveColor: string;
  
  linkedTools: ABaseTool[];

  /**
   * Constructor that initializes the control object as toggle button.
   * @class
   * @param {BabylonsJS Control} control - The object that allows clicking
   * @param {*} linkedMenu  - Optional GUI_Menu instance that can linked to toggles on or off.
   */
  constructor(control: Control, linkedMenu?: GuiMenu) {
    this.id = -1; //Id of toggle in array.
    this.groupMember = -1; //ID of which toggle group it is a member of.
    this.control = control; //BabylonsJs control object.
    this.isActive = false; //Boolean to track toggle state
    this.linkedMenu = linkedMenu || null; //Reference to GUI_Menu instance to disable/enable by this toggle.

    this.activeColor = ColorScheme.Selected;
    this.inactiveColor = ColorScheme.Selectable;

    this.linkedTools = [];
  }

  /**
   * Set instance disabled state
   */
  /**
   * @desc When the menu is dropped down, ff the function is invoked, the menu will not disppear as intended
   */
  Disable() {
    if (this.isActive === false) {
      return;
    }

    this.control.background = ColorScheme.Selectable;
    // this.control.alpha = 1
    if(this.linkedMenu != null)
    {
      this.linkedMenu.Disable();
    }
    this.DisableLinkedTools();
    this.isActive = false;
}

  /**
   * Set instance disabled state
   */
  /**
   * @desc If the function is invoked the "object" menu drop down, displaying all the reconstructions
   */
  Enable() {
    if (this.isActive === true) {
      return;
    }
    this.control.background = ColorScheme.Selected;
    this.control.alpha = 1
    if(this.linkedMenu != null)
    {
      this.linkedMenu.Enable();
    }
    this.isActive = true;
  }

  AddLinkedTool(tool: ABaseTool)
  {
    if (!(tool instanceof ABaseTool)) {
      throw "toggle is not instance of a tool (BaseTool.ts)!";
    }

    this.linkedTools.push(tool);
  }

  DisableLinkedTools()
  {
    // No tools linked to this menu, so call off disabling.
    if(this.linkedTools.length <= 0)
      return;

    for(let i = 0; i < this.linkedTools.length; i++)
      {
        this.linkedTools[i].DeselectTool();
      }
  }
}

/**
 * @classdesc
 * A helper class that groups GUI_MenuToggle instances together such that
 * only one toggle can be active in each toggle group.
 */
/**
   * @desc This refers to the "object" and "marker" GUI_MenuToggle control objects.. 
   * @desc When object button is toggled (drop-downed), marker button will not be able to toggle state
*/
export class GuiToggleGroup {
  name: string;
  id: number;
  menuToggles: GuiMenuToggle[];
  /**
   * Constructor.
   * @class
   * @param {string} name - The name of the group, to use in searching for specific instances.
   */
  constructor(name: string) {
    this.name = name;
    this.id = -1;
    this.menuToggles = [];
  }

  /**
   * Adds a GUI_MenuToggle instance to be managed in this toggle group.
   * @param {GuiMenuToggle} toggle - Toggle instance to add into this toggle group
   */
  AddToggle(toggle: GuiMenuToggle) {
    if (!(toggle instanceof GuiMenuToggle)) {
      throw "toggle is not instance of GUI_ToggleGroup!";
    }

    toggle.id = this.menuToggles.length;
    toggle.groupMember = this.id;
    this.menuToggles.push(toggle);
  }

  /**
   * Activates the input toggle and disables the other toggle instances managed in this group.
   * @param {GuiMenuToggle} toggle - toggle instance to activate
   * @param {bool} activeState
   */
  ActivateToggle(toggle: GuiMenuToggle, activeState?: boolean) {
    let isActive = !toggle.isActive;
    if (activeState)
      {
      isActive = activeState;
    }

    //If toggle state will not change
    if (isActive === toggle.isActive) 
      return;

    if (isActive)
      {
      //Set Toggle to on, all other toggles to off.
      toggle.Enable();
      const toggleId = toggle.id;
      if (toggleId === -1) return;

      for (let i = 0; i < this.menuToggles.length; ++i) {
        if (i === toggleId) continue;
        this.menuToggles[i].Disable();
      }
    } 
    else 
    {
      //Set toggle to off.
      toggle.Disable();
    }
  }
}

/**
 * @classdesc
 * Stores toggle groups for GUI_ToggleMenu to easily search and register to.
 * Also allows GUI_Menu to register callbacks in update function, such as to enable click and drag function.
 */
export class GuiMenuManager {
  static instance: GuiMenuManager;
  toggleGroups: GuiToggleGroup[];
  callbacks: any[];

  /**
   * @class
   * Default constructor.
   */
  constructor() {
    GuiMenuManager.instance = this;
    this.toggleGroups = []; //Array of GUI_MenuToggle.
    this.callbacks = [];
  }

  /**
   * A helper function to register the default behaviour for the menu and toggle button:
   * @param {Control} container - BabylonJS Control object for menu
   * @param {Control} dragMoveHandle - BabylonJS control object for the element to allow click and drag movement.
   * @param {Control} toggleButton - BabylonJS control object to act as toggle button to show/hide menu.
   * @param {string} toggleGroupName - name of the toggle group to add into, if intended to be managed by toggle group.
   * @returns
   */
  CreateDefaultBehaviour(
    container: Control,
    dragMoveHandle: Control,
    toggleButton: Control,
    toggleGroupName: string | null = null
  ) : any
  {
    //Using boolean operations to check if all objects are correct type.
    let validInput = true;
    validInput = validInput && container && container instanceof Control;
    validInput = validInput && dragMoveHandle && dragMoveHandle instanceof Control;
    validInput = validInput && toggleButton && toggleButton instanceof Control;
    validInput = validInput && toggleGroupName != null;

    if (!validInput) {
      console.log("Invalid input types. Operation cancelled.");
      return;
    }

    //Initializing Container Menu
    container.isVisible = false;
    const guiMenu = new GuiMenu(container);
    guiMenu.OnEnableCallback = function () {
      guiMenu.container.isVisible = true;
    };
    guiMenu.OnDisableCallback = function () {
      guiMenu.container.isVisible = false;
    };
    //Binding drag move handle to move the menu.
    guiMenu.EnableDragMoveBehaviour(dragMoveHandle);

    //Initializing gui Toggle
    const guiToggle = new GuiMenuToggle(toggleButton, guiMenu);

    //Setup toggle group.
    const toggleGroup = this.FindOrCreateToggleGroup(toggleGroupName as string);
    toggleGroup.AddToggle(guiToggle);
    toggleButton.onPointerDownObservable.add(() => {
      toggleGroup.ActivateToggle(guiToggle);
    });

    return {
      "guiMenu": guiMenu,
      "guiToggle": guiToggle,
      "toggleGroup": toggleGroup,
    };
  }

  /**
   * Function to retrieve the toggle group instance by name.
   * Return instance if it exists, else create an instance and return it.
   * @param {string} name - name of the toggle group to add into.
   * @returns
   */
  FindOrCreateToggleGroup(name: string) {
    let group = this.toggleGroups.find((group) => group.name === name);
    if (!group)
    {
      group = new GuiToggleGroup(name);
      group.id = this.toggleGroups.length;
      this.toggleGroups.push(group);
    }
    return group;
  }

  /**
   * Adds a callback for GUI_MenuManager to call every frame render.
   * @param {function} func - function to be called every frame by GUI_MenuManager
   * @param {*} identifier - An unique identify input by the caller, so that caller can remove itself later.
   */
  AddCallback(func: any, identifier: any) {
    func._identifier = identifier;
    this.callbacks.push(func);
  }

  /**
   * Removes the callback from GUI_MenuManager
   * @param {*} identifier -  An unique identify input by the caller, must be same as when id used for adding callback.
   */
  RemoveCallback(identifier: any) {
    const index = this.callbacks.findIndex((obj) => obj._identifier === identifier);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  Update() {
    for (let i = 0; i < this.callbacks.length; ++i) {
      const funct = this.callbacks[i];
      if (typeof funct === "function") {
        funct();
      }
    }
  }
}
