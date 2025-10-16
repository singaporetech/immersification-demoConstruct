import { Vector3 } from "@babylonjs/core";
import { TransformComponent } from "../roomController/objects/components/TransformComponent";

export class TransformUtility {
  static UpdateTransform(obj?: any, position?: Vector3, rotation?: Vector3, scale?: Vector3) {
    if(obj instanceof TransformComponent) {
      if (position) {
        obj.position = new Vector3(position.x, position.y, position.z);
      }
      if (rotation) {
        obj.rotation = new Vector3(rotation.x, rotation.y, rotation.z);
      }
      if (scale) {
        obj.scaling =new Vector3(scale.x, scale.y, scale.z);
      }
    }
  }
}