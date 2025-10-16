import { Axis, Mesh, MeshBuilder, Scene, Vector3, LinesMesh, StandardMaterial, Color3 } from "@babylonjs/core";
import { Rectangle, TextBlock, Image, AdvancedDynamicTexture } from "@babylonjs/gui";
import { AssetConfig, RenderConfig } from "../config";
import { ObjectPickingManager } from "../objectPickingSelection/ObjectPickingManager";
import { AnnotationComponent } from "../roomController/objects/components/AnnotationComponent";
import { AnnotationDataManager } from "../annotationTool/AnnotationDataManager";
import { AnnotationMenuController } from "./desktop/AnnotationMenuController";
import { FunctionUtiliy } from "../utilities/FunctionUtility";
import { AnnotationToolManager } from "../annotationTool/AnnotationToolManager";
import VRAnnotationViewerMenuController from "./vr/VRAnnotationViewerMenuController";

export class MeasurementPlateObject //extends SpatialUIObject
{
    line: LinesMesh;
    textMesh: Mesh

    startAxis: Map<Number, LinesMesh> = new Map<Number, LinesMesh>;
    endAxis: Map<Number, LinesMesh> = new Map<Number, LinesMesh>;

    annotationComponent: AnnotationComponent;
    
    scene: Scene;
    /**
     * Initializes the spatial UI plate object, and sets
     * the position and displayed text and images according to the annotation reference ID in `annotationComponent`.
     * @param objectName 
     * @param size 
     * @param position 
     * @param scene 
     */
    async init(scene: Scene)
    {
        // this.annotationComponent = new AnnotationComponent(annotationDataID);
        // await super.init(uiTemplateUrl, scaling, width, height, position, scene);
        this.scene = scene;
    }

    async initPlate(startPoint: Vector3,
        endPoint: Vector3,
        distance: number)
    {
        this.createPlate(startPoint, endPoint, distance);
        this.createStartAxis(startPoint);
        this.createEndAxis(endPoint);
    }

    async createPlate(startPoint: Vector3,
        endPoint: Vector3,
        distance: number)
    {
        this.line = MeshBuilder.CreateDashedLines("measureLine", {
            points: [startPoint, endPoint],
            dashSize: 0.1,
            gapSize: 0.1,
            dashNb: Math.max(5, Math.floor(distance * 20))
        }, this.scene);
        this.line.renderingGroupId = RenderConfig.highlights;
        this.line.isPickable = false;

        this.textMesh = this.create3DText(
            `${distance.toFixed(2)}m`,
            startPoint.add(endPoint).scale(0.5));
    }

    /**
     * Creates a 3D text mesh at the specified position with a dark outline for better visibility.
     * @param text - The text to display.
     * @param position - The position of the text in 3D space.
     * @returns A mesh representing the 3D text.
     */
    public create3DText(text: string, position: Vector3): Mesh {
        const plane = MeshBuilder.CreatePlane("textPlane", { width: 1, height: 0.5 }, this.scene);

        // Offset the position vertically higher and slightly forward
        const offsetY = 0.1; // Adjust this value to move the text higher
        const offsetZ = -0.1; // Adjust this value to move the text forward (towards the viewer)
        plane.position = position.add(new Vector3(0, offsetY, offsetZ));
        plane.renderingGroupId = RenderConfig.highlights
        const dynamicTexture = AdvancedDynamicTexture.CreateForMesh(plane, 1024, 512);

        // Create a container for the text and its shadow
        const container = new Rectangle();
        container.width = 1;
        container.height = 1;
        container.thickness = 0;
        dynamicTexture.addControl(container);

        // Create the shadow text
        const shadowText = new TextBlock();
        shadowText.text = text;
        shadowText.color = "black";
        shadowText.fontSize = 200;
        shadowText.fontWeight = "bold";
        shadowText.left = 4;  // Offset for shadow effect
        shadowText.top = 4;   // Offset for shadow effect
        container.addControl(shadowText);

        // Create the main text
        const mainText = new TextBlock();
        mainText.text = text;
        mainText.color = "white";
        mainText.fontSize = 200;
        mainText.fontWeight = "bold";
        container.addControl(mainText);

        // Make the text always face the camera
        plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
        ObjectPickingManager.instance.hlLayer.addExcludedMesh(plane);

        // Make the text not clickable
        plane.isPickable = false;

        return plane;
    }

