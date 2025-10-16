import { AdvancedDynamicTexture, Button, Checkbox, Control, Grid, Image, InputText, Rectangle, ScrollViewer, TextBlock } from "@babylonjs/gui"
import { Scene } from "@babylonjs/core"
import { GuiMenu, GuiMenuToggle, GuiMenuManager } from "../GuiMenu";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { AnnotationDataManager } from "../../annotationTool/AnnotationDataManager";
import { FunctionUtiliy } from "../../utilities/FunctionUtility";
import { AnnotationDataUIModel } from "../../utilities/data/AnnotationData";
import { AnnotationToolManager } from "../../annotationTool/AnnotationToolManager";
import { AssetConfig, PresetConfig } from "../../config";
import { ActionStates } from "../../utilities/enums/enums";
import { UIUtility } from "../../utilities/UIUtility";
import { DesktopCameraSettings } from "../../cameraController/desktop/DesktopCameraSettings";

export class AnnotationMenuController 
{
    static instance: AnnotationMenuController | null = null
    
    scene!: Scene

    // menu template AdvancedDynamicTexture created from .json file 
    navbarAdvTexture: AdvancedDynamicTexture | null = null
    annotationAdvTexture: AdvancedDynamicTexture | null = null
    //Templates from adv tex
    viewerItemCollapsedTemplate!: Rectangle
    viewerItemExpandedTemplate!: Rectangle

    //Menu objects from advDynamicTexture
    navbarButton: Rectangle
    selectActionsContainer!: Rectangle
    selectActionsGUIMenu!: GuiMenu
    selectActionsMenuGroup: GuiMenuToggle
    
    openAnnotationViewerButton!: Rectangle
    closeAnnotationViewerButton!: Button
    annotationObjectPickerButton: Rectangle
    cancelAnnotationObjectPickerButton: Rectangle    

    //Menu objects from annotationAdvTexture
    viewerPanelContainer!: Rectangle
    // viewerPanelScrollViewer!: ScrollViewer
    viewerPanelGrid!: Grid

    /**
     * Generated UI objects from templates from annotationAdvTexture  
     */
    annotationItemsModel: Map<number, AnnotationDataUIModel> = new Map();

    annotationItemInputPanelContainer!: Rectangle
    titleInputField!: InputText
    descriptionInputField!: InputText
    safetyCheckInputField!: Checkbox
    //user confirm/cancel buttons
    CreateAnnotationButton!: Rectangle
    cancelCreateAnnotationButton!: Rectangle

    rowCollapsedHeight: number = 0;
    rowExpandedHeight: number = 0;
    // createContainerHeight: number = 0;
    padding: number = 8;
    gridHeight: number = 0;

    constructor()
    {
    }

    // ========= Initialize and setup =========

    Init(advDynamicTexture: AdvancedDynamicTexture, annotationAdvTexture: AdvancedDynamicTexture, scene: Scene)
    {
        // if(AnnotationMenuController.instance != null)
        //     return;

        AnnotationMenuController.instance = this;

        const _this = AnnotationMenuController.instance;

        _this.navbarAdvTexture = advDynamicTexture
        _this.annotationAdvTexture = annotationAdvTexture
        _this.scene = scene

        _this.SetUpNavBar();
        _this.SetupCreateActions();
        _this.SetupAnnotationViewerActions();
        
    }

