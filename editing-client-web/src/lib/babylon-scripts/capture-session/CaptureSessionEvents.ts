/**
 * @fileoverview Deprecated!
 * TODO: Remove file and all references.
 * 
 */

import { DC_GlobalEventData } from "../../event-listener/GlobalEventListener";

export class JoinSessionEvent implements DC_GlobalEventData{
    static readonly UniqueSymbol: unique symbol = Symbol("LeaveSessionEvent")

    captureRoomId: number
    constructor(roomId: number){
        this.captureRoomId = roomId
    }

    Key(): symbol{
        return JoinSessionEvent.UniqueSymbol
    }
}

export class LeaveSessionEvent implements DC_GlobalEventData{
    //No Data to share.
    static readonly UniqueSymbol: unique symbol = Symbol("LeaveSessionEvent")

    Key(): symbol {
        return LeaveSessionEvent.UniqueSymbol
    }
}