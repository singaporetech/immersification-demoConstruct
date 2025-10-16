/**
 * @file MeasureMenuController.ts
 * @description This file contains the MeasureMenuController class, which manages the UI and functionality
 * for measuring distances within a 3D scene using Babylon.js. It allows users to create measurement lines
 * and displays the distance between two points in the scene.
 * 
 * @author nirmalsnair, leonfoo
 * @date 09/12/2024
 */

import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";
import { Scene, Vector3, MeshBuilder, LinesMesh, Mesh } from "@babylonjs/core";
import { GuiMenu, GuiMenuToggle, GuiMenuManager } from "../GuiMenu";
import { SocketHandler } from "../../networking/WebSocketManager";
import { MeasurementData } from "../../utilities/data/MeasurementData";
import { RenderConfig } from "../../config";
import { MeasurementPlateObject } from "../MeasurementPlateObject";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { UIUtility } from "../../utilities/UIUtility";
import { PointerInfo, PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { IPointerEvent } from "@babylonjs/core/Events/deviceInputEvents";

/**
 * Manages the measurement functionality in the 3D scene.
 * Implements a singleton pattern for global access.
 */
export class MeasureMenuController 
{

    public static instance: MeasureMenuController | null = null;
    
    scene!: Scene;
    toggleButton!: Rectangle;
    /** Stores all active measurements in the scene */
    measurementsList: Map<number, MeasurementData>;
    
    /** The starting point of the current measurement */
    startPoint: Vector3 | null = null;
    /** The current line being drawn for measurement */
    currentLine: LinesMesh | null = null;
    currentxAxis: LinesMesh | null = null;
    currentyAxis: LinesMesh | null = null;
    currentzAxis: LinesMesh | null = null;
    
    // Store observable handlers for proper cleanup
    private pointerObserver: any = null;
    private beforeRenderObserver: any = null;
    // Add a property to hold the dynamic text mesh
    dynamicTextMesh: Mesh | null = null;

    public plateObjects: Map<number, MeasurementPlateObject> = new Map<number, MeasurementPlateObject>;

    constructor() 
    {
        MeasureMenuController.instance = this;
        this.measurementsList = new Map<number, MeasurementData>(); // Initialize the measurementsList
    }

    /**
     * Initializes the Measure Menu Controller with the given dynamic texture and scene.
     * @param advDynamicTexture - The advanced dynamic texture for GUI controls.
     * @param scene - The Babylon.js scene.
     */
    public Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene): void 
    {
        this.scene = scene;

        this.toggleButton = advDynamicTexture.getControlByName("Navbar_MenuToggle_Measure") as Rectangle;
        this.toggleButton.metadata = new ButtonMetadata(-1, false, false);

        // Ensure the text block does not block pointer events
        const buttonText = this.toggleButton.getChildByName("Textblock") as TextBlock;
        if (buttonText)
        {
            buttonText.isPointerBlocker = false; // Allow pointer events to pass through
        }

        // Add hover effects to the toggle button
        this.toggleButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.toggleButton.onPointerOutObservable.add(UIUtility.SetHoverOff)

        // Setup GUI menu and toggle group
        const guiMenu = new GuiMenu(this.toggleButton);
        guiMenu.OnEnableCallback = () => 
            {
            this.enableMeasuring();
            this.toggleButton.metadata.isSelected = true;
        };

        guiMenu.OnDisableCallback = () => 
            {
            this.disableMeasuring();
            this.toggleButton.metadata.isSelected = false;
        };

        const menuMeasureGroup = new GuiMenuToggle(this.toggleButton, guiMenu);
        const toggleGroup = GuiMenuManager.instance.FindOrCreateToggleGroup("Navbar");
        toggleGroup.AddToggle(menuMeasureGroup);
        // Handle button selection
        this.toggleButton.onPointerDownObservable.add(() => 
            {
            toggleGroup.ActivateToggle(menuMeasureGroup);
        });
    }

    /**
     * Creates a small 3-axis indicator at the given position.
     * This helps users visualize the orientation of the measurement point.
     * @param position - The position where the axis should be created.
     */
    public createAxisIndicator(position: Vector3): void 
    {
        // Use the class from MeasurementPlateObject to create axis indicators
        const tempPlateObject = new MeasurementPlateObject();
        tempPlateObject.init(this.scene);        
        tempPlateObject.createStartAxis(position);
        
        // Manually extract and store the axes from the temporary object
        this.currentxAxis = tempPlateObject.startAxis.get(0) as LinesMesh;
        this.currentyAxis = tempPlateObject.startAxis.get(1) as LinesMesh;
        this.currentzAxis = tempPlateObject.startAxis.get(2) as LinesMesh;
        
        // Clear the temporary object's references so it doesn't dispose our axes
        tempPlateObject.startAxis.clear();
    }

    /**
     * Clears and disposes the current axis indicators.
     */
    private clearCreateAxisIndicator(): void
     {
        if (this.currentxAxis) 
            {
            this.currentxAxis.dispose();
            this.currentxAxis = null;
        }
        
        if (this.currentyAxis)
             {
            this.currentyAxis.dispose();
            this.currentyAxis = null;
        }
        
        if (this.currentzAxis) 
            {
            this.currentzAxis.dispose();
            this.currentzAxis = null;
        }
    }

    /**
     * Enables the measuring functionality, allowing users to create measurement lines.
     * Sets up event listeners for pointer interactions and keyboard input.
     */
    private enableMeasuring(): void 
    {
        if (!this.scene) return;

        const onKeyDown = (event: KeyboardEvent) =>
             {
            if (event.key === "Escape") 
                {
                this.disableMeasuring();
            }
        };
        
        window.addEventListener("keydown", onKeyDown);

        this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => 
            {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) 
                {
                this.handlePointerDown(pointerInfo);
            }
        });
        

        this.beforeRenderObserver = this.scene.onBeforeRenderObservable.add(() => this.handlePointerMove());

        this.scene.onDisposeObservable.addOnce(() => 
            {
            window.removeEventListener("keydown", onKeyDown);
        });
    }

    /**
     * Handles pointer down events for measurements.
     * First click sets the start point, second click sets the end point.
     */
    private handlePointerDown(pointerInfo: PointerInfo): void 
    {
        if (!this.scene) return;

        const event = pointerInfo.event as IPointerEvent;
        // Check if it's a mouse event with non-left button
        if (event.pointerType === "mouse" && event.button !== 0) return;
        
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!pickResult.hit || !pickResult.pickedPoint) return;

        if (!this.startPoint) 
            {
            // First click - start measurement
            this.createAxisIndicator(pickResult.pickedPoint);
            this.startNewMeasurement(pickResult.pickedPoint);
        } else 
            {
            // Second click - complete measurement
            this.clearCreateAxisIndicator();
            this.completeMeasurement(pickResult.pickedPoint);
        }
    }

    /**
     * Handles pointer move events for updating the measurement preview.
     */
    private handlePointerMove(): void 
    {
        if (!this.scene || !this.startPoint || !this.currentLine) return;

        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!pickResult.hit || !pickResult.pickedPoint) return;

        this.updateMeasuringDisplay(pickResult.pickedPoint);
    }

    /**
     * Starts a new measurement from the given point.
     * @param pickedPoint - The starting point of the measurement.
     */
    public startNewMeasurement(pickedPoint: Vector3): void 
    {
        this.startPoint = pickedPoint.clone();
        this.currentLine = MeshBuilder.CreateLines("measureLine", 
            {
            points: [this.startPoint, this.startPoint.clone()],
            updatable: true
        }, this.scene);
        this.currentLine.renderingGroupId = RenderConfig.highlights;
        this.currentLine.isPickable = false;
    }

    /**
     * Completes the current measurement with the given end point.
     * @param endPoint - The ending point of the measurement.
     */
    public completeMeasurement(endPoint: Vector3): void 
    {
        const distance = Vector3.Distance(this.startPoint, endPoint);

        const measurementId = Math.floor(10000000 + Math.random() * 90000000);
        const sendData = 
        {
            measurement_instance_id: measurementId,
            startPoint: this.startPoint,
            endPoint: endPoint,
            distanceMeasured: distance
        };

        // Send the measurement data to the server
        this.SendCreateNewMeasurementRequestToServer(sendData);

        //dispose tool line UI
        if (this.currentLine) 
            {
            this.currentLine.dispose();
        }

        // Dispose of the dynamic text
        if (this.dynamicTextMesh) 
            {
            this.dynamicTextMesh.dispose();
            this.dynamicTextMesh = null;
        }

        // Reset for the next measurement
        this.startPoint = null;
        this.currentLine = null;
    }

    /**
     * Updates the measurement display while dragging.
     * @param pickedPoint - The current endpoint based on pointer position.
     */
    public updateMeasuringDisplay(pickedPoint: Vector3): void 
    {
        if (!this.startPoint) return;
        
        // Update the line to show the current measurement
        this.currentLine = MeshBuilder.CreateLines("measureLine", 
            {
            points: [this.startPoint, pickedPoint],
            instance: this.currentLine
        });

        const distance = Vector3.Distance(this.startPoint, pickedPoint);
        const midPoint = this.startPoint.add(pickedPoint).scale(0.5);

        // Clean up previous text mesh if it exists
        if (this.dynamicTextMesh) 
            {
            this.dynamicTextMesh.dispose();
        }
        
        // Create a new text mesh showing the current distance
        this.dynamicTextMesh = this.createMeasurementText(`${distance.toFixed(2)}m`, midPoint);
    }

    /**
     * Creates a 3D text mesh at the specified position with a dark outline for better visibility.
     * @param text - The text to display.
     * @param position - The position of the text in 3D space.
     * @returns A mesh representing the 3D text.
     */
    public createMeasurementText(text: string, position: Vector3): Mesh 
    {
        // Create a temporary plate object to use its text creation method
        const tempPlateObject = new MeasurementPlateObject();
        tempPlateObject.init(this.scene);        
        return tempPlateObject.create3DText(text, position);
    }

    /**
     * Disables the measuring functionality, stopping any active measurements.
     * Cleans up event listeners and resets the current measurement state.
     */
    private disableMeasuring(): void {
        if (!this.scene) return;

        if (this.pointerObserver) 
            {
            this.scene.onPointerObservable.remove(this.pointerObserver);
            this.pointerObserver = null;
        }
        
        if (this.beforeRenderObserver) 
            {
            this.scene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
            this.beforeRenderObserver = null;
        }
        
        // Clear state
        this.startPoint = null;
        
        // Dispose of resources
        if (this.currentLine) 
            {
            this.currentLine.dispose();
            this.currentLine = null;
        }
        
        if (this.dynamicTextMesh) 
            {
            this.dynamicTextMesh.dispose();
            this.dynamicTextMesh = null;
        }
        
        this.clearCreateAxisIndicator();
    }

    /**
     * Attempts to add a measurement entry and create its respective UI objects.
     * @param jsonData The data used to create the measurement entry.
     */
    public TryAddMeasurementObject(jsonData: 
        {
        measurement_instance_id: number,
        startPoint: Vector3,
        endPoint: Vector3,
        distanceMeasured: number
    }): void 
    {
        if (!MeasureMenuController.instance) 
            {
            console.error("MeasureMenuController instance not initialized");
            return;
        }
        
        if (this.measurementsList.has(jsonData.measurement_instance_id)) 
            {
            console.log(`Measurement ID ${jsonData.measurement_instance_id} already exists.`);
            return;
        }

        try 
        {
            // Create a new measurement data entry
            const newMeasurementEntry = new MeasurementData(
                jsonData.measurement_instance_id,
                jsonData.startPoint,
                jsonData.endPoint,
                jsonData.distanceMeasured
            );

            let startPoint: Vector3;
            let endPoint: Vector3;
            
            if (jsonData.startPoint instanceof Vector3) 
                
                {
                startPoint = jsonData.startPoint;
            } else 
                {
                // Handle different JSON formats for Vector3
                const sp = jsonData.startPoint as any;
                startPoint = new Vector3(
                    sp._x !== undefined ? sp._x : (sp.x !== undefined ? sp.x : 0),
                    sp._y !== undefined ? sp._y : (sp.y !== undefined ? sp.y : 0),
                    sp._z !== undefined ? sp._z : (sp.z !== undefined ? sp.z : 0)
                );
            }
            
            if (jsonData.endPoint instanceof Vector3) 
                {
                endPoint = jsonData.endPoint;
            } else
                 {
                // Handle different JSON formats for Vector3
                const ep = jsonData.endPoint as any;
                endPoint = new Vector3(
                    ep._x !== undefined ? ep._x : (ep.x !== undefined ? ep.x : 0),
                    ep._y !== undefined ? ep._y : (ep.y !== undefined ? ep.y : 0),
                    ep._z !== undefined ? ep._z : (ep.z !== undefined ? ep.z : 0)
                );
            }
                
            const distance = jsonData.distanceMeasured;           
            this.measurementsList.set(jsonData.measurement_instance_id, newMeasurementEntry);

            // ============= Create UI and store them =============
            const newMeasurementPlate = new MeasurementPlateObject();
            newMeasurementPlate.init(this.scene);
            newMeasurementPlate.initPlate(startPoint, endPoint, distance);

            this.plateObjects.set(jsonData.measurement_instance_id, newMeasurementPlate);
        } catch (error) 
        {
            console.error("Error adding measurement object:", error);
        }
    }

    // ================= Networking /websocket functions =================
    // Use these for sending measured data to the server, 
    // which the server will then broadcast to all other clients.

    /**
     * Called when user creates a new measurement.
     * Will send a request to the server to broadcast the new measurement to all
     * users in the room.
     * @param sendData - The data to send to the server.
     */
    private SendCreateNewMeasurementRequestToServer(sendData: {
        measurement_instance_id: number,
        startPoint: Vector3,
        endPoint: Vector3,
        distanceMeasured: number
    }): void 
    {
        try 
        {
            // This function is what sends data from the client to the server.
            // first para "SocketHandler.CodeToServer.EditServer_ClientRequest_CreateMeasurementObject,"
            // is a number code that tells the server how they should process the `sendData`, and what to do with it.
            // 2nd para "sendData", is the above json data const previously created that will be sent to the server.
            // Send data from the client to the server
            SocketHandler.SendData(
                SocketHandler.CodeToServer.EditServer_ClientRequest_CreateMeasurementObject,
                sendData
            );

            console.log("New measurement request sent to server:", sendData.measurement_instance_id);
        } catch (error) {
            console.error("Error sending measurement to server:", error);
        }
    }

    /**
     * This function is called in the `HandleRoomUpdate` func of `Sessionmanager.ts`.
     * It processes data sent from the server to create the measurement data, UI, etc.
     * @param measureDataArray An array of measurementData in json format.
     */
    public ReceiveCreateNewMeasurementRequestFromServer(measureDataArray: any[]): void {
        if (!Array.isArray(measureDataArray)) {
            console.error("Received invalid measurement data format");
            return;
        }

        console.log(`Received ${measureDataArray.length} measurements from server`);

        // Process each measurement object in measureDataArray
        measureDataArray.forEach((dataEntry: 
            {
            measurement_instance_id: number,
            startPoint: Vector3,
            endPoint: Vector3,
            distanceMeasured: number
        }) => {
            if (dataEntry && dataEntry.measurement_instance_id) 
                {
                this.TryAddMeasurementObject(dataEntry);
            } else {
                console.warn("Received invalid measurement data entry:", dataEntry);
            }
        });
    }

    /**
     * Clears all measurement data from the list.
     */
    public clearMeasurementData(): void 
    {
        this.measurementsList.clear();
    }

    /**
     * Clears all GUI objects associated with measurements.
     */
    public clearGUIObjects(): void 
    {
        this.clearCreateAxisIndicator();
        
        for (const measurementPlate of this.plateObjects.values()) 
            {
            if (measurementPlate) 
                {
                measurementPlate.clearGUI();
            }
        }
        
        this.plateObjects.clear();
    }
    
    /**
     * Gets all current measurement data.
     * @returns An array of all measurement data.
     */
    public getAllMeasurements(): MeasurementData[] 
    {
        return Array.from(this.measurementsList.values());
    }
}