        /**
     * Creates a small 3-axis indicator at the given position.
     * This helps users visualize the orientation of the measurement point.
     * @param position - The position where the axis should be created.
     */
    public createStartAxis(position: Vector3) {
        const size = 0.1; // Size of the axis lines

        // Create X axis (Red)
        const x = MeshBuilder.CreateLines("ExAxis", {
            points: [position, position.add(new Vector3(size, 0, 0))]
        }, this.scene);
        const xMaterial = new StandardMaterial("ExMaterial", this.scene);
        xMaterial.diffuseColor = Color3.Red();
        x.isPickable = false;
        x.color = xMaterial.diffuseColor;        
        this.startAxis.set(0, x);

        // Create Y axis (Green)
        const y = MeshBuilder.CreateLines("EyAxis", {
            points: [position, position.add(new Vector3(0, size, 0))]
        }, this.scene);
        const yMaterial = new StandardMaterial("EyMaterial", this.scene);
        yMaterial.diffuseColor = Color3.Green();
        y.isPickable = false;
        y.color = yMaterial.diffuseColor;  
        this.startAxis.set(1, y);

        // Create Z axis (Blue)
        const z = MeshBuilder.CreateLines("EzAxis", {
            points: [position, position.add(new Vector3(0, 0, size))]
        }, this.scene);
        const zMaterial = new StandardMaterial("EzMaterial", this.scene);
        zMaterial.diffuseColor = Color3.Blue();
        z.isPickable = false;
        z.color = zMaterial.diffuseColor;  
        this.startAxis.set(2, z);
    }
    
    public createEndAxis(position: Vector3) {
        const size = 0.1; // Size of the axis lines

        // Create X axis (Red)
        const x = MeshBuilder.CreateLines("ExAxis", {
            points: [position, position.add(new Vector3(size, 0, 0))]
        }, this.scene);
        const xMaterial = new StandardMaterial("ExMaterial", this.scene);
        xMaterial.diffuseColor = Color3.Red(); 
        x.isPickable = false;
        x.color = xMaterial.diffuseColor;        
        this.endAxis.set(0, x);

        // Create Y axis (Green)
        const y = MeshBuilder.CreateLines("EyAxis", {
            points: [position, position.add(new Vector3(0, size, 0))]
        }, this.scene);
        const yMaterial = new StandardMaterial("EyMaterial", this.scene);
        yMaterial.diffuseColor = Color3.Green();
        y.isPickable = false;
        y.color = yMaterial.diffuseColor;  
        this.endAxis.set(1, y);

        // Create Z axis (Blue)
        const z = MeshBuilder.CreateLines("EzAxis", {
            points: [position, position.add(new Vector3(0, 0, size))]
        }, this.scene);
        const zMaterial = new StandardMaterial("EzMaterial", this.scene);
        zMaterial.diffuseColor = Color3.Blue();
        z.isPickable = false;
        z.color = zMaterial.diffuseColor;  
        this.endAxis.set(2, z);
    }

    clearGUI()
    {
        if(this.line)
        {
            this.line.dispose();
        }
        this.line = null;

        if(this.textMesh)
        {
            this.textMesh.dispose();
        }
        this.textMesh = null;

        for (const axis of this.startAxis.values()) {
            if(axis)
            {
                axis.dispose();
            }
        }
        this.startAxis.clear(); 

        for (const axis of this.endAxis.values()) {
            if(axis)
            {
                axis.dispose();
            }
        }
        this.endAxis.clear();  
    }    
}
