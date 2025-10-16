//
//  ReconstructionViewer.swift
//
//  Created by Leon Foo on 29/8/24.
//

//TOOD: Create python API to get latest reconstruction version instead of always checking if version exisit
//TOOD: Implement websocket callback
// (Yes its TOOD, not TODO)

import Foundation
import UIKit
import SceneKit
import ModelIO
import MetalKit
import RealityKit
import SwiftUI

class ReconstructionManager: NSObject, URLSessionDelegate, URLSessionDownloadDelegate {

    static let shared = ReconstructionManager()
    var initialized = false;
    
    var reconstructionID = "" //    public var captureID: String = "" //TODO: merge captureID from viewcontroller to here
    //var datasetID = 0 //TODO: move from ViewController to here
    var latestModelIterationID = 1
        
    public var captureLimit: Int = 0 //0 = infinite, any other number will stop capturing at that limit. //TODO: merge with same variable from viewcontroller
    
    var updatingModel = false
    
    var reconstructionViewerRef: SCNView!
    var modelURL = URL(string: "https:xxx")!
    var texURL = URL(string: "https:xxx")!
    
    //Create timer
    var timerManager: TimerManager?
    
    public override init()
    {
        super.init()
    }
    
    func initialize(reconstrID: String, viewerRef: SCNView)
    {
        if initialized == true
        {
            tryRemoveExistingDisplayModel(){
                //no nothing
            }
        }
        
        reconstructionViewerRef = viewerRef
        reconstructionID = reconstrID
        latestModelIterationID = 0
        
        timerManager = TimerManager()
        timerManager?.setInterval(duration: 5)
        
        //Add callback for checking if model exists
        timerManager?.callback = {
            
            if self.timerManager?.isEnabled == true
            {
                self.timerManager?.stopTimer()
            }
            
            //check for newer iterations of model
            self.checkUpdatesAvailable() { (exist) in
                let exist = exist
                //if exist, download model and do all other cool stuff
                if exist == true && self.updatingModel == false
                {
                    //set status to updating model
                    self.updatingModel = true
                    //start downloading and updating of model
                    self.downloadAndUpdateReconstruction() {
                        //check if should resume timer func again to check for newer iteration updates
                        DispatchQueue.main.async {
                            //Start timer again only when the updated model has been downloaded and displayed
                            if self.timerManager?.isEnabled == false && (self.captureLimit == 0 || self.latestModelIterationID < self.captureLimit)
                            {
                                self.timerManager?.startTimer()
                            }
                            else if self.timerManager?.isEnabled == false && self.latestModelIterationID >= self.captureLimit
                            {
                                // stop, dont restart timer
                                return
                            }
                        }
                    }
                }
                // if no exist, restart timer again to check for updates
                else if exist == false
                {
                    //Start timer again if no updated model is detected
                    DispatchQueue.main.async {
                        if self.timerManager?.isEnabled == false
                        {
                            self.timerManager?.startTimer()
                        }
                    }
                }
                else
                {
                    print("Encountered error checking model version")
                    //Start timer again if no updated model is detected
                    DispatchQueue.main.async {
                        if self.timerManager?.isEnabled == false
                        {
                            self.timerManager?.startTimer()
                        }
                    }
                }
            }
        }
        
        //timerManager?.startTimer()
        initialized = true;
    }
    
