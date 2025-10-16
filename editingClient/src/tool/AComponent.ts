import { IUpdateComponent } from "./ComponentInterface";

/**
 * @class ABaseComponent An empty abstract class that must be used to create tools. Contains abstract methods.
 */
  export abstract class ABaseComponent implements IUpdateComponent{
    abstract updateReferenceID(...args: any[]): void;
  }