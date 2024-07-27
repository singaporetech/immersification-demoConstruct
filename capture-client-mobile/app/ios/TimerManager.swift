//
//  Created by Leon Foo on 2024-07-27
//

import Foundation

class TimerManager {
    var timer: Timer?
    var isEnabled = false
    var interval = 6.0 //Simple countdown which will upload data every internal
    
    var callback: (() -> Void)?
    
    public func startTimer() {
        isEnabled = true
        timer = Timer.scheduledTimer(timeInterval: self.interval, target: self, selector: #selector(timerAction), userInfo: nil, repeats: true)
    }
    
    public func stopTimer() {
        isEnabled = false
        timer?.invalidate()
    }
    
    @objc func timerAction() {
         if isEnabled {
             callback?()
         }
     }
}
