/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
import { type CollectionEntry } from 'astro:content'
import { type SessionId } from '@/lib/shared/session-id'

declare global {
  interface Console {
    /** console dump method to current url (@client only). */
    dump(...args: any[]): Promise<void>
  }

  interface Window {
    /** console dump method to current url (@client only). */
    dump(...args: any[]): Promise<void>
  }

  /** console dump sessionId type. */
  type SessionId = SessionId

  namespace App {
    /** shared data extracted in middleware. */
    export interface Locals {
      /** valid sessionId for current stream. */
      sessionId?: SessionId
    }
  }
}
