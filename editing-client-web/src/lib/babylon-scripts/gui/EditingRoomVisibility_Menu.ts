import { AdvancedDynamicTexture, Rectangle } from "@babylonjs/gui";
import { Scene, Observer } from "@babylonjs/core";
import { MarkerButtonMetadata } from "../../utils/ButtonsMetadata";
import { UIUtility } from "../../utils/UIUtility";
import { DisplayStates } from "../../utils/enums";
import { EditingRoomMarkerUI_V2 } from "./EditingRoomMarkerUI_V2";

export class EditingRoomVisibility_Menu
{
    public static instance: EditingRoomVisibility_Menu | null
    advDynamicTexture: AdvancedDynamicTexture | null = null
    
    scene: Scene
    sceneOnPointerObserver: Observer<any> | null = null

    markerVisibilityButton: Rectangle | null = null             //Marker visibility Toggle button

    displayState: number = 1

    constructor()
    {
    }

    Init(advDynamicTexture: AdvancedDynamicTexture, scene: Scene)
    {
        this.advDynamicTexture = advDynamicTexture
        this.scene = scene

        //Setting up Marker View Toggle
        this.markerVisibilityButton = this.advDynamicTexture.getControlByName("Marker_Visibility") as Rectangle
        this.markerVisibilityButton.children[0].isEnabled = false

        this.markerVisibilityButton.metadata = new MarkerButtonMetadata(-1, false, true)
        UIUtility.setButtonColor(this.markerVisibilityButton as Rectangle, this.markerVisibilityButton.metadata)

        this.markerVisibilityButton.onPointerEnterObservable.add(UIUtility.hoverOnFunc)
        this.markerVisibilityButton.onPointerOutObservable.add(UIUtility.hoverOffFunc)
        this.markerVisibilityButton.onPointerUpObservable.add((mousePos, eventState)=>{
            mousePos //Suppress warning
            if(eventState.target !== this.markerVisibilityButton) 
                return

            eventState.target.metadata.isSelected = !eventState.target.metadata.isSelected
            EditingRoomMarkerUI_V2.instance?.ToggleDisplayMarkers();
            UIUtility.setButtonColor(eventState.target as Rectangle, eventState.target.metadata)
        })

        EditingRoomMarkerUI_V2.instance?.ToggleDisplayMarkers(DisplayStates.All);
    }
}