import { IDeselectTool } from "./ToolInterfaces";

/**
 * @class BaseTool An empty abstract class that must be used to create tools. Contains abstract methods.
 */
export abstract class ABaseTool implements IDeselectTool {
  public abstract DeselectTool(): void;  
  public abstract SetToolActionState(actionState?: number, callback?: (result?: any) => void): void;
  }