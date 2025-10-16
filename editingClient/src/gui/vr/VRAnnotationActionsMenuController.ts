import { Vector3, Scene, Axis, Mesh, Space } from "@babylonjs/core";
import { AnnotationDataManager } from "../../annotationTool/AnnotationDataManager";
import { SpatialUIObject, VRMenuObject } from "../UIComponents";
import { AdvancedDynamicTexture, Button, Checkbox, Control, Grid, InputText, Rectangle, ScrollViewer, TextBlock, VirtualKeyboard } from "@babylonjs/gui";
import { AssetConfig, PresetConfig, RenderConfig } from "../../config";
import { FunctionUtiliy } from "../../utilities/FunctionUtility";
import { AnnotationToolManager } from "../../annotationTool/AnnotationToolManager";
import { ActionStates } from "../../utilities/enums/enums";
import { UIUtility } from "../../utilities/UIUtility";

export default class VRAnnotationActionsMenuController
{
    static instance: VRAnnotationActionsMenuController | null = null
    scene!:Scene
    AnnonDataMngr: AnnotationDataManager;

    // ========= action menu objects variables =========
    actionMenuObject: VRMenuObject;
    actionMenuContainer!: Rectangle

    addPickAnnotatableObjectPickerButton: Button
    deletePickedObjectPickerButton: Button

    // ========= creation panel objects variables =========
    inputPanelObject: VRMenuObject;
    //user input fields and containers
    inputPanelContainer!: Rectangle

    titleInputField!: InputText
    descriptionInputField!: InputText
    checkInputField!: Button
    checkInputText: TextBlock;
    recordedisChecked: boolean = true;

    //user confirm/cancel buttons
    CreateAnnotationButton!: Rectangle
    cancelCreateAnnotationButton!: Rectangle

    vKeyboardAdvTex: AdvancedDynamicTexture;
    VKeyboardMesh: Mesh;
    VKeyboard: VirtualKeyboard;

    constructor()
    {
    }

    // ========= Initialize and setup =========

    Init(scene: Scene)
    {        
        VRAnnotationActionsMenuController.instance = this;
        const _this = VRAnnotationActionsMenuController.instance;

        _this.scene = scene;
        _this.AnnonDataMngr  = AnnotationDataManager.instance;
        _this.setupInputPanel(AssetConfig.VRannotationInputUI, 1, 472, 472);
    }

    async setupInputPanel(uiTemplateUrl: string, scale: number, width: number = 1024, heigth: number = 1024)
    {
        const _this = VRAnnotationActionsMenuController.instance

        _this.inputPanelObject = new VRMenuObject();
        await _this.inputPanelObject.init(uiTemplateUrl, scale, width, heigth, new Vector3(0,0,0), _this.scene);

        _this.inputPanelContainer = _this.inputPanelObject.advTex.getControlByName("base_container") as Rectangle
          
        _this.titleInputField = _this.inputPanelObject.advTex.getControlByName("title_input") as InputText
        _this.titleInputField.text = PresetConfig.titleInputPreset;
        _this.titleInputField.onPointerClickObservable.add(() => {
            if(_this.titleInputField.text == PresetConfig.titleInputPreset)
                _this.titleInputField.text = ""
        })
        _this.descriptionInputField = _this.inputPanelObject.advTex.getControlByName("comment_input") as InputText
        _this.descriptionInputField.text = PresetConfig.descriptionInputPreset;
        _this.descriptionInputField.onPointerClickObservable.add(() => {
            if(_this.descriptionInputField.text == PresetConfig.descriptionInputPreset)
                _this.descriptionInputField.text = ""
        })
        _this.checkInputText = _this.inputPanelObject.advTex.getControlByName("check_displayText") as TextBlock;
        _this.checkInputField = _this.inputPanelObject.advTex.getControlByName("check_button") as Button
        _this.checkInputField.onPointerDownObservable.add(() => {
            _this.recordedisChecked = !_this.recordedisChecked;
            _this.checkInputText.text = _this.recordedisChecked ? "Danger" : "Safe"

            _this.checkInputField.left = _this.recordedisChecked ? "50%" : "0%"
        })        
        const cttrue = _this.inputPanelObject.advTex.getControlByName("check_text_true") as TextBlock;
        cttrue.isEnabled = false;    
        const ctfalse = _this.inputPanelObject.advTex.getControlByName("check_text_false") as TextBlock;
        ctfalse.isEnabled = false;
        
        _this.CreateAnnotationButton = _this.inputPanelObject.advTex.getControlByName("confirm_button") as Button
        _this.CreateAnnotationButton.onPointerDownObservable.add(() => {
            FunctionUtiliy.promisify(() => {
                _this.RecordUserInputData();
                _this.CloseInputPanelAction();
            }).then(result => {
                AnnotationDataManager.instance.SendCreateNewAnnotationRequest_toServer();
                AnnotationToolManager.instance.SetToolActionState(ActionStates.None)
            })
            .catch(error => {
              console.error("Request failed:", error);
            });
        })
        
        _this.cancelCreateAnnotationButton = _this.inputPanelObject.advTex.getControlByName("cancel_button") as Button
        _this.cancelCreateAnnotationButton.onPointerClickObservable.add(() => {
            _this.CloseInputPanelAction();
            AnnotationToolManager.instance.SetToolActionState(ActionStates.None)            
        })

        // ========== Create virtual keyboard ==========
        _this.VKeyboardMesh = Mesh.CreatePlane("vKeyboard", 3, _this.scene);
        _this.VKeyboardMesh.renderingGroupId = RenderConfig.gui;
        _this.vKeyboardAdvTex = AdvancedDynamicTexture.CreateForMesh(_this.VKeyboardMesh)
        _this.VKeyboard = new VirtualKeyboard();
		_this.VKeyboard.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
		_this.vKeyboardAdvTex.addControl(_this.VKeyboard);
        _this.VKeyboard.addKeysRow(["1","2","3","4","5","6","7","8","9","0","-","=","←"]);
        _this.VKeyboard.addKeysRow(["q","w","e","r","t","y","u","i","o","p","[","]"]);
        _this.VKeyboard.addKeysRow(["a","s","d","f","g","h","j","k","l",";","'"]);
        _this.VKeyboard.addKeysRow(["z","x","c","v","b","n","m",",",".","/"]);
        _this.VKeyboard.addKeysRow([" "], [{ width: "200px" }]);
		_this.VKeyboard.connect(_this.titleInputField);
		_this.VKeyboard.connect(_this.descriptionInputField);

        _this.CloseInputPanelAction();
    }

