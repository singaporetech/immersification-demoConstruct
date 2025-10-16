import {
   Scene, 
   Vector3, 
   Mesh,
   Quaternion,
   Axis,
   Space,
   Tools
 } from "@babylonjs/core";
import { VrManager } from "../../modeController/vr/VrManager";
import { ObjectPickingManager } from "../../objectPickingSelection/ObjectPickingManager";
import { ServerModelMetadata } from "../../utilities/data/ObjectsData";
 
 export class VrTransformToolManager
 {
   public toolID: any;

   public static instance: VrTransformToolManager | null = null;
   private scene!: Scene;
   private xrHelper!: any;
   
   // Settings (Modify as needed)
   public scaleRatio = .05;
   public rotateSpeed = .06;
   public moveSpeed = .2;

   // Assignment variables (do not modify)
   public followingMesh: any;
   public grabbedObject: any;
   public grabbedDis: number;
   public grabbedDir: Vector3;

   public xrFeatureManager: any;
   public ground: any;

   public grabbingObject;

   public verticalOffset = 0;

   // ========================== General init and resets ==========================

   constructor()
   {
   }    

   public Init(scene: Scene, xrHelper: any, ground: any)
   {
      VrTransformToolManager.instance = this;

      this.toolID = 1;

      this.scene = scene;
      this.xrHelper = xrHelper;
      this.ground = ground;

      this.xrFeatureManager = xrHelper.baseExperience.featuresManager;

      // this.followingMesh = null;
      this.grabbedObject = undefined;
      this.grabbingObject = false;

      this.scene.registerBeforeRender( () =>
      {
         if(this.grabbingObject && this.grabbedObject !== undefined)
         {
            var transformedOffset = VrManager.getInstance?.rightControllerRaycast?.direction.scale(this.grabbedDis);
            this.grabbedObject.position.copyFrom(this.followingMesh.getAbsolutePosition().add(transformedOffset));
          }
      });
   }

   // ========================== General init and resets ==========================

   public TryGrab(/*objectMesh:any, */motionController: any, controller: any)
   {
      var grabbedObjTemp;
      if (this.xrHelper.pointerSelection.getMeshUnderPointer)
      {
         
         // Set which controller/hand is grabbing
         this.followingMesh = motionController.rootMesh;

         //Get a ref to whatever object the user is trying to grab
         grabbedObjTemp = this.xrHelper.pointerSelection.getMeshUnderPointer(controller.uniqueId);
         // var pickedWalkable = VRManager.getInstance?.locomotionMeshes.includes(grabbedObjTemp);

         // Check if the user is trying to grab an object or nothing at all
         // Also checks if the grabbed object can be manipluated by checking the 'editable' property in metadata
         if(grabbedObjTemp && grabbedObjTemp.metadata != null && grabbedObjTemp.metadata instanceof ServerModelMetadata && grabbedObjTemp.metadata.editable )
         {
            this.grabbedObject = grabbedObjTemp;
            this.grabbingObject = true;
            ObjectPickingManager.ActiveInstance?.SelectObject(this.grabbedObject);

            // Use the object and conroller position and rotation to do some offsetting so that
            // when grabbed the object aligns with the user's controller
            var meshPos = this.grabbedObject.getAbsolutePosition();
            var conPos = this.followingMesh.getAbsolutePosition();
            this.grabbedDis = Vector3.Distance(conPos, meshPos);
            this.grabbedDir = meshPos.subtract(conPos);
            this.grabbedDir.normalize();
         }
         else
         {
            // User is not grabbing anything or tried to grab an invaild object
            this.grabbedObject = undefined;
            console.log("No valid object to grab");
         }
      }

   }

   public ReleaseGrab()
   {
      if(this.grabbedObject !== undefined)
      {
         this.grabbingObject = false;
         this.grabbedObject.setParent(null);   
         this.grabbedObject = undefined;
         ObjectPickingManager.ActiveInstance?.ClearSelection();
      }
   }

   public TryMove(input: number)
   {
      if(!this.grabbedObject)
         return;

      let yAbs = Math.abs(input);

      if(yAbs > 0.5)
      {
         if(this.grabbedObject)
         {
            let scaleDir = input >= 0 ? -1 : 1;
            let value = scaleDir * this.moveSpeed;
            this.grabbedDis += value;
         }
      }
   }

   public TryScale(input: number)
   {
      if(!this.grabbedObject)
         return;

      let yAbs = Math.abs(input);

      if(yAbs > 0.5)
      {
         if(this.grabbedObject)
         {
            let scaleDir = input >= 0 ? 1 : -1;
            this.grabbedObject.scaling.x += (this.grabbedObject.scaling.x * this.scaleRatio) * scaleDir
            this.grabbedObject.scaling.y += (this.grabbedObject.scaling.y * this.scaleRatio) * scaleDir
            this.grabbedObject.scaling.z += (this.grabbedObject.scaling.z * this.scaleRatio) * scaleDir
         }
      }
   }

   public TryRotateRoll(input: number)
   {
      if(!this.grabbedObject)
         return;

      let yAbs = Math.abs(input);

      if(yAbs > 0.5)
      {
         // const rotationAngle = this.rotateSpeed * (input >= 0 ? -1 : 1);
         // this.pickedMesh.rotate(Axis.Y, rotationAngle, Space.WORLD);

         // Convert the current rotation from degrees to radians
         const currentRotationY = Tools.ToRadians(this.grabbedObject.rotation.y);

         // Add the roll angle to the current rotation
         const newRollRotation = currentRotationY + Tools.ToRadians(this.rotateSpeed * (input >= 0 ? -1 : 1));

         // Apply the new roll rotation
         this.grabbedObject.rotation.y = Tools.ToDegrees(newRollRotation);
      }
   }
   
   public TryRotatePitch(input: number)
   {
      if(!this.grabbedObject)
         return;

      let yAbs = Math.abs(input);

      if(yAbs > 0.5)
      {         
         // Convert the current rotation from degrees to radians
         const currentRotationZ = Tools.ToRadians(this.grabbedObject.rotation.z);

         // Add the roll angle to the current rotation
         const newRollRotation = currentRotationZ + Tools.ToRadians(this.rotateSpeed * (input >= 0 ? -1 : 1));

         // Apply the new roll rotation
         this.grabbedObject.rotation.z = Tools.ToDegrees(newRollRotation);
      }
   }

 }