import { DeselectTool } from "../utils/Interfaces";

/**
 * @class BaseTool An empty abstract class that must be used to create VR tools
 */
export abstract class BaseTool implements DeselectTool {
    public abstract DeselectTool(): void;    
  }