    SetUpNavBar()
    {
        const _this = AnnotationMenuController.instance;

        const annotationButton = _this.navbarAdvTexture.getControlByName("Navbar_MenuToggle_Annotate") as Rectangle
        _this.navbarButton = annotationButton

        const annotationSelectToolActionContainer = _this.navbarAdvTexture.getControlByName("Annotation_SelectTool_Container") as Rectangle
        _this.selectActionsContainer = annotationSelectToolActionContainer
        _this.selectActionsContainer.isVisible = false;        

        _this.selectActionsGUIMenu = new GuiMenu(_this.selectActionsContainer)
        _this.selectActionsGUIMenu.OnEnableCallback = function(){
            _this.selectActionsGUIMenu.container.isVisible = true
            UIUtility.SetSelectedOn(_this.navbarButton as Rectangle);
        }
        _this.selectActionsGUIMenu.OnDisableCallback = function(){
            _this.selectActionsGUIMenu.container.isVisible = false
            UIUtility.SetSelectedOff(_this.navbarButton as Rectangle);
        }

        // menu animations
        _this.navbarButton.metadata = new ButtonMetadata(-1, false, false)
        _this.navbarButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        _this.navbarButton.onPointerOutObservable.add(UIUtility.SetHoverOff)        

        const annotationMenuToggleGroup = new GuiMenuToggle(_this.navbarButton, _this.selectActionsGUIMenu);
        _this.selectActionsMenuGroup = annotationMenuToggleGroup;

        //Registering toggle menu and button to a toggle group
        const navbarToggleGroup = GuiMenuManager.instance.FindOrCreateToggleGroup("Navbar");
        navbarToggleGroup.AddToggle(annotationMenuToggleGroup)

        //setup user action: Selects button
        _this.navbarButton.onPointerDownObservable.add(()=>{
            navbarToggleGroup.ActivateToggle(annotationMenuToggleGroup)
            AnnotationToolManager.instance.SetToolActionState(ActionStates.None, _this.UpdateSelectActionButtonState)
        
        })
        
        _this.navbarButton.children.forEach((child)=>child.isEnabled = false)

        
        //hide, dont need old button for now.
        const hideOldButt = _this.navbarAdvTexture.getControlByName("Annotation_View") as Rectangle
        hideOldButt.isVisible = false;

        _this.openAnnotationViewerButton = _this.navbarAdvTexture.getControlByName("annotationViewer_MenuToggle") as Rectangle
        _this.openAnnotationViewerButton.children[0].isEnabled = false
        _this.openAnnotationViewerButton.metadata = new ButtonMetadata()        
        _this.openAnnotationViewerButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)        
        _this.openAnnotationViewerButton.onPointerOutObservable.add(UIUtility.SetHoverOff)

