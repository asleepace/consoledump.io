/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
import { type CollectionEntry } from 'astro:content'

/**
 * Declared locals for the application exposed via middleware.
 */
declare namespace App {
  interface Locals {
    sessions: Map<string, any>
  }
}
