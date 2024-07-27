//
//  ViewController.swift
//  GLKittutorial
//
//  Created by Mathieu Labbe on 2020-12-28.
//  Modified by Leon Foo 2024-07-27
//

import GLKit
import ARKit
import Zip
import StoreKit
import Alamofire
import SceneKit
import CoreTelephony

extension Array {
    func size() -> Int {
        return MemoryLayout<Element>.stride * self.count
    }
}

class ViewController: GLKViewController, ARSessionDelegate, RTABMapObserver, UIPickerViewDataSource, UIPickerViewDelegate, CLLocationManagerDelegate {

    private var networking: NetworkingManager?
    private var timerManager: TimerManager?
    
    private var captureID: String = ""
    private var datasetID: Int = 1
    
    private var enableScanningLoop = true;
    private var loopClosureDetected = false;
    
    private var CaptureStarted: Bool = false;
    private var saveState: savingState = .standby;
    
    @IBOutlet weak var democonstructLogo: UIImageView!
    @IBOutlet weak var democonstructTitle: UILabel!
    @IBOutlet weak var democonstructIntro: UILabel!
    
    // Saving State
    private enum savingState {
        case standby,
        inititated,
        writingDatabase,
        savingDatabase,
        generatingMesh,
        savingMesh,
        generatingPointClouds,
        savingPointcloud,
        uploadingAll,
        completed
    }
    
    private let session = ARSession()
    private var locationManager: CLLocationManager?
    private var mLastKnownLocation: CLLocation?
    private var mLastLightEstimate: CGFloat?
    
    private var context: EAGLContext?
    private var rtabmap: RTABMap?
    
    private var databases = [URL]()
    private var currentDatabaseIndex: Int = 0
    private var openedDatabasePath: URL?
    
    private var progressDialog: UIAlertController?
    var progressView : UIProgressView?
    
    var maxPolygonsPickerView: UIPickerView!
    var maxPolygonsPickerData: [Int]!
    
    private var mTotalLoopClosures: Int = 0
    private var mMapNodes: Int = 0
    private var mTimeThr: Int = 0
    private var mMaxFeatures: Int = 0
    private var mLoopThr = 0.11
    
    // UI states. This will change the UI and toogle buttons  on or off
    private enum State {
        case STATE_WELCOME,    // Camera/Motion off - showing only buttons open and start new scan // home page
        STATE_CAMERA_STANDBY,          // Camera/Motion on - not mapping // standby in mapping mode but not mapping
        STATE_MAPPING,         // Camera/Motion on - mapping // mapping
        STATE_IDLE,            // Camera/Motion off
        STATE_PROCESSING,      // Camera/Motion off - post processing
        STATE_VISUALIZING,     // Camera/Motion off - Showing optimized mesh
        STATE_VISUALIZING_CAMERA,     // Camera/Motion on  - Showing optimized mesh
        STATE_VISUALIZING_WHILE_LOADING // Camera/Motion off - Loading data while showing optimized mesh
    }
    private var mState: State = State.STATE_WELCOME;
    
    private func getStateString(state: State) -> String {
        switch state {
        case .STATE_WELCOME:
            return "Welcome"
        case .STATE_CAMERA_STANDBY:
            return "Camera Preview"
        case .STATE_MAPPING:
            return "Mapping"
        default: // IDLE
            return "Idle"
        }
    }
    
    private func getSavingStateString(state: savingState) -> String {
        switch state {
        case .standby:
            return "Standby"
        case .inititated:
            return "Saving started"
        case .writingDatabase:
            return "Generating Database"
        case .savingDatabase:
            return "Saving database file"
        case .generatingMesh:
            return "Generating mesh model"
        case .savingMesh:
            return "Saving mesh model file"
        case .generatingPointClouds:
            return "Generating point cloud"
        case .savingPointcloud:
            return "Saving point cloud file"
        case .uploadingAll:
            return "Uploading all capture data for iteration \(self.datasetID-1)"
        case .completed:
            return "Saving completed"
        }
    }
    
    private var depthSupported: Bool = false
    
    private var viewMode: Int = 2 // 0=Cloud, 1=Mesh, 2=Textured Mesh
    private var cameraMode: Int = 1
    
    private var statusShown: Bool = true
    private var debugShown: Bool = false
    
    private var mapShown: Bool = true
    
    private var odomShown: Bool = true
    
    private var graphShown: Bool = true
    private var gridShown: Bool = true
    private var optimizedGraphShown: Bool = true
    
    private var wireframeShown: Bool = false
    private var backfaceShown: Bool = false
    private var lightingShown: Bool = false
    private var mHudVisible: Bool = true
    
    private var mMenuOpened: Bool = false
    
    private var mLastTimeHudShown: DispatchTime = .now()
    
    @IBOutlet weak var stopButton: UIButton!
    @IBOutlet weak var recordButton: UIButton!
    @IBOutlet weak var newScanButtonLarge: UIButton!
    
    //public var modelViewerScene: SCNScene!
    
    
    @IBOutlet weak var modelPlaceholderText: UITextField!
    @IBOutlet weak var ModelVisibleIcon: UIButton!
    @IBOutlet weak var ModelInvisibleIcon: UIButton!
    @IBOutlet weak var ModelViewer: SCNView!
    
    @IBOutlet weak var informationVisibleIcon: UIButton!
    @IBOutlet weak var informationInvisibleIcon: UIButton!
    @IBOutlet weak var informationLabel: UILabel!
    
    @IBOutlet weak var toastLabel: UILabel!
    
    @IBOutlet weak var informationConstrainModelOff: NSLayoutConstraint!
    @IBOutlet weak var informationConstrainModelOn: NSLayoutConstraint!
    
    let RTABMAP_TMP_DB = "rtabmap.tmp.db"
    let RTABMAP_RECOVERY_DB = "rtabmap.tmp.recovery.db"
    //let RTABMAP_EXPORT_DIR = "Export"

    func getDocumentDirectory() -> URL {
        return FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
    
    /*
    func getTmpDirectory() -> URL {
       return URL(fileURLWithPath: NSTemporaryDirectory())
    }
    */
    
    @objc func defaultsChanged(){
        updateDisplayFromDefaults()
    }
    
    func showToast(message : String, seconds: Double){
        if(!self.toastLabel.isHidden)
        {
            return;
        }
        
        self.toastLabel.text = message
        self.toastLabel.isHidden = false
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + seconds) {
            self.toastLabel.isHidden = true
        }
    }
    
    //Xcode OnStartUp function
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        
        self.toastLabel.isHidden = true
        session.delegate = self
        
        depthSupported = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
        
        //Create rtabmap component
        rtabmap = RTABMap()
        rtabmap?.setupCallbacksWithCPP()
        
        //Create networking capabilities
        networking = NetworkingManager()
        
        //Create timer
        timerManager = TimerManager()
        
        //Add callback for saving file
        timerManager?.callback = {
            self.enableScanningLoop = true
            self.saveIterationUninterrupted()
         }
        
        context = EAGLContext(api: .openGLES2)
        EAGLContext.setCurrent(context)
        
        if let view = self.view as? GLKView, let context = context {
            view.context = context
            delegate = self
            rtabmap?.initGlContent()
        }
        
        //here
        //updateDatabases()
        
        //here
        /*
         let doubleTap = UITapGestureRecognizer(target: self, action: #selector(doubleTapped(_:)))
        doubleTap.numberOfTapsRequired = 2
        view.addGestureRecognizer(doubleTap)
        let singleTap = UITapGestureRecognizer(target: self, action: #selector(singleTapped(_:)))
        singleTap.numberOfTapsRequired = 1
        view.addGestureRecognizer(singleTap)
        */
        
