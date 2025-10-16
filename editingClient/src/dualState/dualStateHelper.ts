import { renderState } from "../utilities/enums/enums";
import { ServerObjectManager } from "../roomController/ServerObjectManager";

export class DualStateHelper
{
    public static instance: DualStateHelper

    constructor()
    {
        DualStateHelper.instance = this;
    }

    ToggleModelState(object: any, targetState: renderState)
    {
      var modelState = ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID)
      var gsMesh = modelState.gsMesh;

        switch(targetState)
        {
            case renderState.meshOnly:
                {
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setGSInteractable(false);
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setMeshInteractable(true);
                    break;
                }
            case renderState.gaussianOnly:
                {
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setGSInteractable(true);
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setMeshInteractable(false);
                    break;
                }
            case renderState.combined:
                {
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setGSInteractable(true);
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setMeshInteractable(true);
                    break;
                }
            default:
                {
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setGSInteractable(false);
                    ServerObjectManager.instance.GetModelState(object.metadata.typeInstanceID).setMeshInteractable(false);
                    break;
                }
        }   
    }
}