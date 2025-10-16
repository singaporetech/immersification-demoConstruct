import { Vector3 } from "@babylonjs/core";
import { TransformUtility } from "../../../utilities/TransformUtility";

export class TransformComponent {
    position: Vector3;
    rotation: Vector3;
    scaling: Vector3;
  
    constructor() {
      this.position = new Vector3(0, 0, 0);
      this.rotation = new Vector3(0, 0, 0);
      this.scaling = new Vector3(1, 1, 1);
    }
    
    public UpdateTransform(position?: Vector3, rotation?: Vector3, scale?: Vector3) {
      TransformUtility.UpdateTransform(this, position, rotation, scale)
    }
  }