        // Set up app behaviors
        let notificationCenter = NotificationCenter.default
        notificationCenter.addObserver(self, selector: #selector(appMovedToBackground), name: UIApplication.willResignActiveNotification, object: nil)
        notificationCenter.addObserver(self, selector: #selector(appMovedToForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        notificationCenter.addObserver(self, selector: #selector(defaultsChanged), name: UserDefaults.didChangeNotification, object: nil)
        
        rtabmap!.addObserver(self)
        
        registerSettingsBundle()
        updateDisplayFromDefaults()
        
        maxPolygonsPickerView = UIPickerView(frame: CGRect(x: 10, y: 50, width: 250, height: 150))
        maxPolygonsPickerView.delegate = self
        maxPolygonsPickerView.dataSource = self

        // This is where you can set your min/max values
        let minNum = 0
        let maxNum = 9
        maxPolygonsPickerData = Array(stride(from: minNum, to: maxNum + 1, by: 1))
        
        //Set up scanning defaults and GUI after everything has init
        
        //Set a capture ID and datasetID
        captureID = String(generateRandomCaptureID())
        datasetID = 1;

        informationLabel.numberOfLines = 0
        informationLabel.text = ""
        
        getReconstructedModel();
        hideInfo();
        hideModel();
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.updateState_v2(state: self.mState)
        }
    }
    
    func progressUpdated(_ rtabmap: RTABMap, count: Int, max: Int) {
        DispatchQueue.main.async {
            self.progressView?.setProgress(Float(count)/Float(max), animated: true)
        }
    }
    
    func initEventReceived(_ rtabmap: RTABMap, status: Int, msg: String) {
        return
    }
        
    // callback function for rtabmap that retrieves the status of rtabmap at the time during the current frame
    func statsUpdated(_ rtabmap: RTABMap,
                           nodes: Int,
                           words: Int,
                           points: Int,
                           polygons: Int,
                           updateTime: Float,
                           loopClosureId: Int, //The id of the loop closure detected in the current frame
                           highestHypId: Int,
                           databaseMemoryUsed: Int,
                           inliers: Int,
                           matches: Int,
                           featuresExtracted: Int,
                           hypothesis: Float,
                           nodesDrawn: Int,
                           fps: Float,
                           rejected: Int,
                           rehearsalValue: Float,
                           optimizationMaxError: Float,
                           optimizationMaxErrorRatio: Float,
                           distanceTravelled: Float,
                           fastMovement: Int,
                           landmarkDetected: Int,
                           x: Float,
                           y: Float,
                           z: Float,
                           roll: Float,
                           pitch: Float,
                           yaw: Float)
    {
        let usedMem = self.getMemoryUsage()
        
        //Track loop closure detection for this frame
        self.loopClosureDetected = loopClosureId > 0 ? true : false;
        //Update the number of loop closures in overall mapping session
        if(loopClosureId > 0)
        {
            mTotalLoopClosures += 1;
        }
        
        let previousNodes = mMapNodes
        mMapNodes = nodes;
        
        //Update the current time at this frame
        let formattedDate = Date().getFormattedDate(format: "HH:mm:ss.SSS")
        
        DispatchQueue.main.async {
            if(self.mMapNodes>0 && previousNodes==0 && self.mState != .STATE_MAPPING)
            {
                self.updateState_v2(state: self.mState) // refesh menus and actions
            }
            
            //Clear status label first
            self.informationLabel.text = ""
            
            if self.debugShown {
                self.informationLabel.text =
                    self.informationLabel.text! + "\n"
                var gpsString = "\n"
                if(UserDefaults.standard.bool(forKey: "SaveGPS"))
                {
                    if(self.mLastKnownLocation != nil)
                    {
                        let secondsOld = (Date().timeIntervalSince1970 - self.mLastKnownLocation!.timestamp.timeIntervalSince1970)
                        var bearing = 0.0
                        if(self.mLastKnownLocation!.course > 0.0) {
                            bearing = self.mLastKnownLocation!.course
                            
                        }
                        gpsString = String(format: "GPS: %.2f %.2f %.2fm %ddeg %.0fm [%d sec old]\n",
                                           self.mLastKnownLocation!.coordinate.longitude,
                                           self.mLastKnownLocation!.coordinate.latitude,
                                           self.mLastKnownLocation!.altitude,
                                           Int(bearing),
                                           self.mLastKnownLocation!.horizontalAccuracy,
                                           Int(secondsOld));
                    }
                    else
                    {
                        gpsString = "GPS: [not yet available]\n";
                    }
                }
                var lightString = "\n"
                if(self.mLastLightEstimate != nil)
                {
                    lightString = String("Light (lm): \(Int(self.mLastLightEstimate!))\n")
                }
                
                self.informationLabel.text =
                    self.informationLabel.text! +
                    gpsString + //gps
                    lightString + //env sensors
                    "Time: \(formattedDate)\n" +
                    "Nodes (WM): \(nodes) (\(nodesDrawn) shown)\n" +
                    "Words: \(words)\n" +
                    "Database (MB): \(databaseMemoryUsed)\n" +
                    "Number of points: \(points)\n" +
                    "Polygons: \(polygons)\n" +
                    "Update time (ms): \(Int(updateTime)) / \(self.mTimeThr==0 ? "No Limit" : String(self.mTimeThr))\n" +
                    "Features: \(featuresExtracted) / \(self.mMaxFeatures==0 ? "No Limit" : (self.mMaxFeatures == -1 ? "Disabled" : String(self.mMaxFeatures)))\n" +
                    "Rehearsal (%): \(Int(rehearsalValue*100))\n" +
                    "Loop closures: \(self.mTotalLoopClosures)\n" +
                    "Inliers: \(inliers)\n" +
                    "Hypothesis (%): \(Int(hypothesis*100)) / \(Int(self.mLoopThr*100)) (\(loopClosureId>0 ? loopClosureId : highestHypId))\n" +
                    String(format: "FPS (rendering): %.1f Hz\n", fps) +
                    String(format: "Travelled distance: %.2f m\n", distanceTravelled) +
                    String(format: "Pose (x,y,z): %.2f %.2f %.2f", x, y, z)
            }
            else if self.statusShown {
                self.informationLabel.text =
                    self.informationLabel.text! +
                    "\n\n\n" +
                    "Capture ID: \(self.captureID)\n" +
                    "Iteration: \(self.datasetID)\n" +
                "Iteration Saving Status: \(self.getSavingStateString(state: self.saveState))\n" +
                "Mapping Status: \(self.getStateString(state: self.mState))\n" +
                    "Memory Usage: \(usedMem) MB"
            }
            
            if(self.mState == .STATE_MAPPING)
            {
                if(loopClosureId > 0) {
                    if(self.mState == .STATE_VISUALIZING_CAMERA) {
                        self.showToast(message: "Localized!", seconds: 1);
                    }
                    else {
                        self.showToast(message: "Loop closure detected!", seconds: 1);
                    }
                }
                else if(rejected > 0)
                {
                    if(inliers >= UserDefaults.standard.integer(forKey: "MinInliers"))
                    {
                        if(optimizationMaxError > 0.0)
                        {
                            self.showToast(message: String(format: "Loop closure rejected, too high graph optimization error (%.3fm: ratio=%.3f < factor=%.1fx).", optimizationMaxError, optimizationMaxErrorRatio, UserDefaults.standard.float(forKey: "MaxOptimizationError")), seconds: 1);
                        }
                        else
                        {
                            self.showToast(message: String(format: "Loop closure rejected, graph optimization failed! You may try a different Graph Optimizer (see Mapping options)."), seconds: 1);
                        }
                    }
                    else
                    {
                        self.showToast(message: String(format: "Loop closure rejected, not enough inliers (%d/%d < %d).", inliers, matches, UserDefaults.standard.integer(forKey: "MinInliers")), seconds: 1);
                    }
                }
                else if(landmarkDetected > 0) {
                    self.showToast(message: "Landmark \(landmarkDetected) detected!", seconds: 1);
                }
            }
        }
        
        if(self.enableScanningLoop)
        {
            //if timer is not enabled, enable when a close loop is detected
            if(timerManager?.isEnabled == false && self.loopClosureDetected)
            {
                DispatchQueue.main.async
                {
                    self.timerManager?.startTimer()
                }
            }
        }
        
        
    }
    
    func getMemoryUsage() -> UInt64 {
        var taskInfo = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &taskInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }

