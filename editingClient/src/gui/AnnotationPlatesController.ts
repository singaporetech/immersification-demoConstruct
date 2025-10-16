import { Scene, Vector3} from "@babylonjs/core";
import { AssetConfig } from "../config";
import { AnnotationPlateUIObject } from "./AnnotationPlateObject";
import { AnnotationDataManager } from "../annotationTool/AnnotationDataManager";
import { AnnotationData } from "../utilities/data/AnnotationData";

export class AnnotationPlatesManager
{
    static instance: AnnotationPlatesManager;
    scene!: Scene

    public plateObjects: Map<number, AnnotationPlateUIObject> = new Map<number, AnnotationPlateUIObject>;

    constructor()
    {
    }

    init(scene:Scene)
    {
        this.scene = scene;        
        AnnotationPlatesManager.instance = this;
    }
    
    updatePlates()
    {
        const _this = AnnotationPlatesManager.instance;
        AnnotationDataManager.instance.dataList.forEach((value: AnnotationData, key: number) => {
            _this.plateObjects.get(key).updateDisplayFields();
            _this.plateObjects.get(key).setPosition();
        })
    }
    
    /**
     * Creates spatial UI scene objects associated with the a key:value in `AnnotationToolmanager.DataList`. 
     * @param annotationDataID The data ID the plate UI object will be associated to.
     * @returns 
     */
    addPlateObject(annotationDataID: number)
    {
        const _this = AnnotationPlatesManager.instance;

        if(_this.plateObjects.has(annotationDataID))
        {
            console.log("A plate instance linked to the annotation ID already exists!");
            return;
        }
        const plate = new AnnotationPlateUIObject();
        plate.init(AssetConfig.annotationUIPlate,
                    1.65,
                    792,
                    108,
                    new Vector3(0,0,0), 
                    _this.scene,
                    annotationDataID);

        _this.plateObjects.set(annotationDataID, plate);
    }

    clearGUIObjects()
    {
        const _this = AnnotationPlatesManager.instance;
        for (const plate of _this.plateObjects.values()) {
            if(plate.mesh)
            {
                plate.mesh.dispose();
            }
            if(plate.advTex)
            {
                plate.advTex.dispose();
            }
        }
        _this.plateObjects.clear();
    }
}
