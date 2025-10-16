import { Vector3, Scene } from "@babylonjs/core";
import { AnnotationDataManager } from "../../annotationTool/AnnotationDataManager";
import { SpatialUIObject, VRMenuObject } from "../UIComponents";
import { AdvancedDynamicTexture, Button, Checkbox, Control, Grid, Image, InputText, Rectangle, ScrollViewer, TextBlock } from "@babylonjs/gui";
import { AnnotationDataUIModel } from "../../utilities/data/AnnotationData";
import { AssetConfig } from "../../config";

export default class VRAnnotationViewerMenuController
{
    static instance: VRAnnotationViewerMenuController | null = null
    scene!:Scene
    AnnonDataMngr: AnnotationDataManager;
    
    //figure how how to deal with this 3
    // ========= action menu objects variables =========
    actionMenuObject: VRMenuObject;
    actionMenuContainer!: Rectangle

    openViewerPanelButton!: Button

    // ========= viewer panel objects variables =========
    viewerPanelObject: VRMenuObject;    
    //Menu objects from annotationAdvTexture
    viewerPanelContainer!: Rectangle

    viewerPanelGrid!: Grid

    viewerItemPreviewTemplate!: Rectangle

    viewerItemExpanded!: Rectangle

    // closeViewerPanelButton!: Button

    /**
     * Generated UI objects from templates from annotationAdvTexture  
     */
    viewerPanelGridItemsModel: Map<number, AnnotationDataUIModel> = new Map();

    // grid display variables
    itemPreviewRowHeight: number = 0;
    padding: number = 16;
    gridHeight: number = 0;

    //expanded panel in viewing variables
    prevExpandedItemID = -1;

    constructor()
    {
    }

    // ========= Initialize and setup =========

    Init(//uiTemplateUrl: string, size: number, position: Vector3, 
        scene: Scene): void {
        // super.init(uiTemplateUrl, size, position, scene);
        
        VRAnnotationViewerMenuController.instance = this;
        const _this = VRAnnotationViewerMenuController.instance;

        _this.scene = scene;
        _this.AnnonDataMngr  = AnnotationDataManager.instance;

        // _this.setupActionMenu(config.VRannotationActionUI, 1);
        _this.setupViewerPanel(AssetConfig.VRannotationViewerUI, 2, 808, 720);
    }

    // setupActionMenu(uiTemplateUrl: string, size: number)
    // {
    //     const _this = VRAnnotationViewerMenuController.instance
    //     _this.actionMenuObject = new VRMenuObject();
    //     _this.actionMenuObject.init(uiTemplateUrl,size , new Vector3(0,0,0), _this.scene);

    //     _this.actionMenuContainer = _this.actionMenuObject.advTex.getControlByName("") as Rectangle        
    //     _this.openViewerPanelButton = _this.actionMenuObject.advTex.getControlByName("") as Button //need create this button
    // }

    async setupViewerPanel(uiTemplateUrl: string, 
        scale: number, 
        width: number = 1024, 
        height: number = 1024)
    {
        const _this = VRAnnotationViewerMenuController.instance
        _this.viewerPanelObject = new VRMenuObject();

        await _this.viewerPanelObject.init(uiTemplateUrl, scale, width, height, new Vector3(0,0,0), _this.scene);

        _this.viewerPanelContainer = _this.viewerPanelObject.advTex.getControlByName("Annotation_Root") as Rectangle
        _this.viewerPanelGrid = _this.viewerPanelObject.advTex.getControlByName("Annotation_ScrollViewer_Grid") as Grid
        _this.viewerItemPreviewTemplate = _this.viewerPanelObject.advTex.getControlByName("AnnotationCollapsed_Container") as Rectangle
        _this.viewerItemPreviewTemplate.parent.removeControl(_this.viewerItemPreviewTemplate)
        _this.viewerItemExpanded = _this.viewerPanelObject.advTex.getControlByName("AnnotationExpanded_Container") as Rectangle
        // _this.viewerPanelObject.setBillboardMode(true, 2);

        // _this.viewerItemExpanded.left = "-208px"
        const l = _this.viewerPanelObject.advTex.getControlByName("Left") as Rectangle
        l.cornerRadiusX = 12;
        l.cornerRadiusW = 12;

        _this.itemPreviewRowHeight = _this.viewerItemPreviewTemplate.heightInPixels + _this.padding;
    
        // _this.viewerPanelObject.setBillboardMode(true, 2);
        // _this.OpenViewerAction();
        _this.CloseViewerAction();
    }

    // ========= annotation list populating and modifications ========= 

    CreateViewerPanelItemFromTemplate()
    {
        const _this = VRAnnotationViewerMenuController.instance;
        const colClone = _this.viewerItemPreviewTemplate.clone();
        colClone.name = colClone.name + "_clone_";

        const UIentity = new AnnotationDataUIModel(colClone as Rectangle);
        return UIentity;
    }  