        if kerr == KERN_SUCCESS {
            return taskInfo.resident_size / (1024*1024)
        }
        else {
            print("Error with task_info(): " +
                (String(cString: mach_error_string(kerr), encoding: String.Encoding.ascii) ?? "unknown error"))
            return 0
        }
    }
    
    //TODO: Decide whether capture data should be uploaded when moved to the background
    //Disables interval uploading of capture data and stops capturing/mapping. Also uploads all current capture data to the server
    @objc func appMovedToBackground()
    {
        self.enableScanningLoop = false;
        locationManager?.stopUpdatingLocation();
        
        if(self.saveState == .standby)
        {
            self.saveIterationUninterrupted();
        }
    }
    
    // Set location to be updated, does not auto resume capturing/mapping
    @objc func appMovedToForeground()
    {
        locationManager?.startUpdatingLocation();
    }
    
    /*
    func setMeshRendering(viewMode: Int)
    {
        switch viewMode {
        case 0:
            self.rtabmap?.setMeshRendering(enabled: false, withTexture: false)
        case 1:
            self.rtabmap?.setMeshRendering(enabled: true, withTexture: false)
        default:
            self.rtabmap?.setMeshRendering(enabled: true, withTexture: true)
        }
        self.viewMode = viewMode
        updateState_v2(state: mState)
    }
    */
    
    func setGLCamera(type: Int)
    {
        cameraMode = type
        rtabmap!.setCamera(type: type);
    }
    
    func startCamera()
    {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized: // The user has previously granted access to the camera.
                print("Starting Camera")
                rtabmap!.startCamera()
                let configuration = ARWorldTrackingConfiguration()
                var message = "No message"
                if(!UserDefaults.standard.bool(forKey: "LidarMode"))
                {
                    message = "LiDAR is disabled (Settings->Mapping->LiDAR Mode = OFF), only tracked features will be mapped."
                    //self.setMeshRendering(viewMode: 0)
                }
                else if !depthSupported
                {
                    message = "The device does not have a LiDAR, only tracked features will be mapped. A LiDAR is required for accurate 3D reconstruction."
                    //self.setMeshRendering(viewMode: 0)
                }
                else
                {
                    configuration.frameSemantics = .sceneDepth
                }
                
                session.run(configuration, options: [.resetSceneReconstruction, .resetTracking, .removeExistingAnchors])
                
                locationManager?.startUpdatingLocation()
                updateState_v2(state: .STATE_CAMERA_STANDBY)
                
                /*
                if(!message.isEmpty)
                {
                    let alertController = UIAlertController(title: "Start Camera", message: message, preferredStyle: .alert)
                    let okAction = UIAlertAction(title: "OK", style: .default) { (action) in
                    }
                    alertController.addAction(okAction)
                    present(alertController, animated: true)
                }
                */
            
            case .notDetermined: // The user has not yet been asked for camera access.
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    if granted {
                        DispatchQueue.main.async {
                            self.startCamera()
                        }
                    }
                }
            
        default:
            let alertController = UIAlertController(title: "Camera Disabled", message: "Camera permission is required to start the camera. You can enable it in Settings.", preferredStyle: .alert)

            let settingsAction = UIAlertAction(title: "Settings", style: .default) { (action) in
                guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
                    return
                }
                if UIApplication.shared.canOpenURL(settingsUrl) {
                    UIApplication.shared.open(settingsUrl, completionHandler: { (success) in
                        print("Settings opened: \(success)") // Prints true
                    })
                }
            }
            alertController.addAction(settingsAction)
            
            let okAction = UIAlertAction(title: "Ignore", style: .default) { (action) in
            }
            alertController.addAction(okAction)
            
            present(alertController, animated: true)
        }
        
        let setIPPromptController = UIAlertController(title: "Set Edge Server IP", message: "Scans (database files) will be sent to this edge server.", preferredStyle: .alert )
        setIPPromptController.addTextField { textField in
            textField.placeholder = "xxx.xxx.x.xxx"
        }
        let setIPAction = UIAlertAction(title: "Set", style: .default) { _ in
            if let textField = setIPPromptController.textFields?.first, let inputText = textField.text
            {
                self.networking?.SetIP(newIP: inputText)
                print("User set Edge Server IP as : \(inputText)")
            }
        }
        setIPPromptController.addAction(setIPAction)
        present(setIPPromptController, animated: true, completion: nil)
    }
    
    //LEON: Toggles UI components on or off.
    private func updateState_v2(state: State)
    {
        print("Updateing to state: \(state)")
        
        mState = state;
        
        switch mState {
        case .STATE_CAMERA_STANDBY:
            newScanButtonLarge.isHidden = true
            recordButton.isHidden = false
            stopButton.isHidden = true
            democonstructLogo.isHidden = true
            democonstructTitle.isHidden = true
            democonstructIntro.isHidden = true
        case .STATE_MAPPING:
            newScanButtonLarge.isHidden = true
            recordButton.isHidden = true
            stopButton.isHidden = false
            democonstructLogo.isHidden = true
            democonstructTitle.isHidden = true
            democonstructIntro.isHidden = true
        default: // IDLE // WELCOME
            newScanButtonLarge.isHidden = false // = mState != .STATE_WELCOME // WELCOME button
            recordButton.isHidden = true
            stopButton.isHidden = true
            democonstructLogo.isHidden = false
            democonstructTitle.isHidden = false
            democonstructIntro.isHidden = false
        }
        
        let view = self.view as? GLKView
        if(mState == .STATE_CAMERA_STANDBY || mState == .STATE_MAPPING)
        {
            view?.enableSetNeedsDisplay = false
            self.isPaused = false
            
            if !self.isPaused {
                self.view.setNeedsDisplay()
            }
            
            //Leon: Set flags for scanning and visualization
            self.odomShown = true
            self.rtabmap!.setOdomCloudShown(shown: self.odomShown)
            
            self.gridShown = true
            self.rtabmap!.setGridVisible(visible: self.gridShown)
            
            self.graphShown = false
            self.rtabmap!.setGraphVisible(visible: self.graphShown)

            //Set flags for processing
            self.optimizedGraphShown = false
            self.rtabmap!.setGraphOptimization(enabled: self.optimizedGraphShown)
        }
    }
    
    /*
    func exportMesh(isOBJ: Bool)
    {
        let ac = UIAlertController(title: "Maximum Polygons", message: "\n\n\n\n\n\n\n\n\n\n", preferredStyle: .alert)
        ac.view.addSubview(maxPolygonsPickerView)
        maxPolygonsPickerView.selectRow(2, inComponent: 0, animated: false)
        ac.addAction(UIAlertAction(title: "OK", style: .default, handler: { _ in
            let pickerValue = self.maxPolygonsPickerData[self.maxPolygonsPickerView.selectedRow(inComponent: 0)]
            self.export(isOBJ: isOBJ, meshing: true, regenerateCloud: false, optimized: true, optimizedMaxPolygons: pickerValue*100000, previousState: self.mState);
        }))
        ac.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: nil))
        present(ac, animated: true)
    }
    */
    
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return maxPolygonsPickerData.count
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        if(row == 0)
        {
            return "No Limit"
        }
        return "\(maxPolygonsPickerData[row])00 000"
    }
    
    //=========================================================================================================================
    //These session funcs are AR session methods. They arent called in this script.
    
    //This is called when a new frame has been updated.
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
    var status = ""
    var accept = false
    
    switch frame.camera.trackingState {
    case .normal:
        accept = true
    case .notAvailable:
        status = "Tracking not available"
    case .limited(.excessiveMotion):
        accept = true
        status = "Please Slow Your Movement"
    case .limited(.insufficientFeatures):
        accept = true
        status = "Avoid Featureless Surfaces"
    case .limited(.initializing):
        status = "Initializing"
    case .limited(.relocalizing):
        status = "Relocalizing"
    default:
        status = "Unknown tracking state"
    }
    
    mLastLightEstimate = frame.lightEstimate?.ambientIntensity
    
    if !status.isEmpty && mLastLightEstimate != nil && mLastLightEstimate! < 100 && accept {
        status = "Camera Is Occluded Or Lighting Is Too Dark"
    }

    if accept
    {
        if let rotation = UIApplication.shared.windows.first?.windowScene?.interfaceOrientation
        {
            rtabmap?.postOdometryEvent(frame: frame, orientation: rotation, viewport: self.view.frame.size)
        }
    }
    else
    {
        rtabmap?.notifyLost();
    }
    
    if !status.isEmpty {
        DispatchQueue.main.async {
            self.showToast(message: status, seconds: 2)
        }
    }
}
     
    // This is called when a session fails.
    func session(_ session: ARSession, didFailWithError error: Error) {
        // Present an error message to the user.
        guard error is ARError else { return }
        let errorWithInfo = error as NSError
        let messages = [
            errorWithInfo.localizedDescription,
            errorWithInfo.localizedFailureReason,
            errorWithInfo.localizedRecoverySuggestion
        ]
        let errorMessage = messages.compactMap({ $0 }).joined(separator: "\n")
        DispatchQueue.main.async {
            // Present an alert informing about the error that has occurred.
            let alertController = UIAlertController(title: "The AR session failed.", message: errorMessage, preferredStyle: .alert)
            let restartAction = UIAlertAction(title: "Restart Session", style: .default) { _ in
                alertController.dismiss(animated: true, completion: nil)
                if let configuration = self.session.configuration {
                    self.session.run(configuration, options: [.resetSceneReconstruction, .resetTracking, .removeExistingAnchors])
                }
            }
            alertController.addAction(restartAction)
            self.present(alertController, animated: true, completion: nil)
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    mLastKnownLocation = locations.last!
    rtabmap?.setGPS(location: locations.last!);
}
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print(error)
}
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
    print(status.rawValue)
    if(status == .notDetermined)
    {
        locationManager?.requestWhenInUseAuthorization()
    }
    if(status == .denied)
    {
        let alertController = UIAlertController(title: "GPS Disabled", message: "GPS option is enabled (Settings->Mapping...) but localization is denied for this App. To enable location for this App, go in Settings->Privacy->Location.", preferredStyle: .alert)

        let settingsAction = UIAlertAction(title: "Settings", style: .default) { (action) in
            self.locationManager = nil
            self.mLastKnownLocation = nil
            guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
                return
            }

            if UIApplication.shared.canOpenURL(settingsUrl) {
                UIApplication.shared.open(settingsUrl, completionHandler: { (success) in
                    print("Settings opened: \(success)") // Prints true
                })
            }
        }
        alertController.addAction(settingsAction)
        
        let okAction = UIAlertAction(title: "Turn Off GPS", style: .default) { (action) in
            UserDefaults.standard.setValue(false, forKey: "SaveGPS")
            self.updateDisplayFromDefaults()
        }
        alertController.addAction(okAction)
        
        present(alertController, animated: true)
    }
    else if(status == .authorizedWhenInUse)
    {
        if locationManager != nil {
            if(locationManager!.accuracyAuthorization == .reducedAccuracy) {
                let alertController = UIAlertController(title: "GPS Reduced Accuracy", message: "Your location settings for this App is set to reduced accuracy. We recommend to use high accuracy.", preferredStyle: .alert)

                let settingsAction = UIAlertAction(title: "Settings", style: .default) { (action) in
                    guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
                        return
                    }

                    if UIApplication.shared.canOpenURL(settingsUrl) {
                        UIApplication.shared.open(settingsUrl, completionHandler: { (success) in
                            print("Settings opened: \(success)") // Prints true
                        })
                    }
                }
                alertController.addAction(settingsAction)
                
                let okAction = UIAlertAction(title: "Ignore", style: .default) { (action) in
                }
                alertController.addAction(okAction)
                
                present(alertController, animated: true)
            }
        }
    }
}
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // The screen shouldn't dim during AR experiences.
        UIApplication.shared.isIdleTimerDisabled = true
    }
    
    var statusBarOrientation: UIInterfaceOrientation? {
        get {
            guard let orientation = UIApplication.shared.windows.first?.windowScene?.interfaceOrientation else {
                #if DEBUG
                fatalError("Could not obtain UIInterfaceOrientation from a valid windowScene")
                #else
                return nil
                #endif
            }
            return orientation
        }
    }
        
    deinit {
        EAGLContext.setCurrent(context)
        rtabmap = nil
        context = nil
        EAGLContext.setCurrent(nil)
    }
    
    var firstTouch: UITouch?
    var secondTouch: UITouch?
    
    override func touchesBegan(_ touches: Set<UITouch>,
                 with event: UIEvent?)
    {
        super.touchesBegan(touches, with: event)
        for touch in touches {
            if (firstTouch == nil) {
                firstTouch = touch
                let pose = touch.location(in: self.view)
                let normalizedX = pose.x / self.view.bounds.size.width;
                let normalizedY = pose.y / self.view.bounds.size.height;
                rtabmap?.onTouchEvent(touch_count: 1, event: 0, x0: Float(normalizedX), y0: Float(normalizedY), x1: 0.0, y1: 0.0);
            }
            else if (firstTouch != nil && secondTouch == nil)
            {
                secondTouch = touch
                if let pose0 = firstTouch?.location(in: self.view)
                {
                    if let pose1 = secondTouch?.location(in: self.view)
                    {
                        let normalizedX0 = pose0.x / self.view.bounds.size.width;
                        let normalizedY0 = pose0.y / self.view.bounds.size.height;
                        let normalizedX1 = pose1.x / self.view.bounds.size.width;
                        let normalizedY1 = pose1.y / self.view.bounds.size.height;
                        rtabmap?.onTouchEvent(touch_count: 2, event: 5, x0: Float(normalizedX0), y0: Float(normalizedY0), x1: Float(normalizedX1), y1: Float(normalizedY1));
                    }
                }
            }
        }
        if self.isPaused {
            self.view.setNeedsDisplay()
        }
    }
    
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesMoved(touches, with: event)
        var firstTouchUsed = false
        var secondTouchUsed = false
        for touch in touches {
            if(touch == firstTouch)
            {
                firstTouchUsed = true
            }
            else if(touch == secondTouch)
            {
                secondTouchUsed = true
            }
        }
        if(secondTouch != nil)
        {
            if(firstTouchUsed || secondTouchUsed)
            {
                if let pose0 = firstTouch?.location(in: self.view)
                {
                    if let pose1 = secondTouch?.location(in: self.view)
                    {
                        let normalizedX0 = pose0.x / self.view.bounds.size.width;
                        let normalizedY0 = pose0.y / self.view.bounds.size.height;
                        let normalizedX1 = pose1.x / self.view.bounds.size.width;
                        let normalizedY1 = pose1.y / self.view.bounds.size.height;
                        rtabmap?.onTouchEvent(touch_count: 2, event: 2, x0: Float(normalizedX0), y0: Float(normalizedY0), x1: Float(normalizedX1), y1: Float(normalizedY1));
                    }
                }
            }
        }
        else if(firstTouchUsed)
        {
            if let pose = firstTouch?.location(in: self.view)
            {
                let normalizedX = pose.x / self.view.bounds.size.width;
                let normalizedY = pose.y / self.view.bounds.size.height;
                rtabmap?.onTouchEvent(touch_count: 1, event: 2, x0: Float(normalizedX), y0: Float(normalizedY), x1: 0.0, y1: 0.0);
            }
        }
        if self.isPaused {
            self.view.setNeedsDisplay()
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesEnded(touches, with: event)
        for touch in touches {
            if(touch == firstTouch)
            {
                firstTouch = nil
            }
            else if(touch == secondTouch)
            {
                secondTouch = nil
            }
        }
        if (firstTouch == nil && secondTouch != nil)
        {
            firstTouch = secondTouch
            secondTouch = nil
        }
        if (firstTouch != nil && secondTouch == nil)
        {
            let pose = firstTouch!.location(in: self.view)
            let normalizedX = pose.x / self.view.bounds.size.width;
            let normalizedY = pose.y / self.view.bounds.size.height;
            rtabmap?.onTouchEvent(touch_count: 1, event: 0, x0: Float(normalizedX), y0: Float(normalizedY), x1: 0.0, y1: 0.0);
        }
        if self.isPaused {
            self.view.setNeedsDisplay()
        }
    }
    
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesCancelled(touches, with: event)
        for touch in touches {
            if(touch == firstTouch)
            {
                firstTouch = nil;
            }
            else if(touch == secondTouch)
            {
                secondTouch = nil;
            }
        }
        if self.isPaused {
            self.view.setNeedsDisplay()
        }
    }
    
    //=========================================================================================================================
    //These functions are app functionality. Scanning, mapping, uploading, etc.
    
    //RTABMap function
    /*
     @IBAction func doubleTapped(_ gestureRecognizer: UITapGestureRecognizer) {
        if gestureRecognizer.state == UIGestureRecognizer.State.recognized
        {
            let pose = gestureRecognizer.location(in: gestureRecognizer.view)
            let normalizedX = pose.x / self.view.bounds.size.width;
            let normalizedY = pose.y / self.view.bounds.size.height;
            rtabmap?.onTouchEvent(touch_count: 3, event: 0, x0: Float(normalizedX), y0: Float(normalizedY), x1: 0.0, y1: 0.0);
        
            
            if self.isPaused {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.view.setNeedsDisplay()
                }
            }
        }
    }
    */
    
    //RTABMap function
    /*
     @IBAction func `singleTapped`(_ gestureRecognizer: UITapGestureRecognizer) {
        if gestureRecognizer.state == UIGestureRecognizer.State.recognized
        {
            resetNoTouchTimer(!mHudVisible)
            
            if self.isPaused {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.view.setNeedsDisplay()
                }
            }
        }
    }
     */
    
    //RTABMap function
    func registerSettingsBundle(){
        let appDefaults = [String:AnyObject]()
        UserDefaults.standard.register(defaults: appDefaults)
    }
    
    //RTABMap function
    func updateDisplayFromDefaults() {
        //Get the defaults
        let defaults = UserDefaults.standard
        
        //Original RTABMap variable
        //let appendMode = defaults.bool(forKey: "AppendMode")
        
        // update preference
        rtabmap!.setOnlineBlending(enabled: defaults.bool(forKey: "Blending"));
        rtabmap!.setNodesFiltering(enabled: defaults.bool(forKey: "NodesFiltering"));
        rtabmap!.setFullResolution(enabled: defaults.bool(forKey: "HDMode"));
        rtabmap!.setSmoothing(enabled: defaults.bool(forKey: "Smoothing"));
        rtabmap!.setAppendMode(enabled: defaults.bool(forKey: "AppendMode"));
        
        mTimeThr = (defaults.string(forKey: "TimeLimit")! as NSString).integerValue
        mMaxFeatures = (defaults.string(forKey: "MaxFeaturesExtractedLoopClosure")! as NSString).integerValue
        
        // Mapping parameters
        rtabmap!.setMappingParameter(key: "Rtabmap/DetectionRate", value: defaults.string(forKey: "UpdateRate")!);
        rtabmap!.setMappingParameter(key: "Rtabmap/TimeThr", value: defaults.string(forKey: "TimeLimit")!);
        rtabmap!.setMappingParameter(key: "Rtabmap/MemoryThr", value: defaults.string(forKey: "MemoryLimit")!);
        rtabmap!.setMappingParameter(key: "RGBD/LinearSpeedUpdate", value: defaults.string(forKey: "MaximumMotionSpeed")!);
        let motionSpeed = ((defaults.string(forKey: "MaximumMotionSpeed")!) as NSString).floatValue/2.0;
        rtabmap!.setMappingParameter(key: "RGBD/AngularSpeedUpdate", value: NSString(format: "%.2f", motionSpeed) as String);
        rtabmap!.setMappingParameter(key: "Rtabmap/LoopThr", value: defaults.string(forKey: "LoopClosureThreshold")!);
        rtabmap!.setMappingParameter(key: "Mem/RehearsalSimilarity", value: defaults.string(forKey: "SimilarityThreshold")!);
        rtabmap!.setMappingParameter(key: "Kp/MaxFeatures", value: defaults.string(forKey: "MaxFeaturesExtractedVocabulary")!);
        rtabmap!.setMappingParameter(key: "Vis/MaxFeatures", value: defaults.string(forKey: "MaxFeaturesExtractedLoopClosure")!);
        rtabmap!.setMappingParameter(key: "Vis/MinInliers", value: defaults.string(forKey: "MinInliers")!);
        rtabmap!.setMappingParameter(key: "RGBD/OptimizeMaxError", value: defaults.string(forKey: "MaxOptimizationError")!);
        rtabmap!.setMappingParameter(key: "Kp/DetectorStrategy", value: defaults.string(forKey: "FeatureType")!);
        rtabmap!.setMappingParameter(key: "Vis/FeatureType", value: defaults.string(forKey: "FeatureType")!);
        rtabmap!.setMappingParameter(key: "Mem/NotLinkedNodesKept", value: defaults.bool(forKey: "SaveAllFramesInDatabase") ? "true" : "false");
        rtabmap!.setMappingParameter(key: "RGBD/OptimizeFromGraphEnd", value: defaults.bool(forKey: "OptimizationfromGraphEnd") ? "true" : "false");
        rtabmap!.setMappingParameter(key: "RGBD/MaxOdomCacheSize", value: defaults.string(forKey: "MaximumOdometryCacheSize")!);
        rtabmap!.setMappingParameter(key: "Optimizer/Strategy", value: defaults.string(forKey: "GraphOptimizer")!);
        rtabmap!.setMappingParameter(key: "RGBD/ProximityBySpace", value: defaults.string(forKey: "ProximityDetection")!);
        
        let markerDetection = defaults.integer(forKey: "ArUcoMarkerDetection")
        if(markerDetection == -1)
        {
            rtabmap!.setMappingParameter(key: "RGBD/MarkerDetection", value: "false");
        }
        else
        {
            rtabmap!.setMappingParameter(key: "RGBD/MarkerDetection", value: "true");
            rtabmap!.setMappingParameter(key: "Marker/Dictionary", value: defaults.string(forKey: "ArUcoMarkerDetection")!);
            rtabmap!.setMappingParameter(key: "Marker/CornerRefinementMethod", value: (markerDetection > 16 ? "3":"0"));
            rtabmap!.setMappingParameter(key: "Marker/MaxDepthError", value: defaults.string(forKey: "MarkerDepthErrorEstimation")!);
            if let val = NumberFormatter().number(from: defaults.string(forKey: "MarkerSize")!)?.doubleValue
            {
                rtabmap!.setMappingParameter(key: "Marker/Length", value: String(format: "%f", val/100.0))
            }
            else{
                rtabmap!.setMappingParameter(key: "Marker/Length", value: "0")
            }
        }
        
        // Rendering
        rtabmap!.setCloudDensityLevel(value: defaults.integer(forKey: "PointCloudDensity"));
        rtabmap!.setMaxCloudDepth(value: defaults.float(forKey: "MaxDepth"));
        rtabmap!.setMinCloudDepth(value: defaults.float(forKey: "MinDepth"));
        rtabmap!.setDepthConfidence(value: defaults.integer(forKey: "DepthConfidence"));
        rtabmap!.setPointSize(value: defaults.float(forKey: "PointSize"));
        rtabmap!.setMeshAngleTolerance(value: defaults.float(forKey: "MeshAngleTolerance"));
        rtabmap!.setMeshTriangleSize(value: defaults.integer(forKey: "MeshTriangleSize"));
        rtabmap!.setMeshDecimationFactor(value: 0.20); // defaults.float(forKey: "MeshDecimationFactor"));
        let bgColor = defaults.float(forKey: "BackgroundColor");
        rtabmap!.setBackgroundColor(gray: bgColor);
        
        DispatchQueue.main.async {
            self.informationLabel.textColor = bgColor>=0.6 ? UIColor(white: 0.0, alpha: 1) : UIColor(white: 1.0, alpha: 1)
        }
        
        rtabmap!.setClusterRatio(value: defaults.float(forKey: "NoiseFilteringRatio"));
        rtabmap!.setMaxGainRadius(value: defaults.float(forKey: "ColorCorrectionRadius"));
        rtabmap!.setRenderingTextureDecimation(value: defaults.integer(forKey: "TextureResolution"));
        
        if(locationManager != nil && !defaults.bool(forKey: "SaveGPS"))
        {
            locationManager?.stopUpdatingLocation()
            locationManager = nil
            mLastKnownLocation = nil
        }
        else if(locationManager == nil && defaults.bool(forKey: "SaveGPS"))
        {
            locationManager = CLLocationManager()
            locationManager?.desiredAccuracy = kCLLocationAccuracyBestForNavigation
            locationManager?.delegate = self
        }
    }
    
    //Original RTABMap function
    func updateDatabases() {
        databases.removeAll()
        do {
            let fileURLs = try FileManager.default.contentsOfDirectory(at: getDocumentDirectory(), includingPropertiesForKeys: nil)
            // if you want to filter the directory contents you can do like this:
            
            let data = fileURLs.map {
                url in (url, (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? Date.distantPast)
            }
                .sorted(by: { $0.1 > $1.1 }) // sort descending modification dates
                .map { $0.0 } // extract file names
            databases = data.filter{ $0.pathExtension == "db" && $0.lastPathComponent != RTABMAP_TMP_DB && $0.lastPathComponent != RTABMAP_RECOVERY_DB }
            
        } catch {
            print("Error while enumerating files : \(error.localizedDescription)")
            return
        }
    }
    
    func newScan() {
        //TODO: add a database check if id exist
        self.captureID = String(generateRandomCaptureID())
        self.datasetID = 1;
        self.CaptureStarted = true;
        self.saveState = .standby;
        
        print("databases.size() = \(databases.size())")
        
        updateState_v2(state: .STATE_IDLE)
        
        mMapNodes = 0;
        self.openedDatabasePath = nil
        let tmpDatabase = self.getDocumentDirectory().appendingPathComponent(self.RTABMAP_TMP_DB)
        let inMemory = UserDefaults.standard.bool(forKey: "DatabaseInMemory")
        
        /*
        if(!(self.mState == State.STATE_CAMERA_STANDBY || self.mState == State.STATE_MAPPING) &&
           FileManager.default.fileExists(atPath: tmpDatabase.path) &&
           tmpDatabase.fileSize > 1024*1024) // > 1MB
        {
            dismiss(animated: true, completion: {
                let msg = "The previous session (\(tmpDatabase.fileSizeString)) was not correctly saved, do you want to recover it?"
                let alert = UIAlertController(title: "Recovery", message: msg, preferredStyle: .alert)
                
                let alertActionNo = UIAlertAction(title: "Ignore", style: .destructive) {
                    (UIAlertAction) -> Void in
                    do {
                        try FileManager.default.removeItem(at: tmpDatabase)
                    }
                    catch {
                        print("Could not clear tmp database: \(error)")
                    }
                    self.newScan()
                }
                alert.addAction(alertActionNo)
                
                let alertActionCancel = UIAlertAction(title: "Cancel", style: .cancel) {
                    (UIAlertAction) -> Void in
                    // do nothing
                }
                alert.addAction(alertActionCancel)
                
                let alertActionYes = UIAlertAction(title: "Yes", style: .default) {
                    (UIAlertAction2) -> Void in

                    let fileName = Date().getFormattedDate(format: "yyMMdd-HHmmss") + ".db"
                    let outputDbPath = self.getDocumentDirectory().appendingPathComponent(fileName).path
                    
                    var indicator: UIActivityIndicatorView?
                    
                    let alertView = UIAlertController(title: "Recovering", message: "Please wait while recovering data...", preferredStyle: .alert)
                    
                    let alertViewActionCancel = UIAlertAction(title: "Cancel", style: .cancel) {
                        (UIAlertAction) -> Void in
                        self.dismiss(animated: true, completion: {
                            self.progressView = nil
                            
                            indicator = UIActivityIndicatorView(style: .large)
                            indicator?.frame = CGRect(x: 0.0, y: 0.0, width: 60.0, height: 60.0)
                            indicator?.center = self.view.center
                            self.view.addSubview(indicator!)
                            indicator?.bringSubviewToFront(self.view)
                            
                            indicator?.startAnimating()
                            self.rtabmap!.cancelProcessing();
                        })
                    }
                    alertView.addAction(alertViewActionCancel)
                    
                    let previousState = self.mState
                    self.updateState_v2(state: .STATE_PROCESSING);
                    
                    self.present(alertView, animated: true, completion: {
                        //  Add your progressbar after alert is shown (and measured)
                        let margin:CGFloat = 8.0
                        let rect = CGRect(x: margin, y: 84.0, width: alertView.view.frame.width - margin * 2.0 , height: 2.0)
                        self.progressView = UIProgressView(frame: rect)
                        self.progressView!.progress = 0
                        self.progressView!.tintColor = self.view.tintColor
                        alertView.view.addSubview(self.progressView!)
                        
                        var success : Bool = false
                        DispatchQueue.background(background: {
                            
                            success = self.rtabmap!.recover(from: tmpDatabase.path, to: outputDbPath)
                            
                        }, completion:{
                            if(indicator != nil)
                            {
                                indicator!.stopAnimating()
                                indicator!.removeFromSuperview()
                            }
                            if self.progressView != nil
                            {
                                self.dismiss(animated: self.openedDatabasePath == nil, completion: {
                                    if(success)
                                    {
                                        let alertSaved = UIAlertController(title: "Database saved!", message: String(format: "Database \"%@\" successfully recovered!", fileName), preferredStyle: .alert)
                                        let yes = UIAlertAction(title: "OK", style: .default) {
                                            (UIAlertAction) -> Void in
                                            self.openDatabase(fileUrl: URL(fileURLWithPath: outputDbPath))
                                        }
                                        alertSaved.addAction(yes)
                                        self.present(alertSaved, animated: true, completion: nil)
                                    }
                                    else
                                    {
                                        self.updateState_v2(state: previousState);
                                        self.showToast(message: "Recovery failed!", seconds: 4)
                                    }
                                })
                            }
                            else
                            {
                                self.showToast(message: "Recovery canceled", seconds: 2)
                                self.updateState_v2(state: previousState);
                            }
                        })
                    })
                }
                alert.addAction(alertActionYes)
                
                self.present(alert, animated: true, completion: nil)
            })
        }
        else
        {
        */
        
            self.rtabmap!.openDatabase(databasePath: tmpDatabase.path, databaseInMemory: inMemory, optimize: false, clearDatabase: true)

            if(!(self.mState == State.STATE_CAMERA_STANDBY || self.mState == State.STATE_MAPPING))
            {
                self.setGLCamera(type: 0);
                self.startCamera();
            }
        //}
    }
    
    func saveIterationUninterrupted() {
    self.saveState = .inititated;
    
    timerManager?.stopTimer()
    
    //if user indicated to stop scanning, set rtabmap mapping to paused
    if(!self.enableScanningLoop)
    {
        self.rtabmap?.setPausedMapping(paused: true)
    }
    
    self.saveUninterruptedOperations();
    //savingIteration = false;
    self.saveState = .standby;
}
    
    func saveUninterruptedOperations() {
    //let previousState = mState;
    //updateState(state: .STATE_PROCESSING);
    
    //self.rtabmap?.save(databasePath: aaa) // Save in the background
    
    DispatchQueue.global(qos: .background).async
    {
        self.saveState = .writingDatabase;
        var saveSuccess = false
        var optimizedSucess = false
        var meshingSuccess = false
        var meshSavingSucess = false
        //var filesUploadSuccess = false
        
        var pointCloudSuccess = false
        var pointCloudSavingSucess = false
        
        let filedb = self.captureID + "-" + String(self.datasetID)
        let fileDBURL = self.getDocumentDirectory().appendingPathComponent(filedb + ".db")
        let fileDBPath = self.getDocumentDirectory().appendingPathComponent(filedb + ".db").path
        let fileModel = String(self.datasetID)
        let fileModelPath = self.getDocumentDirectory().appendingPathComponent(fileModel + "-obj" + ".zip").path
        let filePly = String(self.datasetID)
        let filePlyPath = self.getDocumentDirectory().appendingPathComponent(fileModel + "-ply" + ".zip").path
        
        //var meshZipFileUrl : URL!
        
        //This is never used
        //let exportDir = self.getTmpDirectory().appendingPathComponent(self.RTABMAP_EXPORT_DIR)
        
        let defaults = UserDefaults.standard
        
        //self.openedDatabasePath = URL(fileURLWithPath: fileDBPath)
        
        
        let tmpDatabaseURL = self.getDocumentDirectory().appendingPathComponent(self.RTABMAP_TMP_DB)
        
        //let destinationPathURL = self.getDocumentDirectory().appendingPathComponent(self.captureID + "_" + String(self.datasetID) + "tmpDBexported.db")
        //print(destinationPathURL.path)
        
        //desdb file is saved if new scan only.
        //if existing desdb file in folder, will delete but will not save new desdb
        //if other files exist in folder, wont copy desdb??
        
        
        // if commented out, on 2nd iteration onwards desdb is not updated
        // desdb only saves on new scan/1st iteration
        
        /*
        if FileManager.default.fileExists(atPath: destinationPathURL.path)
        {
            do {
                try FileManager.default.removeItem(at: destinationPathURL)
            }
            catch {
                print("Could remove existing tmp db file copy: \(error)")
            }
        }
        */
        
        do {
            try FileManager.default.copyItem(at: tmpDatabaseURL, to: fileDBURL)
        }
        catch {
            print("Could copy db file: \(error)")
        }
        
        //            self.rtabmap!.openDatabase(databasePath: tmpDatabase.path, databaseInMemory: inMemory, optimize: false, clearDatabase: false)
        
        //set state as saving DB file
        self.saveState = .savingDatabase;
        
        //june24: Okay, .save is not need to save the .db file. can just copy the tmp .db file,
        //send to server and process from there to generate the 3d model
        
        //so what is rtabmap?.save for? To easily save the .db file to another folder (documents)?
        //Not: save. also deletes the tmp .db file
        //self.rtabmap?.save(databasePath: fileDBPath)
        
        //self.openedDatabasePath = URL(fileURLWithPath: fileDBPath)
        
        self.datasetID += 1
        
        //start mapping again
        DispatchQueue.main.async
        {
            if(self.enableScanningLoop)
            {
                self.rtabmap?.setPausedMapping(paused: false)
                self.showToast(message: "Started scanning for iteration: " + String(self.datasetID), seconds: 2.0)
            }
            else
            {
                self.showToast(message: "Stopped scanning for session. Latest iteration: " + String(self.datasetID - 1), seconds: 2.0)
            }
        }
        
        // optimize the saved file
        //var loopDetected : Int = -1
        //loopDetected = self.rtabmap!.postProcessing(approach: -1);
        
        /*
        DispatchQueue.main.async
        {
            if(loopDetected >= 0)
            {
                optimizedSucess = true
                self.showToast(message: "Optimization Successful!", seconds: 4.0)
            }
            else if(loopDetected < 0)
            {
                optimizedSucess = false
                self.showToast(message: "Optimization failed!", seconds: 4.0)
            }
        }
        */
        
        /*
        self.saveState = .generatingMesh;
        
        meshingSuccess = self.rtabmap!.exportMesh(
                cloudVoxelSize: defaults.float(forKey: "VoxelSize"),
                regenerateCloud: false,
                meshing: true,
                textureSize: defaults.integer(forKey: "TextureSize"),
                textureCount: defaults.integer(forKey: "MaximumOutputTextures"),
                normalK: defaults.integer(forKey: "NormalK"),
                optimized: true,
                optimizedVoxelSize: defaults.float(forKey: "VoxelSize"),
                optimizedDepth: defaults.integer(forKey: "ReconstructionDepth"),
                optimizedMaxPolygons: 130000,
                optimizedColorRadius: defaults.float(forKey: "ColorRadius"),
                optimizedCleanWhitePolygons: defaults.bool(forKey: "CleanMesh"),
                optimizedMinClusterSize: defaults.integer(forKey: "PolygonFiltering"),
                optimizedMaxTextureDistance: defaults.float(forKey: "MaxTextureDistance"),
                optimizedMinTextureClusterSize: defaults.integer(forKey: "MinTextureClusterSize"),
                blockRendering: false)
        */
        
        /*
        DispatchQueue.main.async
        {
            if(meshingSuccess)
            {
                self.showToast(message: "Meshing Sucessful!", seconds: 4.0)
            }
            else
            {
                self.showToast(message: "Meshing failed!", seconds: 4.0)
            }
        }
            */
        
        /*
        self.saveState = .savingMesh;
        //save mesh to file
        do {
            try FileManager.default.removeItem(at: exportDir)
        }
        catch
        {}
        
        do {
            try FileManager.default.createDirectory(at: exportDir, withIntermediateDirectories: true)
        }
        catch
        {
            print("Failed adding export directory \(exportDir)")
            return
        }
        print("Exporting to directory \(exportDir.path) with name \(fileModel)")
        if(self.rtabmap!.writeExportedMesh(directory: exportDir.path, name: fileModel))
        {
            do {
                //Check if files were exported to the folder
                let fileURLs = try FileManager.default.contentsOfDirectory(at: exportDir, includingPropertiesForKeys: nil)
                if(!fileURLs.isEmpty)
                {
                    //zip files
                    do {
                        let tempName = fileModel + "-obj"
                        meshZipFileUrl = try Zip.quickZipFiles(fileURLs, fileName: tempName)
                        print("Zip file \(meshZipFileUrl.path) created (size=\(meshZipFileUrl.fileSizeString)")
                        meshSavingSucess = true
                    }
                    catch {
                        print("Something went wrong while zipping")
                    }
                }
            } catch {
                print("No files exported to \(exportDir)")
                return
            }
        }
            */
        
        /*
        //Generate point clouds
        self.saveState = .generatingPointClouds;
        pointCloudSuccess = self.rtabmap!.exportMesh(
            cloudVoxelSize: defaults.float(forKey: "VoxelSize"),
            regenerateCloud: false,
            meshing: false,
            textureSize: 0,
            textureCount: defaults.integer(forKey: "MaximumOutputTextures"),
            normalK: defaults.integer(forKey: "NormalK"),
            optimized: true,
            optimizedVoxelSize: defaults.float(forKey: "VoxelSize"),
            optimizedDepth: defaults.integer(forKey: "ReconstructionDepth"),
            optimizedMaxPolygons: 10000,
            optimizedColorRadius: defaults.float(forKey: "ColorRadius"),
            optimizedCleanWhitePolygons: defaults.bool(forKey: "CleanMesh"),
            optimizedMinClusterSize: defaults.integer(forKey: "PolygonFiltering"),
            optimizedMaxTextureDistance: defaults.float(forKey: "MaxTextureDistance"),
            optimizedMinTextureClusterSize: defaults.integer(forKey: "MinTextureClusterSize"),
            blockRendering: false)
        
        //save point clouds to file
            self.saveState = .savingPointClouds;
        do {
            try FileManager.default.removeItem(at: exportDir)
        }
        catch
        {}
        
        do {
            try FileManager.default.createDirectory(at: exportDir, withIntermediateDirectories: true)
        }
        catch
        {
            print("Failed adding export directory \(exportDir)")
            return
        }
        print("Exporting to directory \(exportDir.path) with name \(filePly)")
        if(self.rtabmap!.writeExportedMesh(directory: exportDir.path, name: filePly))
        {
            do {
                //Check if files were exported to the folder
                let fileURLs = try FileManager.default.contentsOfDirectory(at: exportDir, includingPropertiesForKeys: nil)
                if(!fileURLs.isEmpty)
                {
                    //zip files
                    do {
                        let tempName = filePly + "-ply"
                        meshZipFileUrl = try Zip.quickZipFiles(fileURLs, fileName: tempName)
                        print("Zip file \(meshZipFileUrl.path) created (size=\(meshZipFileUrl.fileSizeString)")
                        pointCloudSavingSucess = true
                    }
                    catch {
                        print("Something went wrong while zipping")
                    }
                }
            } catch {
                print("No files exported to \(exportDir)")
                return
            }
        }
            */
        
        /*
        DispatchQueue.main.async {
            if meshSavingSucess
            {
                self.showToast(message: "OBJ files export success!", seconds: 4.0)
            }
            else
            {
                self.showToast(message: "OBJ files export success!", seconds: 4.0)
            }
        }
            */
        
        self.saveState = .uploadingAll;
        //Upload db file
        if let fileData = FileManager.default.contents(atPath: fileDBPath)
        {
            self.networking?.uploadDatabaseFile(captureID: self.captureID, fileData: fileData, fileName: filedb + ".db", path: fileDBPath) { error in
                if let error = error {
                    print("Error: \(error)")
                    //filesUploadSuccess = true
                } else {
                    print("Upload database successful")
                    //filesUploadSuccess = false
                }
            }
        }
        print("after upload")
        print(FileManager.default.fileExists(atPath: fileDBPath))
        /*
        //Upload mesh zip file
        if let fileData = FileManager.default.contents(atPath: fileModelPath)
        {
            self.networking?.uploadModelZippedFile(captureID: self.captureID, fileData: fileData, fileName: fileModel + ".zip", path: fileModelPath) { error in
                if let error = error {
                    print("Error: \(error)")
                    filesUploadSuccess = true
                } else {
                    print("Upload model zip successful")
                    filesUploadSuccess = false
                }
            }
        }
            */

        /*
        //Upload point cloud zip file
        if let fileData = FileManager.default.contents(atPath: filePlyPath)
        {
            self.networking?.uploadPlyZippedFile(captureID: self.captureID, fileData: fileData, fileName: filePly + ".zip", path: filePlyPath) { error in
                if let error = error {
                    print("Error: \(error)")
                    filesUploadSuccess = true
                } else {
                    print("Upload ply zip successful")
                    filesUploadSuccess = false
                }
            }
        }
            */
        
        /*
        DispatchQueue.main.async
        {
            let alertText = //"Save:" + String(saveSuccess)
            "optimization:" + String(optimizedSucess)
            + "\n" + "meshing:" + String(meshingSuccess)
            + "\n" + "export file:" + String(meshSavingSucess)
            //"Dataset: " + String(success) + " for capture " + self.captureID
            let alertController = UIAlertController(title: "Optimize uploaded: " + String(optimizedSucess), message: alertText, preferredStyle: .alert)
            Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { timer in
                alertController.dismiss(animated: true, completion: nil)
            }
            self.present(alertController, animated: true, completion: nil)
        }
        */
        self.saveState = .completed;
        
        /*
        do {
            let tmpDatabase = self.getDocumentDirectory().appendingPathComponent(fileDBPath)
            print("Copy DB ================================")
            print(fileDBPath)
            
            let destinationPath = self.getDocumentDirectory().appendingPathComponent("tmpDBexported.db")
            print(destinationPath)
            
            try FileManager.default.copyItem(at: fileDBPath.asURL(), to: destinationPath)
        }
        catch {
            print("Could copy db file: \(error)")
        }
        */
        
        /*
        do {
            let tmpDatabase = self.getDocumentDirectory().appendingPathComponent(self.RTABMAP_TMP_DB)
            print("delete DB ================================")
            
            try FileManager.default.removeItem(at: tmpDatabase)
        }
        catch {
            print("Could not clear tmp database: \(error)")
        }
        */
        
        self.saveState = .standby;
        
        DispatchQueue.main.async {
            if(self.enableScanningLoop)
            {
                self.timerManager?.startTimer()
            }
        }
        
        print("after all")
        print(FileManager.default.fileExists(atPath: fileDBPath))
    }
}
    
    func displayInfo() {
        setInformationVisible(bool: true)
    }
    
    func hideInfo() {
        setInformationVisible(bool: false)
    }
    
    func displayModel() {
        setModelVisible(bool: true);
        informationConstrainModelOn.priority = UILayoutPriority(1000);
        informationConstrainModelOff.priority = UILayoutPriority(999);
    }
    
    func hideModel() {
        setModelVisible(bool: false);
        informationConstrainModelOn.priority = UILayoutPriority(999);
        informationConstrainModelOff.priority = UILayoutPriority(1000);
        //informationConstrainModelOff.isActive = true
        //informationConstrainModelOn.isActive = false
    }
    
    func getReconstructedModel() {
        let modelViewerScene = SCNScene(named: "testModel.obj")
        
        let lightNode = SCNNode()
        lightNode.light = SCNLight()
        lightNode.light?.type = .omni
        lightNode.position = SCNVector3(0, 10, 35)
        modelViewerScene?.rootNode.addChildNode(lightNode)
        
        let ambientLight = SCNNode()
        ambientLight.light = SCNLight()
        ambientLight.light?.type = .ambient
        ambientLight.light?.color = UIColor.darkGray
        modelViewerScene?.rootNode.addChildNode(ambientLight)
        
        ModelViewer.allowsCameraControl = true
        //ModelViewer.backgroundColor = UIColor.black
        ModelViewer.cameraControlConfiguration.allowsTranslation = false
        ModelViewer.scene = modelViewerScene
    }
    
    func setInformationVisible(bool: Bool) {
        self.informationLabel.isHidden = !bool;
        self.informationVisibleIcon.isHidden = bool;
        self.informationInvisibleIcon.isHidden = !bool;
    }
    
    func setModelVisible(bool: Bool) {
        self.ModelViewer.isHidden = !bool;
        self.ModelVisibleIcon.isHidden = bool;
        self.ModelInvisibleIcon.isHidden = !bool;
        self.modelPlaceholderText.isHidden = !bool;
    }
    
    //MARK: Actions
    @IBAction func stopAction(_ sender: UIButton) {
        self.enableScanningLoop = false;
        
        if(self.saveState == .standby)
        {
            self.saveIterationUninterrupted();
        }
        
        updateState_v2(state: .STATE_CAMERA_STANDBY);
    }

    //recordAction is used to start or resume a mapping session. (typically after the user has paused the session using the stopAction() func)
    @IBAction func recordAction(_ sender: UIButton) {
        self.enableScanningLoop = true;
        
        rtabmap?.setPausedMapping(paused: false)
        updateState_v2(state: .STATE_MAPPING)
        
        if(self.datasetID == 1)
        {
            timerManager?.startTimer()
        }
        
        self.recordButton.isHidden = true;
        self.stopButton.isHidden = false;
    }
    
    //Initialize variables and prepare the app to map as a new capture/reconstruction
    @IBAction func newScanAction(_ sender: UIButton) {
        newScan()
    }
    
    @IBAction func displayInfoAction(_ sender: UIButton) {
        displayInfo();
    }
    
    @IBAction func hideInforAction(_ sender: UIButton) {
        hideInfo();
    }
    
    @IBAction func displayModelAction(_ sender: UIButton) {
        displayModel();
    }
    
    @IBAction func hideModelAction(_ sender: UIButton) {
        hideModel();
    }
}

