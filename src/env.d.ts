/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
import { type CollectionEntry } from 'astro:content'

// branded types
declare const __sessionIdBrand: unique symbol
declare const __clientIdBrand: unique symbol

declare global {


  /**
   * Session identifier which is tied to a specific stream.
   * 
   * ```ts
   * const sessionId = crypto.randomUUID().slice(0, 8) as SessionId
   * ```
   * 
   * @note (branded type) see `env.d.ts`
   */
  export type SessionId = string & {
    [__sessionIdBrand]: boolean
  }

  /**
   * Client identifier on stream, represented as a hex value.
   * 
   * ```
   * const cliendId = 0x00FF as ClientId 
   * ```
   * 
   * @note (branded type) see `env.d.ts`
   */
  export type ClientId = string & {
    [__clientIdBrand]: boolean
  }
  

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