    // ========= user input fields readers and annotation creation (via sending data to server) =========

    RecordUserInputData()
    {
        const _this = VRAnnotationActionsMenuController.instance;

        const jsonInputData = {
            title: _this.titleInputField.text,
            description: _this.descriptionInputField.text,
            auditor: "NOT IMPLEMENTED YET",
            CheckStatus: _this.recordedisChecked,
        };
        AnnotationDataManager.instance.RecordAnnotationUserInputs(jsonInputData);
    }

    // ========= annotation viewer functions: user actions attached to buttons =========

    OpenInputPanelAction()
    {
        const _this = VRAnnotationActionsMenuController.instance;

        _this.titleInputField.text = PresetConfig.titleInputPreset
        _this.descriptionInputField.text = PresetConfig.descriptionInputPreset
        _this.recordedisChecked = false;
        _this.checkInputText.text = _this.recordedisChecked ? "Danger" : "Safe"
        _this.checkInputField.left = _this.recordedisChecked ? "50%" : "0%"
        var pos = new Vector3(0, 0, 0);
        var forwardDirection = _this.scene.activeCamera.getDirection(Axis.Z);
        let forwardSpacing = AssetConfig.VRGUIDistanceFromCamera;
        pos = pos.copyFrom(_this.scene.activeCamera.globalPosition).add(forwardDirection.scale(forwardSpacing));    
        _this.inputPanelObject.setPosition(pos);//new Vector3(-5, 5, -25));        
        _this.inputPanelObject.setVisibility(true);
        _this.inputPanelObject.mesh.isPickable = true

        var postVKey = new Vector3(0, 0, 0);
        var upwardDirection = _this.scene.activeCamera.getDirection(Axis.Y);
        postVKey.copyFrom(pos);
        _this.VKeyboardMesh.position = postVKey.add(forwardDirection.scale(.7)).add(upwardDirection.scale(.4)) //
        _this.VKeyboardMesh.lookAt(_this.scene.activeCamera.position.add(upwardDirection.scale(2)));
        _this.VKeyboardMesh.rotate(Axis.Y, Math.PI, Space.LOCAL)
        // _this.VKeyboardMesh.isPickable = true;
        // _this.VKeyboardMesh.setEnabled(false);
    }
    
    CloseInputPanelAction()
    {
        const _this = VRAnnotationActionsMenuController.instance;
        AnnotationToolManager.instance.DeselectTool();
        _this.inputPanelObject.setVisibility(false);
        _this.inputPanelObject.mesh.isPickable = false
        _this.VKeyboardMesh.position = new Vector3(1000,1000,1000)
    }
    // ========= GUI handlers: Does graphic changes, animations, etc. =========

    UpdateSelectActionButtonState(action: ActionStates)
    {
        switch(action){
            case ActionStates.None: 
                UIUtility.SetSelectedOff(VRAnnotationActionsMenuController.instance.addPickAnnotatableObjectPickerButton as Control)
                UIUtility.SetSelectedOff(VRAnnotationActionsMenuController.instance.deletePickedObjectPickerButton as Control)
                break;
            case ActionStates.Add:
                UIUtility.SetSelectedOn(VRAnnotationActionsMenuController.instance.addPickAnnotatableObjectPickerButton as Control)
                UIUtility.SetSelectedOff(VRAnnotationActionsMenuController.instance.deletePickedObjectPickerButton as Control)
                break;
            case ActionStates.Remove:
                UIUtility.SetSelectedOff(VRAnnotationActionsMenuController.instance.addPickAnnotatableObjectPickerButton as Control)
                UIUtility.SetSelectedOn(VRAnnotationActionsMenuController.instance.deletePickedObjectPickerButton as Control)
                break;
            default:
                console.warn("this.actionState value was changed to invalid value.")
                break;
            }

        console.log("state changed to:" + action)
    } 
}