//
// Deprecated
// Capture session no longer supported
//
import SceneComponent from "babylonjs-hook";
import { Scene, Vector3, HemisphericLight, MeshBuilder, Mesh, ArcRotateCamera, Color3 } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { SocketHandler } from "../lib/babylon-scripts/WebSocketManager";
import { useEffect } from "react";
import { CaptureSessionManager} from "../lib/babylon-scripts/capture-session/CaptureSessionManager";
import { CaptureSessionGUIManager } from "../lib/babylon-scripts/capture-session/CaptureSessionGUIManager";
import { ColorScheme } from "../lib/babylon-scripts/ColorScheme";

let box: Mesh

const onSceneReady = async(scene: Scene)=>{
    const boxOptions = {
        width: 1.0,
        height: 1.0,
        depth: 1.0
    }

    box = MeshBuilder.CreateBox("Box", boxOptions)
    box.isVisible = false
    const plane = MeshBuilder.CreatePlane("Default_Plane", {size: 20}, scene)
    plane.isVisible = true
    plane.rotation.x = 1.57

    const gridMat = new GridMaterial("plane_gridMat", scene)
    gridMat.opacity = 0.8
    gridMat.mainColor = Color3.White()
    gridMat.lineColor = Color3.FromHexString(ColorScheme.GetPurpleScale(3))
    gridMat.majorUnitFrequency = 5
    gridMat.minorUnitVisibility = 0.1

    plane.material = gridMat
    plane.isPickable = false
    const planeDown = plane.clone()
    planeDown.rotation.x = -1.57
    planeDown.material = gridMat
    planeDown.isPickable = false

    const camera = new ArcRotateCamera(
        "Camera",
        0,
        0,
        1,
        new Vector3(0, 3, -5),
        scene
      );
    camera.wheelDeltaPercentage = 0.01

    const canvas = scene.getEngine().getRenderingCanvas();
    camera.setTarget(Vector3.Zero())
    camera.attachControl(canvas, true)

    const light = new HemisphericLight("Light", new Vector3(0, 0, -5), scene)
    light.intensity = 4;

    window.onkeydown = (event)=>{
        if(event.key === " "){
        }
    }

    const socketHandler = new SocketHandler()
    socketHandler.StartConnection( undefined, undefined);

    const captureSessionManager = new CaptureSessionManager(camera, scene)
    captureSessionManager.Init()

    const guiManager = new CaptureSessionGUIManager()
    guiManager.Init(scene)
}

const onRender = (scene: Scene)=>{
    if(box != undefined){
        const deltaTime = scene.getEngine().getDeltaTime()
        const rpm = 10;
        box.rotation.y += (rpm/60) * Math.PI * 2 * (deltaTime / 1000);
    }
    CaptureSessionGUIManager.instance?.Update()
}

const CaptureMode = () => {
    useEffect(()=>{
        return()=>{
            CaptureSessionManager.instance?.Uninit()
            CaptureSessionGUIManager.instance?.Uninit()
        }
    }, [])

    return (
      <SceneComponent
        antialias
        onSceneReady={onSceneReady}
        onRender={onRender}
        className="h-screen w-screen"
      />
    );
  };
  export default CaptureMode;