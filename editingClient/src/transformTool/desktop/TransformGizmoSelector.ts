import { EventListener, EventData } from "../../utilities/delegates/EventListener"
import { GizmoManager } from "@babylonjs/core"
import { ABaseTool } from "../../tool/ABaseTool"
import { SelectMeshEvent, ObjectPickingManager } from "../../objectPickingSelection/ObjectPickingManager"

export class TransformGizmoSelectEvent implements EventData{
    public static readonly UniqueSymbol: unique symbol = Symbol("GizmoSelectEvent")

    public selectedIndex
    constructor(selectIndex: number){
        this.selectedIndex = selectIndex
    }

    public Key(): symbol {
        return TransformGizmoSelectEvent.UniqueSymbol
    }
}

export class TransformGizmoSelector extends ABaseTool {
    static instance: TransformGizmoSelector | null = null
    
    public gizmoSelectListener: EventListener<TransformGizmoSelectEvent>

    public gizmoManager: GizmoManager

    private activeGizmoIndex = 0

    constructor(gizmoManager: GizmoManager){
        super();
        this.gizmoSelectListener = new EventListener<TransformGizmoSelectEvent>()
        this.gizmoManager = gizmoManager

        if(TransformGizmoSelector.instance){
            TransformGizmoSelector.instance.Uninit()
        }
        TransformGizmoSelector.instance = this;
    }

    public SetToolActionState(actionState?: number, callback?: (result?: any) => void): void {
        throw new Error("Method not implemented.");
    }

    public static get ActiveInstance() {
        return TransformGizmoSelector.instance
    }

    private AttachMesh(evnt: SelectMeshEvent){
        TransformGizmoSelector.instance?.gizmoManager.attachToMesh(evnt.selectedModel);
    }

    private DetachMesh(){
        TransformGizmoSelector.instance?.gizmoManager.attachToMesh(null);
    }

    public DeselectTool()
    {
        this.DetachMesh();
        ObjectPickingManager.ActiveInstance?.ClearSelection();
        
        if(this.activeGizmoIndex != 0)
            this.SetSelectedGizmo(this.activeGizmoIndex);
    }

    public Init(){
        const pickingManager = ObjectPickingManager.ActiveInstance
        if(pickingManager){
            pickingManager.onSelectListener.Subscribe(this.AttachMesh);
            pickingManager.onDeselectListener.Subscribe(this.DetachMesh);
        }
    }

    public Uninit(){
        const pickingManager = ObjectPickingManager.ActiveInstance
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
        this.gizmoSelectListener.Invoke(new TransformGizmoSelectEvent(this.activeGizmoIndex))
    }
}