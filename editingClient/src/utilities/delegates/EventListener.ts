// export type EventDelegate = (evt: any) => void;
// export type SelectMeshEvent | DeselectMeshEvent

//Democonstruct_EventData
export interface EventData{
}

export class ToolActionEventData implements EventData{
}

export class EmptyEventData implements EventData{
}

export class EventListener<T extends EventData>{
    private callbacks: ((data: T) => void )[]= [];

    /**
     * @description
     * Excutes all the methods in callbacks.
     * @param data 
     */
    Invoke(data: T){
        this.callbacks.forEach((fn)=>{
            fn(data)
        })
    }
    // Invoke(): void;
    // Invoke(data?: T): void {
    //   this.callbacks.forEach((fn) => fn(data));
    // }

    /**
     * @description
     * Adds a method to the list of callbacks.
     * @param callback 
     */
    Subscribe(callback: (data: T) => void){
        this.callbacks.push(callback)
    }

    /**
     * @description
     * Removes a method from the list of callback.
     * @param callback 
     * @returns 
     */
    Unsubscribe(callback: (data:T) => void){
        const fnIndex = this.callbacks.findIndex((fn)=>{
            return fn === callback
        })
        if(fnIndex === -1){
            console.warn("Callback not found in listener!")
            return
        }
        this.callbacks.splice(fnIndex, 1);
    }

    /**
     * Clears all functions attacheds to the listener
     * @param startingIndex Optional parameter to specifc the index to start clearing.
     * Defaults to 0 and clears all if functions if not provided.
     */
    Clear(startingIndex?: number)
    {
        const index = startingIndex ?? 0;
        this.callbacks.splice(index, this.callbacks.length - index); 
        // this.callbacks = [];
    }
}