import { useEffect, useMemo, useState } from "react"

export const TAB_ID_KEY = "tabId"

/**
 * Creates a new random tabId number
 */
export function generateTabId() {
  const seed = Date.now().toString(36).slice(-3)
  const rand = Math.random().toString(36).slice(-3)
  console.log("[useTabId] generating:", { seed, rand })
  const tabId = seed + rand
  return tabId
}

/**
 * This hook generates a unique ID for each different tab,
 * which allows our backend to have multiple subscriptions
 * to the same session.
 */
export function useTabId() {
  return useMemo(() => {
    if (import.meta.env.DEV) {
      return generateTabId()
    }
    let tabId = sessionStorage.getItem(TAB_ID_KEY)

    if (!tabId) {
      tabId = generateTabId()
      sessionStorage.setItem(TAB_ID_KEY, tabId)
    }
    console.log("[useTabId] id:", tabId)
    return tabId
  }, [])
}
