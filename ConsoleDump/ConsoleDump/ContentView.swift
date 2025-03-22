//
//  ContentView.swift
//  ConsoleDump
//
//  Created by Colin Teahan on 5/19/24.
//

import SwiftUI

struct ContentView: View {
  
  @Binding var messages: [CDMessage]
  
  func onAppear() {
    print("[ContentView] onAppear!")
  }
  
  var body: some View {
    VStack {
      List(messages, id: \.uniqueId) { msg in
        Text(msg.text)
      }
    }
  }
}
