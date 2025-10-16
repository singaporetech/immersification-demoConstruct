//
//  Created by Leon Foo on 2024-07-27
//

import Foundation
import Alamofire

class NetworkingManager: NSObject, URLSessionWebSocketDelegate {
    
    static let shared = NetworkingManager()
    
    //TODO: Create a user default to store IP
    public var hostName = "localhost" // Set IP address here using SetIP func
    private var port = ":8000" //Python server port
    
    //websocket settings
    public var webSocketSession: URLSession?
    public var webSocket: URLSessionWebSocketTask?
    private var webSocketurl = "wss://"
    
    // ssl and certification settings
    var certificate: SecCertificate?
    var serverTrustMngr: ServerTrustManager?
    
    //Alamo fire settings
    var afUplinkSession: Session?
    var afDownlinkSession: Session?
    
    public override init()
    {
        super.init()
    }
    
    // ======= Websocket functions =======
    
    public func startWebSocket()
    {
        webSocketSession = URLSession(configuration: .default, 
                             delegate: self,
                             delegateQueue: OperationQueue())
        print("websocket started")
        
        connect(stringURL: webSocketurl)
        
        pingTest()
        webSocketReceive()
        
        //webSocketSend(code: 900) //for testing only
    }
    
    public func endWebSocket()
    {
        disconnect()
    }
    
    func connect(stringURL: String)
    {
        print(stringURL)
        print(self.webSocketurl)
        webSocket = webSocketSession?.webSocketTask(with: URL(string: stringURL)!)
        webSocket?.resume()
        
        print("Websocket connected!")
    }

    func disconnect()
    {
        webSocket?.cancel(with: .goingAway, reason: "Connection ended".data(using: .utf8))
        webSocket = nil
        
        print("Websocket connected!")
    }
    
    public func pingTest()
    {
        webSocket?.sendPing { error in
            if let error = error {
                print("Ping error: \(error)")
            } else {
                print("Ping successful no loop")
            }
        }
        
        /*
        DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
            self.pingTest()
            self.webSocket?.sendPing { error in
                if let error = error {
                    print("Ping error: \(error)")
                } else {
                    print("Ping successful")
                }
            }
        }
         */
    }
    
    public func webSocketSend(code: Int)
    {
        do {
            //webSocket?.send(.string("Sent String"),
            //webSocket?.send(.data(jsonData),
            
            // Create json
            let codeDict: [String: Any] = [
                "_code": code,
            ]
            let jsonData = try JSONSerialization.data(withJSONObject: codeDict, options: [])
            
            //Convert json to string for sending over to server
            let jsonString = String(data: jsonData, encoding: .utf8)
            
            if (jsonString != nil) {
                webSocket?.send(.string(jsonString!), completionHandler: { error in
                    if let error = error {
                        print("Send error: \(error)")
                    } else {
                        print("Send successful!")
                    }
                })
            } else {
                print("Error converting JSON data to string")
            }

        } catch {
            print("Error encoding JSON: \(error)")
        }
        
        /*
        DispatchQueue.global().asyncAfter(deadline: .now()+1) {
            self.webSocketSendTest()
            self.webSocket?.send(.string("sending message at: \(Date().timeIntervalSinceNow)"), completionHandler: { error in
                        if let error = error
                            {
                                print("Send error: \(error)")
                            }
            })
        }
        */
    }
    
    public func webSocketReceive()
    {
        //TODO: improvement, to use actual websocket itself to get notification and reply of updated reconstructionss
        
        webSocket?.receive(completionHandler: { [weak self] result in
            switch result {
            case.success(let message):
                switch message 
                {
                case.data(let data):
                    print("receive data: \(data)")
                    
                    
                    
                case.string(let message):
                    print("receive string: \(message)")
                    let jsonDict = self?.convertToJson(jsonString: message)
                    print(jsonDict)
                    
                    var code = jsonDict?["_code"] as? Int
                    
                    //TODO: future implementation, use websockets instead of pinging the server every X seconds to check
                    /*
                     if code == 999
                    {
                        var recontrName = jsonDict?["name"] as? String
                        var reconstrVer = jsonDict?["version"] as? String
                        
                        ReconstructionManager.shared.downloadAndUpdateReconstruction(reconstructionName: recontrName!, version: reconstrVer!)
                        
                    }
                     */
                    
                    
                @unknown default:
                    break;
                }
                
            case.failure(let error):
                print("receive error \(error)")
            }
            self?.webSocketReceive()
        })
    }
    
    
    
    
    
