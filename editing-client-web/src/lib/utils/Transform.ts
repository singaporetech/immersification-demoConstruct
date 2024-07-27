export class TransformBuilder {
  static Build(
    position = { x: 0.0, y: 0.0, z: 0.0 },
    rotation = { x: 0.0, y: 0.0, z: 0.0 },
    scale = { x: 1.0, y: 1.0, z: 1.0 }
  ) {
    const obj = Object();
    obj.position = position;
    obj.rotation = rotation;
    obj.scale = scale;
    return obj;
  }
}
