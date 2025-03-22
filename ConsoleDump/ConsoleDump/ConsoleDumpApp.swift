//
//  ConsoleDumpApp.swift
//  ConsoleDump
//
//  Created by Colin Teahan on 5/19/24.
//

import SwiftUI

@main
struct ConsoleDumpApp: App {
  
  @State var messages: [CDMessage] = []
  
  var network = CDNetwork()
  
  func onMessage(_ message: String) {
    print("[ConsoleDumpApp] onMessage: \(message)")
    messages.append(CDMessage(text: message))
  }
  
  var body: some Scene {
    WindowGroup {
        ContentView(messages: $messages)
        .onAppear(perform: {
          network.onMessage = self.onMessage(_:)
        })
    }
  }
}
