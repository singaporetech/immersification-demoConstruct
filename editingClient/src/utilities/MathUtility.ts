import { Vector3 } from "@babylonjs/core";

export class MathUtility {
  static vec3RadianToDegree(vec3: Vector3) {
    return new Vector3(
      this.RadiansToDegrees(vec3.x),
      this.RadiansToDegrees(vec3.y),
      this.RadiansToDegrees(vec3.z)
    );
  }

  static vec3DegreeToRadian(vec3: Vector3) {
    return new Vector3(
      this.DegreesToRadians(vec3.x),
      this.DegreesToRadians(vec3.y),
      this.DegreesToRadians(vec3.z)
    );
  }

  static RadiansToDegrees(radians: number) {
    return radians * (180 / Math.PI);
  }

  static DegreesToRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
  }
}
