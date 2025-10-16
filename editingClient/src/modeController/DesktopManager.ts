import { Scene } from "babylonjs";



export class DesktopManager {
    static instance: DesktopManager;
    
    scene: Scene;

    /**
     * Tracks if the user is in desktop or VR mode.
     */
    inDesktopModel: boolean;
    /**
     * Tracks if the user is in a tool
     */
    inTool: boolean;
    /**
     * Tracks if the user is in a menu
     */
    inMenu: boolean;
    /**
     * Tracks if locomotion is enabled for the user
     */
    locomotionEnabled: boolean

    public init(scene: Scene)
    {
        this.scene = scene;

        this.inDesktopModel = true;
        this.inTool = false;
        this.inMenu = false;
        this.locomotionEnabled = true;

        DesktopManager.instance = this;
    }

    public enableLocomotion(enabled: boolean)
    {
        const _this = DesktopManager.instance
        _this.locomotionEnabled = enabled;
    }
}