    /**
     * Creates a list of UI elements and displays them according to the list of entries in `AnnotationDataList` 
     * from `AnnotationToolManager`.
     */
    PopulateViewerItems()
    {
        const _this = VRAnnotationViewerMenuController.instance;
        const anonMngr = AnnotationDataManager.instance;

        _this.gridHeight = 0;
        // _this.expandedItemID = 1;

        //Set all UI rows to invisible first, incase rows are more than number of entries (E.g. when an annotation is deleted).
        for (const [key, value] of _this.viewerPanelGridItemsModel.entries()) {
            value.collapsedUIControl.isVisible = false;
            value.setExpanded(false);
        }

        for (const [key, value] of anonMngr.dataList.entries()) {
            var annotationID = key;
            var clone:AnnotationDataUIModel;

            // check if a UI element was already created before and reuse it.
            if( _this.viewerPanelGridItemsModel.has(annotationID))
            {
                clone = _this.viewerPanelGridItemsModel.get(annotationID) as AnnotationDataUIModel;

                _this.viewerPanelGrid.setRowDefinition(annotationID,
                                                        _this.itemPreviewRowHeight, 
                                                        true);
                if(!_this.viewerPanelGrid.containsControl(clone.collapsedUIControl))
                    _this.viewerPanelGrid.addControl(clone.collapsedUIControl, annotationID, 0); 
                
                
                if(_this.viewerPanelGridItemsModel.get(annotationID).isExpanded)
                {

                    _this.CloseExpandedPanelAction(annotationID);
                    // (clone.collapsedUIControl.getChildByName("expanded_icon") as Image).source = config.ExpandedIcon;
                }
                // else
                // {
                //     (clone.collapsedUIControl.getChildByName("expanded_icon") as Image).source = config.CollapsedIcon;                
                // }
            }
            // else, means no UI created, so create new UI ojbects
            else
            {
                clone =_this.CreateViewerPanelItemFromTemplate() as AnnotationDataUIModel;

                //set as collapsed since it will always be collapsed on initialize
                _this.viewerPanelGrid.addRowDefinition(_this.itemPreviewRowHeight, true);
                _this.viewerPanelGrid.addControl(clone.collapsedUIControl, annotationID, 0); 

                clone.collapsedUIControl.width = 1;
                // clone.expandedUIControl.width = 1;
                (clone.collapsedUIControl.getChildByName("expanded_icon") as Image).source = AssetConfig.collapse_dark;
                
                _this.viewerPanelGridItemsModel.set(annotationID, clone);
            }

            // write collapsed UI text and button func
            const titleField = clone.collapsedUIControl.getChildByName("title_field") as TextBlock;
            titleField.text = value.title
            titleField.isEnabled = false;
            const checkField = clone.collapsedUIControl.getChildByName("check_text") as TextBlock;
            // checkField.text = value.checkStatus ? "Pass" : "Fail";
            // checkField.color = value.checkStatus ? "#A1FF6AFF" : "#FF6A6AFF";
            // checkField.isEnabled = false;            
            checkField.isVisible = false;
            const checkIcon = clone.collapsedUIControl.getChildByName("check_icon") as Image;
            checkIcon.source = value.checkStatus ? AssetConfig.approvedIcon_color : AssetConfig.warningIcon_color;
            checkIcon.isEnabled = false;
            // checkIcon.isVisible = false;
            const colExpandButton = clone.collapsedUIControl.getChildByName("expanded_icon") as Button; //TODO: should be an image icon, not a button
            colExpandButton.isEnabled = false;

            // const container = clone.collapsedUIControl//.getChildByName("AnnotationCollapsed_Container") as Control
            clone.collapsedUIControl.onPointerDownObservable.clear();
            clone.collapsedUIControl.onPointerDownObservable.add(() => {
                _this.OpenExpandedPanelAction(key);
            })

            clone.collapsedUIControl.isVisible = true;
            _this.gridHeight += _this.itemPreviewRowHeight;
        }

        _this.CalculateGridHeight();
        _this.viewerItemExpanded.isVisible = false;
    }

    /**
     * Calcuates the grid panel height of the displayed lsit of annotations.
     * Sets `gridHeight` property and sets `annotationPanelGrid` to the value of property.
     */
    CalculateGridHeight()
    {
        const _this = VRAnnotationViewerMenuController.instance;
        var newHeight = 0

        for (const [key, value] of _this.viewerPanelGridItemsModel.entries()) {
            newHeight += _this.itemPreviewRowHeight;
        }
        _this.gridHeight = newHeight;
        _this.viewerPanelGrid.height = _this.gridHeight +
                                        "px"
    }

    clearGUIObjects()
    {
        const _this = VRAnnotationViewerMenuController.instance;

        for (const [key, value] of _this.viewerPanelGridItemsModel.entries()) {
            if(value.collapsedUIControl)
                value.collapsedUIControl.dispose();
            if(value.expandedUIControl)
                value.expandedUIControl.dispose();
        }

        _this.viewerPanelGridItemsModel.clear();
    }

