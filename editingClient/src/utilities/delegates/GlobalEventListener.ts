import { EventData, EventListener } from "./EventListener";

export interface DC_GlobalEventData extends EventData{
    Key() : symbol
}

export class DC_GlobalEvents{
    private static map: Map<Symbol, EventListener<any>> = new Map()

    static ContainsListener(symbol: Symbol){
        return DC_GlobalEvents.map.has(symbol)
    }

    static RegisterListener<T extends DC_GlobalEventData>(symbol: Symbol, listener: EventListener<T>){
        const map = DC_GlobalEvents.map;
        if(map.has(symbol)){
            console.warn("Existing Event listener has already registered to key: ", symbol.description)
            return
        }
        map.set(symbol, listener);
    }

    static UnregisterListener(symbol: Symbol){
        const map = DC_GlobalEvents.map;
        const success = map.delete(symbol)
        if (!success){
            console.warn("Event Key was not registered: ", symbol.description)
        }
    }

    static AddCallback<T extends DC_GlobalEventData>(symbol: Symbol, callback: (data: T)=>void){
        const map = DC_GlobalEvents.map
        let listener = map.get(symbol)

        if(listener === undefined){
            listener = new EventListener<T>()
            DC_GlobalEvents.RegisterListener(symbol, listener)
        }

        listener?.Subscribe(callback)
    }

    static RemoveCallback<T extends DC_GlobalEventData>(symbol: Symbol, callback: (data: T)=>void){
        const map = DC_GlobalEvents.map
        if(!map.has(symbol)){
            console.warn("Event Key was not registered: ", symbol.description)
        }

        const listener = map.get(symbol)
        listener?.Unsubscribe(callback)
    }

    static Invoke<T extends DC_GlobalEventData>(eventData: T){
        const map = DC_GlobalEvents.map
        const symbol = eventData.Key()
        if(!map.has(symbol)){
            console.warn("Event Key was not registered: ", symbol.description)
        }

        map.get(symbol)?.Invoke(eventData)
    }
}
