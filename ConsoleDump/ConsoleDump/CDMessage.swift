//
//  CDMessage.swift
//  ConsoleDump
//
//  Created by Colin Teahan on 5/19/24.
//

import Foundation

struct CDMessage: Hashable {
  
  static var lastMessageId = 1
  
  init(text: String) {
    self.text = text
    self.timestamp = Date()
    self.uniqueId = CDMessage.lastMessageId
    CDMessage.lastMessageId += 1
  }
  
  var text: String
  var uniqueId: Int
  var timestamp: Date
}
