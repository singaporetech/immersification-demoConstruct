
/**
 * @fileoverview WIP collision trigger component that can be attached to any mesh object.
 * TODO: WIP feature, not implemented yet.
 */
import { Mesh, Scene, AbstractMesh, ActionManager, AbstractActionManager, ExecuteCodeAction} from "@babylonjs/core";

// OnTriggerComponent.ts
import { EventDelegate } from "../../utils/Delegates";

export class OnTriggerComponent
{
    private scene: Scene;
    public mesh: Mesh;

    public targetMeshes: Mesh[];

    constructor(mesh: Mesh, scene: Scene, onTriggerEnter: EventDelegate, onTriggerExit: EventDelegate)
    {
        this.mesh = mesh;
        this.scene = scene;

        this.CreateOnTriggerChecker(onTriggerEnter, onTriggerExit);
    }    

    public CreateOnTriggerChecker(onTriggerEnter: EventDelegate, onTriggerExit: EventDelegate)
    {
      // Set up the onTriggerEnter event for the mesh
      this.mesh.actionManager = new ActionManager(this.scene) as AbstractActionManager;

      this.mesh.actionManager.registerAction(
          new ExecuteCodeAction(
            {
                trigger: ActionManager.OnIntersectionEnterTrigger, 
                parameter: this.targetMeshes,
            }, 
              onTriggerEnter.bind(this)
          )
      );
    }
}