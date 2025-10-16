/**
 * @file VRMeasuringToolManager.ts
 * @description This file contains the VRMeasuringToolManager class, which manages the measuring tool functionality
 * in the VR environment using Babylon.js. It allows users to create measurement lines and displays the distance
 * between two points in the scene.
 * 
 * @author nirmalsnair
 * @date 06/01/2025
 */

import { Scene, Vector3, MeshBuilder, LinesMesh, Mesh, StandardMaterial, Color3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";
import { VrManager } from "../../modeController/vr/VrManager";
import { RenderConfig } from "../../config";
import { MeasureMenuController } from "../../gui/desktop/MeasureMenuController";

/**
 * Manages the measuring tool functionality in the VR environment.
 */
export class VRMeasuringToolManager {
    public static instance: VRMeasuringToolManager | null = null;
    private scene!: Scene;

    public toolID = 4; // Identifier for the measuring tool
    private startPoint: Vector3 | null = null; // Starting point of the measurement
    private currentLine: LinesMesh | null = null; // Current line being drawn
    private measurements: Array<{ line: LinesMesh, text: Mesh }> = []; // Stores completed measurements
    private dynamicTextMesh: Mesh | null = null; // Dynamic text mesh for displaying distance

    /**
     * Initializes the measuring tool with the given scene.
     * @param scene - The Babylon.js scene to operate in.
     */
    constructor() {}
    public Init(scene: Scene) {
        VRMeasuringToolManager.instance = this;
        this.scene = scene;
        this.toolID = 4;
    }

    // /**
    //  * Creates a small 3-axis indicator at the given position.
    //  * This helps users visualize the orientation of the measurement point.
    //  * @param position - The position where the axis should be created.
    //  */
    // private createAxisIndicator(position: Vector3) {
    //     MeasureMenuController.instance.createAxisIndicator(position);
    //     // const size = 0.1; // Size of the axis lines

    //     // // Create X axis (Red)
    //     // const xAxis = MeshBuilder.CreateLines("xAxis", {
    //     //     points: [position, position.add(new Vector3(size, 0, 0))]
    //     // }, this.scene);
    //     // const xMaterial = new StandardMaterial("xMaterial", this.scene);
    //     // xMaterial.diffuseColor = Color3.Red();
    //     // xAxis.isPickable = false;
    //     // xAxis.color = xMaterial.diffuseColor;

    //     // // Create Y axis (Green)
    //     // const yAxis = MeshBuilder.CreateLines("yAxis", {
    //     //     points: [position, position.add(new Vector3(0, size, 0))]
    //     // }, this.scene);
    //     // const yMaterial = new StandardMaterial("yMaterial", this.scene);
    //     // yMaterial.diffuseColor = Color3.Green();
    //     // yAxis.isPickable = false;
    //     // yAxis.color = yMaterial.diffuseColor;

    //     // // Create Z axis (Blue)
    //     // const zAxis = MeshBuilder.CreateLines("zAxis", {
    //     //     points: [position, position.add(new Vector3(0, 0, size))]
    //     // }, this.scene);
    //     // const zMaterial = new StandardMaterial("zMaterial", this.scene);
    //     // zMaterial.diffuseColor = Color3.Blue();
    //     // zAxis.isPickable = false;
    //     // zAxis.color = zMaterial.diffuseColor;
    // }

    // /**
    //  * Updates the dynamic line and text as the pointer moves.
    //  */
    // private updateDynamicLine() {
    //     if (!this.scene || !this.startPoint || !this.currentLine) return;

    //     const rayHitInfo = VrManager.getInstance?.rightControllerRayHitInfo;
    //     if (!rayHitInfo || !rayHitInfo.pickedPoint) return;

    //     const currentPoint = rayHitInfo.pickedPoint;
    //     this.currentLine = MeshBuilder.CreateLines("measureLine", {
    //         points: [this.startPoint, currentPoint],
    //         instance: this.currentLine
    //     });

    //     // Calculate the distance and update the dynamic text
    //     const distance = Vector3.Distance(this.startPoint, currentPoint);
    //     const midPoint = this.startPoint.add(currentPoint).scale(0.5);

    //     if (this.dynamicTextMesh) {
    //         this.dynamicTextMesh.dispose();
    //     }
    //     this.dynamicTextMesh = this.createMeasurementText(`${distance.toFixed(2)}m`, midPoint);
    // }

    /**
     * Starts the measuring process by placing the start point.
     */
    public startNewMeasurement() {
        // console.log("Start measuring");
        const rayHitInfo = VrManager.getInstance?.rightControllerRayHitInfo;
        if (!rayHitInfo || !rayHitInfo.pickedPoint) {
            console.log("No valid picked point found.");
            return;
        }
        const position = rayHitInfo.pickedPoint;
        if (!MeasureMenuController.instance.startPoint) {
            MeasureMenuController.instance.createAxisIndicator(position);
            MeasureMenuController.instance.startNewMeasurement(position);
            // this.startPoint = position.clone();
            // // console.log("Start point set at: " + this.startPoint);
            // this.createAxisIndicator(this.startPoint);
            // this.currentLine = MeshBuilder.CreateLines("measureLine", {
            //     points: [this.startPoint!, this.startPoint!.clone()],
            //     updatable: true
            // }, this.scene);
            // this.currentLine.renderingGroupId = RenderConfig.gui
            // this.currentLine.isPickable = false;

            // // Set up pointer move event to update the dynamic line and text
            this.scene.onPointerMove = () => {
                var ray = VrManager.getInstance?.rightControllerRayHitInfo;
                var point:Vector3 = new Vector3();
                if (!ray || !ray.pickedPoint) {
                    point.copyFrom(position);
                }
                else
                {
                    point = ray.pickedPoint;
                }
                MeasureMenuController.instance.updateMeasuringDisplay(point);
            }
        } 
        else 
        {
            MeasureMenuController.instance.completeMeasurement(position);
            // this.completeMeasurement(position);
            // // Remove the pointer move event and dispose of the dynamic text
            this.scene.onPointerMove = undefined;
            // if (this.dynamicTextMesh) {
            //     this.dynamicTextMesh.dispose();
            //     this.dynamicTextMesh = null;
            // }
        }
    }

    /**
     * Completes the measurement by finalizing the line and adding an axis indicator at the end point.
     * @param endPoint - The end point of the measurement.
     */
    // private completeMeasurement(endPoint: Vector3) {
    //     if (this.currentLine && this.startPoint) {
    //         const distance = Vector3.Distance(this.startPoint, endPoint);
    //         this.currentLine.dispose();
    //         this.currentLine = MeshBuilder.CreateDashedLines("measureLine", {
    //             points: [this.startPoint, endPoint],
    //             dashSize: 0.1,
    //             gapSize: 0.1,
    //             dashNb: Math.max(5, Math.floor(distance * 20))
    //         }, this.scene);
    //         this.currentLine.isPickable = false;

    //         this.createAxisIndicator(endPoint);
    //         const textMesh = this.createMeasurementText(`${distance.toFixed(2)}m`, this.startPoint.add(endPoint).scale(0.5));
    //         this.measurements.push({ line: this.currentLine, text: textMesh });

    //         this.startPoint = null;
    //         this.currentLine = null;
    //     }
    // }

    /**
     * Creates a 3D text mesh to display the measurement.
     * @param text - The text to display.
     * @param position - The position of the text in 3D space.
     * @returns A mesh representing the 3D text.
     */
    private createMeasurementText(text: string, position: Vector3) { //}: Mesh {
        MeasureMenuController.instance.createMeasurementText(text, position);
        // const plane = MeshBuilder.CreatePlane("textPlane", { width: 1, height: 0.5 }, this.scene);
        // plane.position = position.add(new Vector3(0, 0.1, -0.1));
        // plane.renderingGroupId = RenderConfig.gui
        // const dynamicTexture = AdvancedDynamicTexture.CreateForMesh(plane, 1024, 512);

        // const container = new Rectangle();
        // container.width = 1;
        // container.height = 1;
        // container.thickness = 0;
        // dynamicTexture.addControl(container);

        // const shadowText = new TextBlock();
        // shadowText.text = text;
        // shadowText.color = "black";
        // shadowText.fontSize = 200;
        // shadowText.fontWeight = "bold";
        // shadowText.left = 4;
        // shadowText.top = 4;
        // container.addControl(shadowText);

        // const mainText = new TextBlock();
        // mainText.text = text;
        // mainText.color = "white";
        // mainText.fontSize = 200;
        // mainText.fontWeight = "bold";
        // container.addControl(mainText);

        // plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        // plane.isPickable = false;

        // return plane;
    }
}
