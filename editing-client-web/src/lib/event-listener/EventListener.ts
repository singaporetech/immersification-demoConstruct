//Democonstruct_EventData
export interface DC_EventData{
}

export class DC_EmptyEventData implements DC_EventData{
}

export class DC_EventListener<T extends DC_EventData>{
    //Array of tuples of key to callback function.
    private callbacks: ((data: T) => void )[];

    constructor(){
        this.callbacks = []
    }

    Subscribe(callback: (data: T) => void){
        this.callbacks.push(callback)
    }

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

    Invoke(data: T){
        this.callbacks.forEach((fn)=>{
            fn(data)
        })
    }
}