import { DC_EventListener, DC_EventData } from "../event-listener/EventListener"
import { GizmoManager } from "@babylonjs/core"
import { PickingManager, SelectModelEvent } from "./PickingManager"
import { BaseTool } from "./BaseTool"

export class GizmoSelectEvent implements DC_EventData{
    public static readonly UniqueSymbol: unique symbol = Symbol("GizmoSelectEvent")

    public selectedIndex
    constructor(selectIndex: number){
        this.selectedIndex = selectIndex
    }

    public Key(): symbol {
        return GizmoSelectEvent.UniqueSymbol
    }
}

export class GizmoSelector extends BaseTool {
    static instance: GizmoSelector | null = null
    public static get ActiveInstance(){return GizmoSelector.instance}
    
    public gizmoSelectListener: DC_EventListener<GizmoSelectEvent>

    public gizmoManager: GizmoManager

    private activeGizmoIndex = 0


    constructor(gizmoManager: GizmoManager){
        super();
        this.gizmoSelectListener = new DC_EventListener<GizmoSelectEvent>()
        this.gizmoManager = gizmoManager

        if(GizmoSelector.instance){
            GizmoSelector.instance.Uninit()
        }
        GizmoSelector.instance = this;
    }

    private AttachMesh(evnt: SelectModelEvent){
        GizmoSelector.instance?.gizmoManager.attachToMesh(evnt.selectedModel);
    }

    private DetachMesh(){
        GizmoSelector.instance?.gizmoManager.attachToMesh(null);
    }

    public DeselectTool()
    {
        this.DetachMesh();
        PickingManager.ActiveInstance?.ClearSelection();
        
        if(this.activeGizmoIndex != 0)
            this.SetSelectedGizmo(this.activeGizmoIndex);
    }

    public Init(){
        const pickingManager = PickingManager.ActiveInstance
        if(pickingManager){
            pickingManager.onSelectListener.Subscribe(this.AttachMesh);
            pickingManager.onDeselectListener.Subscribe(this.DetachMesh);
        }
    }

    public Uninit(){
        const pickingManager = PickingManager.ActiveInstance
        if(pickingManager){
            pickingManager.onSelectListener.Unsubscribe(this.AttachMesh);
            pickingManager.onDeselectListener.Unsubscribe(this.DetachMesh);
        }
    }

    public SetSelectedGizmo(selectedGizmoIndex: number){
        if(selectedGizmoIndex < 0 || selectedGizmoIndex > 3){
            console.warn("Invalid Gizmo Index. Aborted")
            return
        }

        //Deactivate Previous Gizmo
        switch(this.activeGizmoIndex){
            case 0: break;
            case 1: this.gizmoManager.positionGizmoEnabled = false; break;
            case 2: this.gizmoManager.rotationGizmoEnabled = false; break;
            case 3: this.gizmoManager.scaleGizmoEnabled = false; break;
        }

        //If different gizmo, toggle off current gizmo.
        if(this.activeGizmoIndex === selectedGizmoIndex){
            this.activeGizmoIndex = 0
        }else{
            this.activeGizmoIndex = selectedGizmoIndex
        }

        //Activate new Gizmo
        switch(this.activeGizmoIndex){
            case 0: break;
            case 1: this.gizmoManager.positionGizmoEnabled = true; break;
            case 2: this.gizmoManager.rotationGizmoEnabled = true; break;
            case 3: this.gizmoManager.scaleGizmoEnabled = true; break;
        }

        //Broadcast Set Gizmo Event
        this.gizmoSelectListener.Invoke(new GizmoSelectEvent(this.activeGizmoIndex))
    }
}