    func checkUpdatesAvailable(completion: @escaping (Bool?) -> Void)
    {
        var exist: Bool? = false
        
        let part1 = "https://" + NetworkingManager.shared.hostName + "/checkmodellatest/"
        let part2 = reconstructionID
        let buildURL = part1 + part2
        let url = URL(string: buildURL)!
        print(url)
        
        NetworkingManager.shared.downloadFileToMemory(url: url) { data, error in
            guard let data = data else {
                completion(nil)
                return
            }
            
            // Parse the JSON
            do {
                var jsonResponse = try JSONDecoder().decode([String: Int].self, from: data)
                let versionFromJson = jsonResponse["latest iteration"]
                
                if versionFromJson! > self.latestModelIterationID
                {
                    self.latestModelIterationID = versionFromJson!
                    exist = true
                    print("Latast iteration updated!")
                    print("Reconstruction model check successful")
                    completion(exist)
                }
                else if versionFromJson! == self.latestModelIterationID
                {
                    print("New model updateed iteration available.")
                    completion(exist)
                }
                else
                {
                    print("Model does not exist! Received a negative iteration version.")
                    completion(exist)
                }
            } catch {
                completion(nil)
            }
        }
        
        /*
        // Main code
        checkLatestReconstruction(url: url) { (latestVersion, error) in
            if let error = error {
                print("Error checking reconstruction model version exist: \(error)")
                completion(exist)
            }
            else
            {
                // Parse the JSON response (if you passed the raw data)
                //do {
                //let jsonResponse = try JSONDecoder().decode([String: Int].self, from: data!)
                //let latestFromJson = jsonResponse["latest iteration"]
                //print(latestFromJson!)
                
                print(latestVersion!)
                if latestVersion! > self.latestModelIterationID
                {
                    self.latestModelIterationID = latestVersion!
                    exist = true
                    print("Latast iteration updated!")
                    print("Reconstruction model check successful")
                    completion(exist)
                }
                else if latestVersion! == self.latestModelIterationID
                {
                    print("New model updateed iteration available.")
                    completion(exist)
                }
                else
                {
                    print("Model does not exist! Received a negative iteration version.")
                    completion(exist)
                }
                /*
                 } catch {
                 print("Error parsing JSON: \(error)")
                 completion(nil)
                 return
                 }
                 */
            }
        }
         */
    }
    
    /*
    //TODO: combine this and downloadModel into one func, and add a parameter to specify what type of data should be outputted (decoded JSON or  just raw)
    func checkLatestReconstruction(url: URL, completion: @escaping (Int?, Error?) -> Void)
    {
        NetworkingManager.shared.downloadFileToMemory(url: url) { data, error in
            // Check if we got data back
            guard let data = data else {
                completion(nil, NSError(domain: NetworkingManager.shared.ip, code: 0, userInfo: [NSLocalizedDescriptionKey: "No data received"]))
                return
            }
            
            // Parse the JSON
            do {
                var jsonResponse = try JSONDecoder().decode([String: Int].self, from: data)
                if let latestFromJson = jsonResponse["latest iteration"] {
                    print(latestFromJson)
                    completion(latestFromJson, nil)
                } else {
                    let error = NSError(domain: NetworkingManager.shared.ip, code: 1, userInfo: [NSLocalizedDescriptionKey: "\"latest iteration\" key not found in the response."])
                    completion(nil, error)
                }
            } catch {
                completion(nil, error)
            }
        }
        
        
        /*
        let task = URLSession.shared.dataTask(with: url) { (data, response, error) in
            // Handle errors
            if let error = error {
                completion(nil, error)
                return
            }
            
            // Check if we got data back
            guard let data = data else {
                completion(nil, NSError(domain: NetworkingManager.shared.ip, code: 0, userInfo: [NSLocalizedDescriptionKey: "No data received"]))
                return
            }
            
            // Parse the JSON
            do {
                var jsonResponse = try JSONDecoder().decode([String: Int].self, from: data)
                completion(data, nil)
            } catch {
                completion(nil, error)
            }
        }
        
        task.resume()
         */
    }
     */
    
    func downloadAndUpdateReconstruction(completion: @escaping () -> Void)
    {        
        let part1 = "https://" + NetworkingManager.shared.hostName + "/downloadModel/"
        let part2 = reconstructionID + "/models/"
        let part3 = String(latestModelIterationID) + "/" + String(latestModelIterationID) + ".obj"
        let buildURL = part1 + part2 + part3
        
        modelURL = URL(string: buildURL)!
        
        // 1.) Download model
        // downloadFile(url: modelURL) { (modelData, error) in
        NetworkingManager.shared.downloadFileToMemory(url: modelURL) { modelData, error in
            if let error = error {
                print("Error downloading or parsing reconstruction model: \(error)")
                completion()
                return
            } 
            else
            {
                print("Reconstruction model download successful")
                
                // Handle unexpected nil data if for some reason download is completed, but data is missing
                guard let modelData = modelData else {
                    print("Error: Downloaded reconstruction model is nil")
                    completion()
                    return
                }
                
                let texPart1 = "https://" + NetworkingManager.shared.hostName + "/downloadTexture/"
                let texPart2 = self.reconstructionID + "/textures/"
                let texPart3 = String(self.latestModelIterationID) + "/" + "texture.jpg"
                let buildTexURL = texPart1 + texPart2 + texPart3
                
                self.texURL = URL(string: buildTexURL)!
                
                //2. download texture
                NetworkingManager.shared.downloadFileToMemory(url: self.texURL) { textureData, error in
                //self.downloadFile(url: self.texURL) { (textureData, error) in
                    if let error = error {
                        print("Error downloading or parsing reconstruction texture: \(error)")
                        completion()
                        return
                    }
                    else
                    {
                        print("Reconstruction texture download successful")
                        
                        // Handle unexpected nil data if for some reason download is completed, but data is missing
                        guard let textureData = textureData else {
                            print("Error: Downloaded reconstruction texture is nil")
                            completion()
                            return
                        }
                        
                        //3. remove existing model if exists
                        //Completion handler to delete old model version first, before new downloaded version is displayed
                        self.tryRemoveExistingDisplayModel() {
                            //4. display the new downloadedmodel and apply downloaded texture
                            self.parseAndDisplayModel(modelData: modelData, textureData:textureData) { (success) in
                                let success = success
                                if success == true {
                                    //self.latestVersionID = self.latestVersionID + 1
                                    print("Update successful")
                                    print(String(self.latestModelIterationID))
                                }
                                else
                                {
                                    print("Error displaying model")
                                }
                            }
                        }
                        completion()
                    }
                }
                completion()
            }
        }
        completion()
    }
    
    /*
    func downloadFile(url: URL, completion: @escaping (Data?, Error?) -> Void)
    {
        let downloadUrl = url
        
        let task = URLSession.shared.dataTask(with: downloadUrl) { (data, response, error) in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let data = data else {
                completion(nil, NSError(domain: NetworkingManager.shared.ip, code: 0, userInfo: [NSLocalizedDescriptionKey: "No data received"]))
                return
            }
            completion(data, nil)
        }
        task.resume()
    }
     */
    
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let data = try? Data(contentsOf: location) else {
            print("Error in urlSession")
            return
        }
        
        //parseAndDisplayModel(data: data)
    }
    
    func parseAndDisplayModel(modelData: Data, textureData: Data, completion: @escaping (Bool?) -> Void)
    {
        var success: Bool? = false
        print("Parse and display model")

        // Create a temporary URL for the obj data
        let tempObjUrl = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("temp.obj")
        try? modelData.write(to: tempObjUrl)
        
        // Create a temporary URL for the obj data
        let tempTexUrl = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("texture.jpg")
        try? textureData.write(to: tempTexUrl)
        
        // Check if the scene already exists
        if reconstructionViewerRef.scene == nil {
            // Create a new SCNScene if not already created
            reconstructionViewerRef.scene = SCNScene()
            
            // Create lights
            let lightNode = SCNNode()
            lightNode.name = "globalLight"
            lightNode.light = SCNLight()
            lightNode.light?.type = .omni
            lightNode.position = SCNVector3(0, 10, 35)
            reconstructionViewerRef.scene?.rootNode.addChildNode(lightNode)
            
            let ambientLight = SCNNode()
            ambientLight.name = "ambientLight"
            ambientLight.light = SCNLight()
            ambientLight.light?.type = .ambient
            ambientLight.light?.color = UIColor.darkGray
            reconstructionViewerRef.scene?.rootNode.addChildNode(ambientLight)
        }
        
        let sceneSource = SCNSceneSource(url: tempObjUrl, options: nil)
        
        if let modelScene = sceneSource?.scene(options: nil)
        {
            // Apply the Material to all Geometry in the scene
            for node in modelScene .rootNode.childNodes {
                if let geometry = node.geometry {
                    // name reconstruction model node
                    node.name = "testModel"
                    // apply texture
                    geometry.firstMaterial?.diffuse.contents = tempTexUrl
                    // Lastly, add to scene view so it can be rendered and displayed
                    reconstructionViewerRef.scene?.rootNode.addChildNode(node)
                }
            }
            
            DispatchQueue.main.async {
                print("async operation")
                self.reconstructionViewerRef.allowsCameraControl = true
                self.reconstructionViewerRef.cameraControlConfiguration.allowsTranslation = false
                //self.reconstructionViewerRef.scene = modelViewerScene
            }

            success = true
        }
        
        /*
        //// old ========
        ///
        // Create new scene by attempting to load the scene/asset
        if let modelViewerScene = try? SCNScene(url: tempObjUrl, options: [SCNSceneSource.LoadingOption.createNormalsIfAbsent: true ])
        {
            
            // Apply the Material to all Geometry in the scene
            for node in modelViewerScene.rootNode.childNodes {
                if let geometry = node.geometry {
                    print(geometry)
                    geometry.firstMaterial?.diffuse.contents = tempTexUrl
                }
            }
            
            // Create lights
            let lightNode = SCNNode()
            lightNode.light = SCNLight()
            lightNode.light?.type = .omni
            lightNode.position = SCNVector3(0, 10, 35)
            modelViewerScene.rootNode.addChildNode(lightNode)
            
            let ambientLight = SCNNode()
            ambientLight.light = SCNLight()
            ambientLight.light?.type = .ambient
            ambientLight.light?.color = UIColor.darkGray
            modelViewerScene.rootNode.addChildNode(ambientLight)
            
            DispatchQueue.main.async {
                print("async operation")
                self.reconstructionViewerRef.allowsCameraControl = true
                self.reconstructionViewerRef.cameraControlConfiguration.allowsTranslation = false
                self.reconstructionViewerRef.scene = modelViewerScene
            }
            
            success = true
        }
         */
        else
        {
            print("Error loading scene from OBJ data")
        }
        
        self.updatingModel = false
        // Clean up temporary file
        try? FileManager.default.removeItem(at: tempObjUrl)
        try? FileManager.default.removeItem(at: tempTexUrl)
        
        completion(success)
    }
    
    func tryRemoveExistingDisplayModel(completion: @escaping () -> Void)
    {
        if let scene = reconstructionViewerRef.scene
        {
            // Remove the old model node, if it exists
            if let oldModelNode = reconstructionViewerRef.scene?.rootNode.childNode(withName: "modelNode", recursively: true) {
                oldModelNode.removeFromParentNode()
            }
            
            // Apply the Material to all Geometry in the scene
            for node in scene.rootNode.childNodes {
                if let geometry = node.geometry /*&& node.name == "testModel" */ {
                    node.removeFromParentNode()
                }
            }
            
            print("scene was not nil, doing something")
        }
        else if reconstructionViewerRef.scene == nil
        {
            print("scene was nil, doing something")
        }
        else
        {
            reconstructionViewerRef.scene = nil
            print("Warning: Could not remove existing scene of reconstrucion model, func will only set scene to nil value")
        }
        completion()
    }
}
