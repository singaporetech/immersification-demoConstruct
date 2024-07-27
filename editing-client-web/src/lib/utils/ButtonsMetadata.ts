import { Mesh, AbstractActionManager} from "@babylonjs/core"

export class MarkerButtonMetadata{
    public id: number
    public isHovered
    public isSelected

    constructor(id: number = -1, hovered: boolean = false, selected: boolean = false){
        this.id = id
        this.isHovered = hovered
        this.isSelected = selected
    }
}

export class MarkerImageMetaData{
    markerId: number
    meshObject: Mesh
    actionManager?: AbstractActionManager
    constructor(id: number, mesh: Mesh, actionManager?: AbstractActionManager){
        this.markerId = id
        this.meshObject = mesh
        this.actionManager = actionManager
    }
}