    // ========= annotation viewer functions: user actions attached to buttons =========

    SetViewerPoisiton(position: Vector3)
    {
        const _this = VRAnnotationViewerMenuController.instance;    
        _this.viewerPanelObject.setPosition(position);
    }

    OpenViewerAction()
    {
        const _this = VRAnnotationViewerMenuController.instance;    
        _this.viewerPanelContainer.isVisible = true;
        _this.viewerPanelGrid.isVisible = true;
        // _this.viewerPanelObject.set
        _this.viewerPanelObject.setVisibility(true);
        // _this.viewerPanelObject.setBillboardMode(true, 0);

        _this.gridHeight = 0;
        _this.PopulateViewerItems();
    }

    CloseViewerAction()
    {
        const _this = VRAnnotationViewerMenuController.instance;
        _this.viewerPanelContainer.isVisible = false;
        _this.viewerPanelObject.setVisibility(false);
        // _this.viewerPanelObject.setBillboardMode(false);

        // AnnotationDataManager.instance.ClearTargetObjectAnnotation();
    }

    OpenExpandedPanelAction(annotationID: number)
    {
        const _this = VRAnnotationViewerMenuController.instance;
        const anonMngr = AnnotationDataManager.instance;

        const id = annotationID;
        // if interacting with the same item as before
        if(id === _this.prevExpandedItemID)
        {
            if(_this.viewerPanelGridItemsModel.get(id).isExpanded)
            {
                _this.CloseExpandedPanelAction(id);
            }
            else
            {
                _this._UpdateExpandedPanelDisplays(id);
            }
        }
        // if interacting with a different button
        else if (id !== _this.prevExpandedItemID)
        {
            //reset UI for current first, if any\
            // >= 0 to check since inital value is set to -1
            if(_this.prevExpandedItemID >= 0 && 
                _this.viewerPanelGridItemsModel.get(_this.prevExpandedItemID).isExpanded)
            {
                _this.CloseExpandedPanelAction(_this.prevExpandedItemID);
            }
            if(_this.viewerPanelGridItemsModel.get(id).isExpanded)
                {
                    _this.CloseExpandedPanelAction(id);
                }
                else
                {
                    _this._UpdateExpandedPanelDisplays(id);
            }
        }
        _this.prevExpandedItemID = id
    }

    CloseExpandedPanelAction(annotationID: number)
    {
        const _this = VRAnnotationViewerMenuController.instance;
        
        var controlInfo = _this.viewerPanelGridItemsModel.get(annotationID) as AnnotationDataUIModel
        if(!controlInfo.isExpanded)
        {
            console.log("Annotation already collapsed?");
            // return
        }
        (controlInfo.collapsedUIControl.getChildByName("expanded_icon") as Image).source = AssetConfig.collapse_dark;
        
        _this.viewerItemExpanded.isVisible = false;
        controlInfo.setExpanded(false);
        console.log("Expanded view closed");
    }

    _UpdateExpandedPanelDisplays(annotationID: number)
    {
        
        const _this = VRAnnotationViewerMenuController.instance;
        const anonMngr = AnnotationDataManager.instance;
        const displayData = anonMngr.dataList.get(annotationID);

        // console.log(_this.viewerPanelGridItemsModel);
        var controlInfo = _this.viewerPanelGridItemsModel.get(annotationID)
        if(controlInfo.isExpanded)
        {
            console.log("Annotation already expanded?");
            // return
        }
        (controlInfo.collapsedUIControl.getChildByName("expanded_icon") as Image).source = AssetConfig.expand_dark;

        // write expanded UI text and button func
        var left = _this.viewerItemExpanded.getChildByName("Left") as Rectangle;
        var right = _this.viewerItemExpanded.getChildByName("Right") as Rectangle;

        const expTitleField = left.getChildByName("Notes_title") as TextBlock;
        expTitleField.text = displayData.title        
        const descField = left.getChildByName("Notes_comments") as TextBlock;
        descField.text = displayData.description
        const checkStatusField = left.getChildByName("Notes_auditor") as TextBlock;
        checkStatusField.text = "" //"Auditor: " + displayData.auditor
        const checkIcon = left.getChildByName("check-icon") as Image;
        checkIcon.source = displayData.checkStatus ? AssetConfig.approvedIcon_color : AssetConfig.warningIcon_color;

        const movetoIcon = (right.getChildByName("Button") as Rectangle).getChildByName("Image") as Image;
        movetoIcon.source = AssetConfig.goToIcon_dark;

        //TODO: consider implementing a close button
        // const closeButton =  right.getChildByName("button") as Control;
        // closeButton.onPointerDownObservable.clear();
        // closeButton.onPointerDownObservable.add(() => {
        //     // _this.annotationTool.GoToObject //Not implemented yet     
        // })

        _this.viewerItemExpanded.isVisible = true;
        controlInfo.setExpanded(true);
    }
}