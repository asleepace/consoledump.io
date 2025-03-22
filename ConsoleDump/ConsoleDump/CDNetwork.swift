//
//  CDNetwork.swift
//  ConsoleDump
//
//  Created by Colin Teahan on 5/19/24.
//
//  Test incomming connections:
//
//  echo “Hello World” | nc -u -w1 localhost 4000
//

import Foundation
import Network

class CDNetwork {
    
  var udpListener:NWListener?
  var backgroundQueueUdpListener   = DispatchQueue(label: "udp-lis.bg.queue", attributes: [])
  var backgroundQueueUdpConnection = DispatchQueue(label: "udp-con.bg.queue", attributes: [])
  var connections = [NWConnection]()
  
  var onMessage: ((_ message: String) -> Void)? = nil
    
  init() {
    print("[cd] initializing!")
    self.udpListener = try! NWListener(using: .udp, on: 4000)
    self.udpListener?.stateUpdateHandler = { state in
      print("[cd] connection state handler ...")
      switch state {
      case .ready:
        print("[cd] ready!")
      case .waiting(let error):
        print("[cd] waiting: \(error)")
      case .failed(let error):
        print("[cd] failed: \(error)")
      default:
        print("[cd] unknown!")
      }
    }
    
    self.udpListener?.start(queue: self.backgroundQueueUdpListener)
    self.udpListener?.newConnectionHandler = { (incomingUdpConnection) in
      print("[cd] 📞 incoming connection... ")
      incomingUdpConnection.stateUpdateHandler = { (udpConnectionState) in
          switch udpConnectionState {
          case .setup:
              print("[cd] 👨🏼‍💻 setup")
          case .waiting(let error):
              print("[cd] ⏰ waiting: \(error)")
          case .ready:
              print("[cd] ✅ ready")
              self.connections.append(incomingUdpConnection)
              self.processData(incomingUdpConnection)
          case .failed(let error):
              print("[cd] 🔥 failed: \(error)")
              self.connections.removeAll(where: {incomingUdpConnection === $0})
          case .cancelled:
              print("[cd] 🛑 cancelled")
              self.connections.removeAll(where: {incomingUdpConnection === $0})
          default:
              break
          }
      }
      incomingUdpConnection.start(queue: self.backgroundQueueUdpConnection)
    }
  }
  
  func processData(_ incomingUdpConnection :NWConnection) {
    incomingUdpConnection.receiveMessage(completion: {(data, context, isComplete, error) in
      if let data = data, !data.isEmpty {
        if let string = String(data: data, encoding: .utf8) {
          print("- + - + - + - + - + - + - + - + - + - + - + - +")
          print(string)
          self.onMessage?(string)
        }
      }
      print ("[cd] isComplete: \(isComplete)")
      if error == nil {
        self.processData(incomingUdpConnection)
      }
    })
  }
}