    func convertToJson(jsonString: String) -> [String: Any]? {
        guard let jsonData = jsonString.data(using: .utf8) else {
            print("Could not convert Json string to Json Data")
            return nil
        }
        
        // Write json data to a dictonary and return
        do {
            if let jsonDict = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] {
                print(jsonDict)
                return jsonDict
            } else {
                print("Could not convert Json data to a dictionary")
                return nil
            }
        } catch {
            print("Error during JSON deserialization: \(error)")
            return nil
        }
    }
    
    // ======= Other functions =======
    
    public func setupNetworking()
    {
        let certRoot = "ssl-cert";
        
        // try load cert
        if let certPath = Bundle.main.path(forResource: certRoot, ofType: "pem") {
            do {
                let certData = try Data(contentsOf: URL(fileURLWithPath: certPath))
                print(certData)
                
                // Convert the PEM data by stripping out the BEGIN and END lines
                let certString = String(data: certData, encoding: .utf8)?
                    .replacingOccurrences(of: "-----BEGIN CERTIFICATE-----", with: "")
                    .replacingOccurrences(of: "-----END CERTIFICATE-----", with: "")
                    .replacingOccurrences(of: "\n", with: "")
                
                if let certBase64 = certString, let decodedData = Data(base64Encoded: certBase64) {
                     // Create the certificate from the decoded base64 data
                    print(decodedData)
                     if let cert = SecCertificateCreateWithData(nil, decodedData as CFData) {
                         print("Certificate loaded successfully")
                         certificate = cert
                     } else {
                         print("Failed to create certificate")
                     }
                 } else {
                     print("Failed to decode base64 certificate")
                 }
            } catch {
                print("Error loading certificate data: \(error)")
            }
        } else {
            print("Failed to load the certificate.")
            return
        }
        
        // if cert loaded, create trustMngr and session
        if let cert = certificate {
            let stmEvaltrs = [
                self.hostName :  PinnedCertificatesTrustEvaluator(certificates: [cert]) //DisabledTrustEvaluator() //
            ]
            serverTrustMngr = ServerTrustManager(allHostsMustBeEvaluated: false, evaluators: stmEvaltrs)
            
            //Create session that will handle uplink/upload of data
            afUplinkSession = Session(serverTrustManager: serverTrustMngr)

            //Create session that will handle downlink/download of data
            afDownlinkSession = Session(serverTrustManager: serverTrustMngr)
            
        } else {
            serverTrustMngr = nil
            afUplinkSession = nil
            print("Certificate is nil. Cannot create ServerTrustManager.")
        }
    }
    
    public func setIP(newIP: String)
    {
        self.hostName = newIP + self.port // if acccessible through local/private/lan networks, OR fctl servers
        // // FCTL servers due to some secruity config is a little weird, so it may need to use the statement above and not the one below.
        // // if it doesnt work, try the one below.
        //self.hostName = newIP // if needs to be accessible in any other static public IP
        
        // self.webSocketurl = "ws://" + self.ip + self.port + "/start_websocket"
        self.webSocketurl = "wss://" + self.hostName + "/start_websocket"
    }
    
    // ======= Alamo fire and up loading functions =======
    
    public func uploadDatabaseFile(captureID: String, fileData: Data, fileName: String, path: String, completion: @escaping (Error?) -> Void)
    {
        if let fileData = FileManager.default.contents(atPath: path), let session = self.afUplinkSession
        {
            print(fileData)
            print(session)
            let urlString = "https://" + hostName + "/uploaddataset/\(captureID)"
            guard let url = URL(string: urlString) else {
                print("Invalid URL")
                return
            }
            
            session.upload(multipartFormData: { multipartFormData in
                multipartFormData.append(fileData, withName: "file", fileName: fileName, mimeType: "application/octet-stream")},
                                                 to: url,
                                                 method: .post,
                                                 headers: nil)
            .validate()
            .response { response in
                switch response.result {
                case .success:
                    print("Upload successful")
                case .failure(let error):
                    print("Upload failed: \(error)")
                }
            }
        } else {
            print("Failed to read file data at path: \(path)")
            completion(NSError(domain: "demoConstruct Server", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to read file data"]))
        }
    }
    
    // Deprecated
    /*
    public func uploadModelZippedFile(captureID: String, fileData: Data, fileName: String, path: String, completion: @escaping (Error?) -> Void)
    {
        if let fileData = FileManager.default.contents(atPath: path) {
            let urlString = "http://" + ip + port + "/uploadmodelzip/\(captureID)"
            guard let url = URL(string: urlString) else {
                print("Invalid URL")
                return
            }

            AF.upload(multipartFormData: { multipartFormData in
                multipartFormData.append(fileData, withName: "file", fileName: fileName, mimeType: "application/octet-stream")
            }, to: url)
            .response { response in
                switch response.result {
                case .success:
                    print("Upload models successful")
                case .failure(let error):
                    print("Upload models failed: \(error)")
                }
            }
        } else {
            print("Failed to read file data at path: \(path)")
            completion(NSError(domain: "YourDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to read file data"])) // Call completion handler with an error
        }
    }
     */
    
    // Deprecated
    /*
    public func uploadPlyZippedFile(captureID: String, fileData: Data, fileName: String, path: String, completion: @escaping (Error?) -> Void)
    {
        if let fileData = FileManager.default.contents(atPath: path) {
            let urlString = "http://" + ip + port + "/uploadplyzip/\(captureID)"
            guard let url = URL(string: urlString) else {
                print("Invalid URL")
                return
            }

            AF.upload(multipartFormData: { multipartFormData in
                multipartFormData.append(fileData, withName: "file", fileName: fileName, mimeType: "application/octet-stream")
            }, to: url)
            .response { response in
                switch response.result {
                case .success:
                    print("Upload ply successful")
                case .failure(let error):
                    print("Upload ply failed: \(error)")
                }
            }
        } else {
            print("Failed to read file data at path: \(path)")
            completion(NSError(domain: "YourDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to read file data"])) // Call completion handler with an error
        }
    }
     */
    
    func downloadFileToMemory(url: URL, completion: @escaping (Data?, Error?) -> Void)
    {
        if let session = self.afDownlinkSession
        {
            let downloadUrl = url
                /*
            guard let urlCheck = URL(string: string) else {
                print("Invalid URL")
                return
            }
                 */
            
            // Perform the download request and handle the response data
            session.request(downloadUrl)
                .validate() // Validate the response status code (e.g., 200 OK)
                .responseData { response in
                    switch response.result {
                    case .success(let data):
                        print("Download successful. Data size: \(data.count) bytes")
                        completion(data, nil)
                    case .failure(let error):
                        print("Download failed: \(error.localizedDescription)")
                        completion(nil, error)
                    }
                }
            
            /*
            let destination: DownloadRequest.Destination = { _, _ in
                let fileURL = URL(fileURLWithPath: destinationPath)
                return (fileURL, [.removePreviousFile, .createIntermediateDirectories])
            }

            
            session.download(url, )
                .validate()
                .response { response in
                    switch response.result {
                    case .success:
                        print("Upload successful")
                    case .failure(let error):
                        print("Upload failed: \(error)")
                    }
                }
             */
            
            /*
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
             */
            // task.resume()
        }
        else
        {
            let error = NSError(domain: "NetworkingManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Alamofire downlink session was not found."])
            completion(nil, error)
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        guard let data = try? Data(contentsOf: location) else {
            print("Error in downlink urlSession")
            return
        }
        
        //parseAndDisplayModel(data: data)
    }

}

// ================= Networking enum =================

enum NetworkingError: Error {
    case invalidURL
}