        //user selects button
        _this.openAnnotationViewerButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData) {} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.openAnnotationViewerButton) return            
            // AnnotationToolManager.instance.SetToolActionState(ActionStates.view, _this.UpdateSelectActionButtonState)
            _this.OpenAnnotationViewerAction();
            // // testing only
            // VRAnnotationViewerMenuController.instance.CloseViewerAction();
            // VRAnnotationViewerMenuController.instance.OpenViewerAction();
        })

    }

    SetupCreateActions()
    {
        const _this = AnnotationMenuController.instance;
        _this.annotationObjectPickerButton = _this.navbarAdvTexture.getControlByName("Annotation_Create") as Rectangle
        _this.cancelAnnotationObjectPickerButton = _this.navbarAdvTexture.getControlByName("Annotation_Delete") as Rectangle

        _this.annotationObjectPickerButton.children[0].isEnabled = false
        _this.cancelAnnotationObjectPickerButton.children[0].isEnabled = false

        _this.annotationObjectPickerButton.metadata = new ButtonMetadata()
        _this.cancelAnnotationObjectPickerButton.metadata = new ButtonMetadata()

        _this.annotationObjectPickerButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)        
        _this.annotationObjectPickerButton.onPointerOutObservable.add(UIUtility.SetHoverOff)
        _this.cancelAnnotationObjectPickerButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        _this.cancelAnnotationObjectPickerButton.onPointerOutObservable.add(UIUtility.SetHoverOff)

        _this.annotationObjectPickerButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData) {} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.annotationObjectPickerButton) return
            AnnotationToolManager.instance.SetToolActionState(ActionStates.Add, _this.UpdateSelectActionButtonState)
        })

        _this.cancelAnnotationObjectPickerButton.onPointerDownObservable.add((eventData, eventState)=>{
            if(eventData) {} //Suppress Warning
            if(!eventState.target) return
            if(eventState.target !== _this.cancelAnnotationObjectPickerButton) return
            AnnotationToolManager.instance.SetToolActionState(ActionStates.Remove, _this.UpdateSelectActionButtonState)
        })

        _this.annotationItemInputPanelContainer = _this.annotationAdvTexture.getControlByName("AnnotationCreate_Container") as Rectangle
        
        _this.titleInputField = _this.annotationAdvTexture.getControlByName("CreateAnnotation_Title_Input") as InputText
        _this.titleInputField.onPointerClickObservable.add(() => {
            if(_this.titleInputField.text == PresetConfig.titleInputPreset)
                _this.titleInputField.text = ""
        })
        _this.descriptionInputField = _this.annotationAdvTexture.getControlByName("CreateAnnotation_Description_Input") as InputText
        _this.descriptionInputField.onPointerClickObservable.add(() => {
            if(_this.descriptionInputField.text == PresetConfig.descriptionInputPreset)
                _this.descriptionInputField.text = ""
        })
        _this.safetyCheckInputField = _this.annotationAdvTexture.getControlByName("SafetyCheck_Input") as Checkbox
        
        _this.CreateAnnotationButton = _this.annotationAdvTexture.getControlByName("CreateAnnotation_Add_Button") as Rectangle        
        _this.CreateAnnotationButton.onPointerDownObservable.add(() => {
            FunctionUtiliy.promisify(() => {
                _this.RecordUserInputData();
                // _this.SendNewAnnotationRequestToServer();
                _this.annotationItemInputPanelContainer.isVisible = true;
                _this.CloseCreateNewAnnotationInputFieldsAction();
            }).then(result => {
                AnnotationDataManager.instance.SendCreateNewAnnotationRequest_toServer();
                // _this.CloseAnnotationViewerAction();
                // AnnotationToolManager.instance.SetToolActionState(ActionStates.view, _this.UpdateSelectActionButtonState)
            })
            .catch(error => {
              console.error("Request failed:", error);
            });            
        })

        _this.cancelCreateAnnotationButton = _this.annotationAdvTexture.getControlByName("CreateAnnotation_Cancel_Button") as Rectangle
        _this.cancelCreateAnnotationButton.onPointerDownObservable.add(() => {
            // _this.CloseAnnotationViewerAction();
            _this.CloseCreateNewAnnotationInputFieldsAction();
        });

        _this.CloseCreateNewAnnotationInputFieldsAction();
    }

    SetupAnnotationViewerActions()
    {
        const _this = AnnotationMenuController.instance;
        // _this.menuRootContainer = _this.annotationAdvTexture.getControlByName("Annotation_Root") as Rectangle //dont use root anymore, use main parent object
        _this.viewerPanelContainer = _this.annotationAdvTexture.getControlByName("AnnotationPanel_Root") as Rectangle
        // _this.viewerPanelScrollViewer = _this.annotationAdvTexture.getControlByName("Annotation_ScrollViewer") as ScrollViewer //removed as dont need
        _this.viewerPanelGrid = _this.annotationAdvTexture.getControlByName("Annotation_ScrollViewer_Grid") as Grid

        _this.viewerItemCollapsedTemplate = _this.annotationAdvTexture.getControlByName("AnnotationCollapsed_Container") as Rectangle
        _this.viewerItemCollapsedTemplate.parent.removeControl(_this.viewerItemCollapsedTemplate)
        _this.viewerItemExpandedTemplate = _this.annotationAdvTexture.getControlByName("AnnotationExpanded_Container") as Rectangle
        _this.viewerItemExpandedTemplate.parent.removeControl(_this.viewerItemExpandedTemplate)
        
        _this.closeAnnotationViewerButton = _this.annotationAdvTexture.getControlByName("Annotation_Exit") as Button
        _this.closeAnnotationViewerButton.metadata = new ButtonMetadata(-1, false, false);
        _this.closeAnnotationViewerButton.onPointerEnterObservable.add(UIUtility.SetHoverOn);
        _this.closeAnnotationViewerButton.onPointerOutObservable.add(UIUtility.SetHoverOff);
        _this.closeAnnotationViewerButton.onPointerDownObservable.add(() => {
            _this.CloseAnnotationViewerAction();
            // AnnotationToolManager.instance.SetToolActionState(ActionStates.None, _this.UpdateSelectActionButtonState)
        });
        
        _this.rowCollapsedHeight = _this.viewerItemCollapsedTemplate.heightInPixels + _this.padding;
        _this.rowExpandedHeight = _this.viewerItemExpandedTemplate.heightInPixels + _this.padding;
        // _this.createContainerHeight = _this.padding + (_this.annotationItemInputPanelContainer.isVisible ? _this.annotationItemInputPanelContainer.heightInPixels : 0);
        
        _this.viewerItemCollapsedTemplate.isVisible = false;
        _this.viewerItemExpandedTemplate.isVisible = false;
        _this.viewerPanelContainer.isVisible = false;
    }      
    
    UpdateSelectActionButtonState(action: ActionStates)
    {
        switch(action){
            case ActionStates.None: 
                UIUtility.SetSelectedOff(AnnotationMenuController.instance.annotationObjectPickerButton as Control)
                UIUtility.SetSelectedOff(AnnotationMenuController.instance.cancelAnnotationObjectPickerButton as Control)
                break;
            case ActionStates.Add:
                UIUtility.SetSelectedOn(AnnotationMenuController.instance.annotationObjectPickerButton as Control)
                UIUtility.SetSelectedOff(AnnotationMenuController.instance.cancelAnnotationObjectPickerButton as Control)
                break;
            case ActionStates.Remove:
                UIUtility.SetSelectedOff(AnnotationMenuController.instance.annotationObjectPickerButton as Control)
                UIUtility.SetSelectedOn(AnnotationMenuController.instance.cancelAnnotationObjectPickerButton as Control)
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
            }

        console.log("state changed to:" + action)
    } 

    // ========= user input fields readers and annotation creation (via sending data to server) =========

    RecordUserInputData()
    {
        const _this = AnnotationMenuController.instance;

        const jsonInputData = {
            title: _this.titleInputField.text,
            description: _this.descriptionInputField.text,
            auditor: "NOT IMPLEMENTED YET",
            CheckStatus: _this.safetyCheckInputField.isChecked,
        };
        AnnotationDataManager.instance.RecordAnnotationUserInputs(jsonInputData);
    }

    // ========= annotation list populating and modifications ========= 

    CreateAnnotationUIPanelObjectsFromTemplate()
    {
        const _this = AnnotationMenuController.instance;
        const colClone = _this.viewerItemCollapsedTemplate.clone();
        colClone.name = colClone.name + "_clone_";
        
        const expClone = _this.viewerItemExpandedTemplate.clone();
        expClone.name = expClone.name + "_clone_";

        const UIentity = new AnnotationDataUIModel(colClone as Rectangle, expClone as Rectangle);
        return UIentity;
    }  

    /**
     * Creates a list of UI elements and displays them according to the list of entries in `AnnotationDataList` 
     * from `AnnotationToolManager`.
     */
    PopulateViewerItems()
    {
        const _this = AnnotationMenuController.instance;
        const anonMngr = AnnotationDataManager.instance;

        // _this.gridHeight = 0;

        //Set all UI rows to invisible first, incase rows are more than number of entries (E.g. when an annotation is deleted).
        for (const [key, value] of _this.annotationItemsModel.entries()) {
            value.collapsedUIControl.isVisible = false;
        }

        for (const [key, value] of anonMngr.dataList.entries()) {
            var annotationID = key;
            var clone:AnnotationDataUIModel;
            // check if a UI element was already created before and reuse it.
            if( _this.annotationItemsModel.has(annotationID))
            {
                clone = _this.annotationItemsModel.get(annotationID) as AnnotationDataUIModel;

                _this.viewerPanelGrid.setRowDefinition(annotationID, clone.isExpanded ? _this.rowExpandedHeight : _this.rowCollapsedHeight, true);
                
                if(_this.annotationItemsModel.get(annotationID).isExpanded)
                {
                    _this.viewerPanelGrid.setRowDefinition(annotationID, _this.rowExpandedHeight, true);
                    _this.viewerPanelGrid.addControl(clone.expandedUIControl, annotationID, 0); 
                    _this.viewerPanelGrid.removeControl(clone.collapsedUIControl); 
                }
                else if(!_this.annotationItemsModel.get(annotationID).isExpanded)
                {
                    _this.viewerPanelGrid.setRowDefinition(annotationID, _this.rowCollapsedHeight, true);
                    _this.viewerPanelGrid.addControl(clone.collapsedUIControl, annotationID, 0); 
                    _this.viewerPanelGrid.removeControl(clone.expandedUIControl); 
                }
            }
            else
            {
                clone =_this.CreateAnnotationUIPanelObjectsFromTemplate() as AnnotationDataUIModel;
                //set as collapsed since it will always be collapsed on initialize
                _this.viewerPanelGrid.addRowDefinition(_this.rowCollapsedHeight, true);
                // _this.viewerPanelGrid.addControl(clone.collapsedUIControl, annotationID, 0); 
                // clone.collapsedUIControl.width = 1;
                // clone.expandedUIControl.width = 1;
                _this.annotationItemsModel.set(annotationID, clone);
            }

            // write collapsed UI text and button func
            const colTitleField = clone.collapsedUIControl.getChildByName("Notes_title") as TextBlock;
            colTitleField.text = value.title
            const checkTxtCol = clone.collapsedUIControl.getChildByName("check_text") as TextBlock;
            checkTxtCol.text = value.checkStatus ? "Pass" : "Fail"
            checkTxtCol.color = value.checkStatus ? "#A1FF6AFF" : "#FF6A6AFF";
            const checkIcoCol = clone.collapsedUIControl.getChildByName("check_icon") as Image;
            checkIcoCol.source = value.checkStatus ? AssetConfig.approvedIcon_color : AssetConfig.warningIcon_color;
            const colExpandButton = clone.collapsedUIControl.getChildByName("Annotation_Expand") as Button;
            colExpandButton.onPointerDownObservable.clear();
            colExpandButton.onPointerDownObservable.add(() => {
                _this.ExpandAnnotationItemInViewerAction(key);   
                _this.CalculateGridHeight();        
            });
            // (colExpandButton.getChildByName("expand_icon") as Image).source = AssetConfig.CollapsedIcon_light;

            // write expanded UI text and button func
            var top = clone.expandedUIControl.getChildByName("top") as Rectangle;
            // var bottom = clone.expandedUIControl.getChildByName("Bottom") as Rectangle;
            const expTitleField = top.getChildByName("Notes_title") as TextBlock;
            expTitleField.text = value.title
            const descField = top.getChildByName("Comments") as TextBlock;
            // descField.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
            // descField.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_TOP;
            descField.text = value.description
            const checkTxt = top.getChildByName("check_text") as TextBlock;
            checkTxt.text = value.checkStatus ? "Pass" : "Fail"
            checkTxt.color = value.checkStatus ? "#A1FF6AFF" : "#FF6A6AFF";
            const checkIco = top.getChildByName("check_icon") as Image;
            checkIco.source = value.checkStatus ? AssetConfig.approvedIcon_color : AssetConfig.warningIcon_color;
            (top.getChildByName("collapse") as Image).source = AssetConfig.expand_dark;  
            const expColButton =  top.getChildByName("collapse") as Button;
            expColButton.onPointerDownObservable.clear();
            expColButton.onPointerDownObservable.add(() => {
                _this.CollapseAnnotationItemInViewerAction(key);  
                _this.CalculateGridHeight();         
            })

            const audField = top.getChildByName("auditor") as TextBlock;
            audField.text = "" //"Auditor: " + value.auditor;
            const goToButton = top.getChildByName("goto_button") as Image;
            goToButton.source = AssetConfig.goToIcon_dark;
        
            clone.collapsedUIControl.isVisible = true;
            // _this.gridHeight += _this.annotationItemsModel.get(annotationID).isExpanded ? _this.rowExpandedHeight : _this.rowCollapsedHeight;
        }
        _this.CalculateGridHeight();
    }

    /**
     * Calcuates the grid panel height of the displayed lsit of annotations.
     * Sets `gridHeight` property and sets `annotationPanelGrid` to the value of property.
     */
    CalculateGridHeight()
    {
        const _this = AnnotationMenuController.instance;
        var newHeight = 0
        // newHeight += _this.padding + (_this.annotationItemInputPanelContainer.isVisible ? _this.annotationItemInputPanelContainer.heightInPixels : 0);
        for (const [key, value] of _this.annotationItemsModel.entries()) {
            if(value.isExpanded)
                newHeight += _this.rowExpandedHeight;
            else
                newHeight += _this.rowCollapsedHeight;
            // newHeight += _this.padding;
        }
        _this.gridHeight = newHeight;
        _this.viewerPanelGrid.height = _this.gridHeight +
                                            "px"
    }

    clearGUIObjects()
    {
        const _this = AnnotationMenuController.instance;

        //clean up grid
        _this.viewerPanelGrid.children.forEach(control => _this.viewerPanelGrid.removeControl(control));
        _this.viewerPanelGrid.clearControls();
        // Remove all rows except the first one
        while (_this.viewerPanelGrid.rowCount > 1) {
            _this.viewerPanelGrid.removeRowDefinition(1); // Always remove the second row (index 1)
        }

        // Remove all columns except the first one
        while (_this.viewerPanelGrid.columnCount > 1) {
            _this.viewerPanelGrid.removeColumnDefinition(1); // Always remove the second column (index 1)
        }


        //delete GUI objects
        for (const [key, value] of _this.annotationItemsModel.entries()) {
            if(value.collapsedUIControl)
                value.collapsedUIControl.dispose();
            if(value.expandedUIControl)
                value.expandedUIControl.dispose();
        }
        _this.annotationItemsModel.clear();
    }

    // ========= annotation viewer actions=========

    OpenAnnotationViewerAction()
    {
        const _this = AnnotationMenuController.instance;    
        _this.viewerPanelContainer.isVisible = true;
        // _this.viewerPanelGrid.isVisible = true;
        // _this.annotationItemInputPanelContainer.isVisible = false;
        // _this.gridHeight = 0;
        _this.PopulateViewerItems();
        // VRAnnotationViewerMenuController.instance.OpenViewerAction();
        // VrModelBrowserToolMenuController.instance.ActivateModelMenu();
        // _this.ExpandAnnotationItem(0);
    }

    CloseAnnotationViewerAction()
    {
        const _this = AnnotationMenuController.instance;
        _this.viewerPanelContainer.isVisible = false;
        // AnnotationDataManager.instance.ClearTargetObjectAnnotation();  
        // AnnotationToolManager.instance.SetToolActionState(ActionStates.None); 
        // this.ClearAnnotationMenuGridPanel();
    }

    OpenCreateNewAnnotationInputFieldsAction()
    {
        DesktopCameraSettings.EnableCameraMovement(false);
        
        const _this = AnnotationMenuController.instance;
        // _this.annotationItemInputPanelContainer.top = 0;
        // _this.viewerPanelContainer.isVisible = true;        
        _this.titleInputField.text = PresetConfig.titleInputPreset
        _this.descriptionInputField.text = PresetConfig.descriptionInputPreset
        _this.safetyCheckInputField.isChecked = false;

        AnnotationToolManager.instance.SetToolActionState(ActionStates.Add); 
        _this.annotationItemInputPanelContainer.isVisible = true;
        // _this.annotationPanelGrid.isVisible = true;        
        // _this.PopulateAnnotationGridMenu();
    }

    CloseCreateNewAnnotationInputFieldsAction()
    {   
        DesktopCameraSettings.EnableCameraMovement(true);     
        const _this = AnnotationMenuController.instance;
        AnnotationToolManager.instance.SetToolActionState(ActionStates.None); 
        _this.annotationItemInputPanelContainer.isVisible = false;     
    }

    ExpandAnnotationItemInViewerAction(annotationID: number)
    {
        const _this = AnnotationMenuController.instance;

        var controlInfo:AnnotationDataUIModel;

        controlInfo = _this.annotationItemsModel.get(annotationID) as AnnotationDataUIModel
        if(controlInfo.isExpanded)
        {
            console.log("Annotation already expanded?");
            return
        }

        //Adjust UI by setting and removing controls, and adjusting grid.
        if(controlInfo.expandedUIControl.parent)
            controlInfo.expandedUIControl.parent.removeControl(controlInfo.expandedUIControl)

        _this.viewerPanelGrid.removeControl(controlInfo.collapsedUIControl); 
        _this.viewerPanelGrid.setRowDefinition(annotationID, _this.rowExpandedHeight, true);
        _this.viewerPanelGrid.addControl(controlInfo.expandedUIControl, annotationID, 0); 

        controlInfo.setExpanded(true);
        controlInfo.setControlRemoved(true);
        controlInfo.collapsedUIControl.isVisible = false;
        controlInfo.expandedUIControl.isVisible = true;        
    }

    CollapseAnnotationItemInViewerAction(annotationID: number)
    {
        const _this = AnnotationMenuController.instance;
        
        // var row = annotationID; //annotationID and rowID should be the same.
        var controlInfo:AnnotationDataUIModel;

        controlInfo = _this.annotationItemsModel.get(annotationID) as AnnotationDataUIModel

        if(!controlInfo.isExpanded)
        {
            console.log("Annotation already collapsed?");
            return
        }

        //Adjust UI by setting and removing controls, and adjusting grid.
        // if(_this.annotationItemExpandContainer.parent)
        //     _this.annotationItemExpandContainer.parent.removeControl(_this.annotationItemExpandContainer)
        if(controlInfo.collapsedUIControl.parent)
            controlInfo.collapsedUIControl.parent.removeControl(controlInfo.collapsedUIControl)

        _this.viewerPanelGrid.removeControl(controlInfo.expandedUIControl); 
        _this.viewerPanelGrid.setRowDefinition(annotationID, _this.rowCollapsedHeight, true);
        _this.viewerPanelGrid.addControl(controlInfo.collapsedUIControl, annotationID, 0); 

        controlInfo.setExpanded(false);
        controlInfo.setControlRemoved(false);
        controlInfo.collapsedUIControl.isVisible = true;
        controlInfo.expandedUIControl.isVisible = false;  
    }
}