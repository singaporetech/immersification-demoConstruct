import { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui";

export class ModelBrowser_ObjectInfo_Menu{
    
    constructor(){
    }

    Init(babylonjsAdvanceTexture: AdvancedDynamicTexture){
        const infoMenuContainer = babylonjsAdvanceTexture.getControlByName("ObjectInfo_Container") as Rectangle
        infoMenuContainer.isVisible = false
    }
}