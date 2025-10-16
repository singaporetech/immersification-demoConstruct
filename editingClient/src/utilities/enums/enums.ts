export enum ActionStates {
    None = 0,
    Add = 1,
    Remove = 2,
    view = 3,
    cancel = 4
}

/**
 * Indicates the current state of the tool.
 * Some tools may bypass certain states. E.g. tool selector will always transit from inactive (0) to active (1).
 * 0 = not selected, inactive]
 * 1 = selected, but not in use
 * 2 = selected and in use
 * 3 = ended use
 * 4 = completed using tool
 */
export enum ToolState {
    inactive = 0,
    standby = 1,
    active = 2,
    ended = 3,
    completed = 4,
}

export enum DisplayStates {
    None= 0,
    Partial= 1,
    All= 2
}

export enum MarkerTypes {
    ambulance= 1,
    debrisclearingteam= 2,
    electricalhazard= 3,
    searchsite= 4
}

export enum deviceInputType {
    pc = 1,
    vr = 2,
}

export enum serverobjectType {
    invaild = 0,
    model = 1,
    marker = 2,
    measurement = 3
}

export enum toolType {
    none = 0,
    transform = 1,
    object = 2,
    marker = 3,
    measurement = 4,
    annotation = 5,
}

export enum modelType {
    meshType = 0,
    gaussianType = 1,
    dualType = 2
}

export enum renderState {
    none = 0,
    meshOnly = 1,
    gaussianOnly = 2,
    combined = 3,
}