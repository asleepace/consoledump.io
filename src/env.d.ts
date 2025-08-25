/**
 * Declared locals for the application exposed via middleware.
 */
declare namespace App {
  interface Locals {
    sessions: Map<string, any>
  }
}
