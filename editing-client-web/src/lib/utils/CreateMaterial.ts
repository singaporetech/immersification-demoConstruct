import { StandardMaterial, Texture } from "@babylonjs/core";

export class CustomMaterialCreator
{
    public createStandardMaterial(materialName: string, scene: any)
    {
        // ============= PBR MATERIAL SETUP =============
        // let mat = new PBRMaterial(materialName +"PBRMat", scene);
        // mat.albedoTexture = new Texture("demoTexture/" + materialName + "/albedo/png");
        // mat.albedoTexture.uAng = 3.14159;
    
        // mat.bumpTexture = new Texture("demoTexture/" + materialName + "/normal/png");
        // mat.bumpTexture.level = 1;
        // mat.bumpTexture.uAng = 3.14159;
    
        // // mat.detailMap.texture = new Texture("demoTexture/" + materialName + "/roughness/png");
        // // mat.detailMap.isEnabled = true;
        // // mat.detailMap.diffuseBlendLevel = 0.1;
        // // mat.detailMap.bumpLevel = 1;
        // // mat.detailMap.roughnessBlendLevel = 0.25;
    
        // mat.metallic = 1;
        // mat.roughness = 1;
        // // mat.reflectionTexture = CubeTexture.CreateFromPrefilteredData("/textures/environment.dds", scene);
        // mat.metallicTexture = new Texture("demoTexture/" + materialName + "/detail/png");
        // mat.metallicTexture.uAng = 3.14159;
        // mat.useRoughnessFromMetallicTextureAlpha = false;
        // mat.useRoughnessFromMetallicTextureGreen = true;
        // mat.useMetallnessFromMetallicTextureBlue = true;
    
        // // mat.ambientColor = new Texture("demoTexture/" + materialName + "/AO/png");
    
        // mat.specularColor = new Color3(0, 0, 0);
        // mat.emissiveColor = new Color3(0,0,0);
        // mat.ambientColor = new Color3(0, 0, 0);
    
        // mat.environmentIntensity = 0.88;
    
        // ============= STANDARD MATERIAL SETUP =============
        let mat = new StandardMaterial(materialName + "StnMat", scene);
    
        mat.diffuseTexture = new Texture(
        "demoTexture/" + materialName + "/albedo/png"
        );
        mat.diffuseTexture.coordinatesIndex = 0;
        mat.diffuseTexture.uScale = 1;
        mat.diffuseTexture.vScale = 1;
        mat.diffuseTexture.uAng = 3.14159;
    
        mat.bumpTexture = new Texture("demoTexture/" + materialName + "/normal/png");
        mat.bumpTexture.coordinatesIndex = 0;
        mat.bumpTexture.level = 1;
        mat.bumpTexture.uAng = 3.14159;
    
        return mat;
    }
}