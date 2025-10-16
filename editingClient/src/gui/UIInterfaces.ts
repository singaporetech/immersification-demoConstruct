import { Scene } from "@babylonjs/core"
import { AdvancedDynamicTexture } from "@babylonjs/gui"

export interface IUIGroup{
    babylonAdvanceTexture: AdvancedDynamicTexture
  
    Initialize(scene: Scene): Promise<void>
    Uninitialize(): void
    SetVisibility(isVisible: boolean): void
    Update(): void
  }