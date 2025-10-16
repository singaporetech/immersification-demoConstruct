import { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui";
import { Scene, Observer } from "@babylonjs/core";
import { ButtonMetadata } from "../../utilities/data/ObjectsData";
import { UIUtility } from "../../utilities/UIUtility";
import { DisplayStates } from "../../utilities/enums/enums";
import { MarkerMenuController } from "./MarkerMenuController";

/**
 * @description
 * handles the UI for interacting with marker visibility menu button.
 */
export class ObjectsVisibilityMenuController
{
    public static instance: ObjectsVisibilityMenuController | null
    advDynamicTexture: AdvancedDynamicTexture | null = null
    
    scene: Scene | null
    sceneOnPointerObserver: Observer<any> | null = null

    markerVisibilityButton: Rectangle | null = null             //Marker visibility Toggle button

    displayState: number = 1

    constructor()
    {
        this.scene = null
    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene)
    {
        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        //Setting up Marker View Toggle
        this.markerVisibilityButton = this.advDynamicTexture.getControlByName("Marker_Visibility") as Rectangle
        this.markerVisibilityButton.children[0].isEnabled = false

        this.markerVisibilityButton.metadata = new ButtonMetadata(-1, false, true)
        UIUtility.SetColor(this.markerVisibilityButton as Rectangle, this.markerVisibilityButton.metadata)

        this.markerVisibilityButton.onPointerEnterObservable.add(UIUtility.SetHoverOn)
        this.markerVisibilityButton.onPointerOutObservable.add(UIUtility.SetHoverOff)
        this.markerVisibilityButton.onPointerUpObservable.add((mousePos, eventState)=>{
            mousePos //Suppress warning
            if(eventState.target !== this.markerVisibilityButton) 
                return

            eventState.target.metadata.isSelected = !eventState.target.metadata.isSelected
            MarkerMenuController.instance?.ToggleDisplayMarkers();
            UIUtility.SetColor(eventState.target as Rectangle, eventState.target.metadata)
        })

        MarkerMenuController.instance?.ToggleDisplayMarkers(DisplayStates.All);
    }
}