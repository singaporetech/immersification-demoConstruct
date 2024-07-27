//
//  Created by Leon Foo on 2024-07-27
//

import Foundation
import Alamofire

class NetworkingManager {
    //TODO: Create a user default to store IP
    public var ip = "localhost" // Set IP address here using SetIP func
    private var port = ":8000" //Python server port
    
    public init()
    {
    }
    
    public func SetIP(newIP: String)
    {
        self.ip = newIP
    }
    
    public func uploadDatabaseFile(captureID: String, fileData: Data, fileName: String, path: String, completion: @escaping (Error?) -> Void)
    {
        if let fileData = FileManager.default.contents(atPath: path) {
            let urlString = "http://" + ip + port + "/uploaddataset/\(captureID)"
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
                    print("Upload successful")
                case .failure(let error):
                    print("Upload failed: \(error)")
                }
            }
        } else {
            print("Failed to read file data at path: \(path)")
            completion(NSError(domain: "YourDomain", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to read file data"])) // Call completion handler with an error
        }
    }
    
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
}

enum NetworkingError: Error {
    case invalidURL
}
