import { MeshBuilder,
    Mesh,
    Scene,
    Vector3, StandardMaterial, Color3} from "@babylonjs/core";
import { OnTriggerComponent } from "../components/OnTriggerComponent";
import simpleDelegate from "../../utils/simpleDelegate";
import { VRManager } from "./VRManager";

export class VRToolSelectorUI
{
    public static instance: VRToolSelectorUI;

    private scene: Scene;

    public selectorMesh: Mesh;
    private transformToolMesh: Mesh;
    private objectsToolMesh: Mesh;
    private markerToolMesh: Mesh;

    public selectedToolIndex = 1; // 0 = none. 1 = transform. 2 = object 3 = markers
    public toolIndex = 0;

    //Components
    private triggerComponent: OnTriggerComponent | undefined;

    public startToolAction: simpleDelegate | undefined;
    public endToolAction: simpleDelegate | undefined;

    public vrMngr: VRManager;

    public parentController;
 
    // ================ Init and resets ================

    public Init(scene: Scene, motionController: any, vrMngr: VRManager)
    {
        VRToolSelectorUI.instance = this;

        this.toolIndex = 0;

        this.startToolAction = new simpleDelegate();
        this.endToolAction = new simpleDelegate();

        this.scene = scene;
        this.parentController = motionController;
        this.vrMngr = vrMngr;
        //this.xrHelper = xrHelper;

        this.selectorMesh = MeshBuilder.CreateSphere("Selector", { diameter: .15 }, this.scene);
        this.selectorMesh.position = new Vector3(0, 10, 0);

        this.selectorMesh.isVisible = true;
        this.selectorMesh.setEnabled(false);        

        this.transformToolMesh = MeshBuilder.CreateSphere("transformToolMesh", { diameter: .15 }, this.scene);
        this.transformToolMesh.position = new Vector3(-50, 2, .2);
        this.transformToolMesh.setEnabled(false);        
        
        this.objectsToolMesh = MeshBuilder.CreateSphere("objectsToolMesh", { diameter: .15 }, this.scene);
        this.objectsToolMesh.position = new Vector3(50, 2, .2);
        this.objectsToolMesh.setEnabled(false);

        this.markerToolMesh = MeshBuilder.CreateSphere("markerToolMesh", { diameter: .15 }, this.scene);
        this.markerToolMesh.position = new Vector3(0, 2, 5);
        this.markerToolMesh.setEnabled(false);

        var redMat = new StandardMaterial("redMat", this.scene);
        redMat.diffuseColor = Color3.Red();
        this.transformToolMesh.material = redMat;

        var blueMat = new StandardMaterial("blueMat", this.scene);
        blueMat.diffuseColor = Color3.Blue();
        this.objectsToolMesh.material = blueMat;

        var greenMat = new StandardMaterial("redMat", this.scene);
        greenMat.diffuseColor = Color3.Green();
        this.markerToolMesh.material = greenMat;
        
    //    this.triggerComponent = new OnTriggerComponent(this.mesh, 
    //                                                     this.scene, 
    //                                                     this.onTriggerEnter.bind(this), 
    //                                                     this.onTriggerExit.bind(this))

    // Temp solution till a proper ontrigger is implemented
        this.scene.registerBeforeRender( () =>
        {
            if(!this.selectorMesh.isEnabled())
                return;

            //Balloon 1 intersection -- transform tool
            if (this.selectorMesh.intersectsMesh(this.transformToolMesh, true)) {
                this.SetActiveToolIndex(1);
                
                this.vrMngr.VRModelBrowserToolCom.SetMenuVisibility(false);
                this.vrMngr.VRMakrerToolCom.SetMenuVisibility(false);      

                this.CloseMenu();
            }
            //Balloon 2 intersection -- model browser
            else if (this.selectorMesh.intersectsMesh(this.objectsToolMesh, true)) {
                this.SetActiveToolIndex(2);

                var forwardDirection = this.selectorMesh.forward;
                var rightDirection = this.selectorMesh.right;        
                var sideSpacing = 1;
                let forwardSpacing = .8;
                this.vrMngr.VRModelBrowserToolCom.advTexMesh.position = this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(-sideSpacing)).add(forwardDirection.scale(forwardSpacing));
                
                this.vrMngr.VRModelBrowserToolCom.SetMenuVisibility(true);
                this.vrMngr.VRMakrerToolCom.SetMenuVisibility(false);

                this.CloseMenu();
            }
            //Balloon 3 intersection
            else if (this.selectorMesh.intersectsMesh(this.markerToolMesh, true)) {
                this.SetActiveToolIndex(3);

                var forwardDirection = this.selectorMesh.forward;
                var rightDirection = this.selectorMesh.right;        
                var sideSpacing = 1;
                let forwardSpacing = .8;
                this.vrMngr.VRMakrerToolCom.advTexMesh.position = this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(-sideSpacing)).add(forwardDirection.scale(forwardSpacing));
                
                this.vrMngr.VRModelBrowserToolCom.SetMenuVisibility(false);   
                this.vrMngr.VRMakrerToolCom.SetMenuVisibility(true);             
                this.CloseMenu();

                //Some stuff to open the UI here
            }
        });
    }

    public SetupSelector_v2(parentController: any)
    {
        this.SetActiveToolIndex(0);

        this.selectorMesh.setParent(parentController.rootMesh);
        this.selectorMesh.position = new Vector3(0, 0, 0);
        this.selectorMesh.rotation = new Vector3(90, 0, 0); //Rotate 90 degrees as controller forward is pointing down for some reason
    }

    public SetActiveToolIndex(index: number)
    {
        this.selectedToolIndex = index;
    }
    
    public GetActiveToolIndex()
    {
        return this.selectedToolIndex;
    }

    // ================ Menu activation ================\

    public OpenMenu()
    {
        var forwardDirection = this.selectorMesh.forward;
        var rightDirection = this.selectorMesh.right;

        var sideSpacing = .15;
        let forwardSpacing = .23;

        // Transform Tool Mesh at the northwest relative to this.mesh
        this.transformToolMesh.position = this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(-sideSpacing)).add(forwardDirection.scale(forwardSpacing));
        // Objects Tool Mesh at the northeast relative to this.mesh
        this.objectsToolMesh.position = this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(sideSpacing)).add(forwardDirection.scale(forwardSpacing));      
         // Objects Tool Mesh at the northeast relative to this.mesh
         this.markerToolMesh.position = this.selectorMesh.getAbsolutePosition().add(rightDirection.scale(0)).add(forwardDirection.scale(forwardSpacing));

        this.transformToolMesh.setEnabled(true);
        this.objectsToolMesh.setEnabled(true);
        this.markerToolMesh.setEnabled(true);
        this.selectorMesh.setEnabled(true);
    }

    public CloseMenu()
    {
        this.selectorMesh.position = new Vector3(0, 1000, 0);
        this.transformToolMesh.setEnabled(false);
        this.objectsToolMesh.setEnabled(false);
        this.markerToolMesh.setEnabled(false);
        this.selectorMesh.setEnabled(false);
    }

    // ================ Collision and trigger events (not working atm) ================
    // TODO: WIP collision functions to be added, instead of putting the update in the registerBeforeRender which is called every frame
    private onTriggerEnter(evt: any): void {
    {
        const intersectedMesh = evt.source as Mesh;
        const targetMeshes = evt.parameter as Mesh[];
    }}
    
    private onTriggerExit(evt)
    {
  
    }

    public CheckName(name: string)
    {
        console.log("Entered trigger with " + name);
    }
}