//=========================================================================================================================
// Extensions

extension ViewController: GLKViewControllerDelegate {
    
    // OPENGL UPDATE
    func glkViewControllerUpdate(_ controller: GLKViewController) {
        
    }
    
    // OPENGL DRAW
    override func glkView(_ view: GLKView, drawIn rect: CGRect) {
        if let rotation = UIApplication.shared.windows.first?.windowScene?.interfaceOrientation
        {
            let viewportSize = CGSize(width: rect.size.width * view.contentScaleFactor, height: rect.size.height * view.contentScaleFactor)
            rtabmap?.setupGraphic(size: viewportSize, orientation: rotation)
        }
        
        let value = rtabmap?.render()
        
        DispatchQueue.main.async {
            if(value != 0 && self.progressView != nil)
            {
                print("Render dismissing")
                self.dismiss(animated: true)
                self.progressView = nil
            }
            if(value == -1)
            {
                self.showToast(message: "Out of Memory!", seconds: 2)
            }
            else if(value == -2)
            {
                self.showToast(message: "Rendering Error!", seconds: 2)
            }
        }
    }
}

extension Date
{
   func getFormattedDate(format: String) -> String {
        let dateformat = DateFormatter()
        dateformat.dateFormat = format
        return dateformat.string(from: self)
    }
    
