import { Control, Rectangle } from "@babylonjs/gui"
import { ColorScheme } from "./ColorScheme"
import { ButtonMetadata } from "./data/ObjectsData"

export class UIUtility
{
    static SetSelectedOn(buttonRef: Control) {
        if(buttonRef.metadata instanceof ButtonMetadata){
            buttonRef.metadata.isSelected = true
        }

        if(buttonRef instanceof Rectangle)
            UIUtility.SetColor(buttonRef as Rectangle, buttonRef.metadata)
    }

    static SetSelectedOff(buttonRef: Control) {
        if(buttonRef.metadata instanceof ButtonMetadata){
            buttonRef.metadata.isSelected = false
        }

        if(buttonRef instanceof Rectangle)
            UIUtility.SetColor(buttonRef as Rectangle, buttonRef.metadata)
    }
    
    static SetHoverOn(buttonRef: Control){
        if(buttonRef.metadata instanceof ButtonMetadata){
            buttonRef.metadata.isHovered = true
        }

        if(buttonRef instanceof Rectangle)
            UIUtility.SetColor(buttonRef as Rectangle, buttonRef.metadata)
    }

    static SetHoverOff(buttonRef: Control){
        if(buttonRef.metadata instanceof ButtonMetadata){
            buttonRef.metadata.isHovered = false
        }

        if(buttonRef instanceof Rectangle)
            UIUtility.SetColor(buttonRef as Rectangle, buttonRef.metadata)
    }
    
    static SetColor(rect: Rectangle, metadata: ButtonMetadata){
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
                rect.background = ColorScheme.Selectable
                rect.alpha = 1
            }
        }
    }
}