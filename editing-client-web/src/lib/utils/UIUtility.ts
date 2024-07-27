import { Control, Rectangle } from "@babylonjs/gui"
import { MarkerButtonMetadata } from "./ButtonsMetadata"
import { ColorScheme } from "../babylon-scripts/ColorScheme"

export class UIUtility
{
    static setButtonColor(rect: Rectangle, metadata: MarkerButtonMetadata){
        if(metadata.isHovered){
            if(metadata.isSelected) {
                rect.background = ColorScheme.Selected
                rect.alpha = 1
            }
            else {
                rect.background = ColorScheme.hoverSelectable
                rect.alpha = 1
            }
        }else{
            if(metadata.isSelected) {
                rect.background = ColorScheme.Selected
                rect.alpha = 1
            }
            else {
                rect.background = ColorScheme.Selectable_Transparency
                rect.alpha = .7
            }
        }
    }

    static hoverOnFunc(eventData: Control){
        if(eventData.metadata instanceof MarkerButtonMetadata){
            eventData.metadata.isHovered = true
        }
        UIUtility.setButtonColor(eventData as Rectangle, eventData.metadata)
    }

    static hoverOffFunc(eventData: Control){
        if(eventData.metadata instanceof MarkerButtonMetadata){
            eventData.metadata.isHovered = false
        }
        UIUtility.setButtonColor(eventData as Rectangle, eventData.metadata)
    }
}