    var millisecondsSince1970:Int64 {
        Int64((self.timeIntervalSince1970 * 1000.0).rounded())
    }
    
    init(milliseconds:Int64) {
        self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
    }
}

extension DispatchQueue
{
    static func background(delay: Double = 0.0, background: (()->Void)? = nil, completion: (() -> Void)? = nil) {
        DispatchQueue.global(qos: .userInitiated).async {
            background?()
            if let completion = completion {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: {
                    completion()
                })
            }
        }
    }
}

extension ViewController: VerticalScrollerViewDelegate
{
    func verticalScrollerView(_ horizontalScrollerView: VerticalScrollerView, didSelectViewAt index: Int) {
    //1
    let previousDatabaseView = horizontalScrollerView.view(at: currentDatabaseIndex) as! DatabaseView
    previousDatabaseView.highlightDatabase(false)
    //2
    currentDatabaseIndex = index
    //3
    let databaseView = horizontalScrollerView.view(at: currentDatabaseIndex) as! DatabaseView
    databaseView.highlightDatabase(true)
    //4
  }
}

extension UserDefaults
{
    func reset() {
        let defaults = UserDefaults.standard
        defaults.dictionaryRepresentation().keys.forEach(defaults.removeObject(forKey:))
        
        setDefaultsFromSettingsBundle()
    }
}

extension SKStoreReviewController
{
    public static func requestReviewInCurrentScene() {
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            requestReview(in: scene)
        }
    }
}
