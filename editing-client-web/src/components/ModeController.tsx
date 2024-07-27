// import { useState} from "react"
// import LandingPage from "../LandingPage";
import EditingMode from "./EditingMode";
// import CaptureMode from "../CaptureMode";

function ModeController(){
    // const [roomMode, setRoomMode] = useState(3);

    const RenderSelectedComponent = ()=>{
        return <EditingMode/>
        // switch(roomMode){
        //     case 0: return <LandingPage/>
        //     case 1: return <EditingMode/>
        //     case 2: return <CaptureMode/>
        //     case 3: return <EditingMode/>
        //     default: return <p>Option {roomMode} does not exist</p>
        // }
    }
    
    return (
        <div className="h-screen w-screen overflow-hidden">
            {RenderSelectedComponent()}
            {/* <DropdownNavbar currentRoomMode={roomMode} onSelectOption={setRoomMode}/> */}
        </div>
    )
}

export default ModeController