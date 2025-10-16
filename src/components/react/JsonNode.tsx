import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useId, useMemo, useState } from 'react'

export type JsonNodeProps = {
  data: unknown
  keyName?: string | null
  level?: number
}

function getPreviewLength(data: unknown, maxDepth = 1): number {
  if (maxDepth <= 0) return 0
  if (typeof data === 'string') return data.length
  if (typeof data === 'number') return String(data).length
  if (typeof data === 'undefined') return 'undefined'.length
  if (typeof data === 'object') {
    if (!data) return 'null'.length
    if (Array.isArray(data))
      return data.reduce((total, current) => {
        return total + getPreviewLength(current, maxDepth - 1)
      }, 0)

    return Object.entries(data).reduce((total, [key, value]) => {
      return (
        total + String(key + ':').length + getPreviewLength(value, maxDepth - 1)
      )
    }, 0)
  }

  return String(data).length
}

function getItemOrPreview(item: unknown) {
  if (item === null) return 'null'
  if (item === undefined) return 'undefined'
  if (typeof item === 'object') {
    if (Array.isArray(item)) {
      return `Array(${item.length})`
    } else {
      return `Object ${Object.keys(item).length > 0 ? '{…}' : '{}'}`
    }
  }
  return String(item)
}

/**
 * ## JsonNode
 *
 * This component is used to display arbitrary JSON in the browser.
 */
export const JsonNode = ({
  data,
  keyName = null,
  level = 0,
}: JsonNodeProps) => {
  const previewLength = getPreviewLength(data)
  const [isCollapsed, setIsCollapsed] = useState(previewLength > 80)
  const uniqueKey = useId()

  const isObject =
    typeof data === 'object' && data !== null && !Array.isArray(data)
  const isArray = Array.isArray(data)
  const isPrimitive = !isObject && !isArray

  const getValueColor = (val: unknown) => {
    if (val === null) return 'text-zinc-500'
    if (typeof val === 'string') return 'text-green-400'
    if (typeof val === 'number') return 'text-indigo-400'
    if (typeof val === 'boolean') return 'text-yellow-400'
    return 'text-zinc-400'
  }

  const formatValue = (val: unknown) => {
    if (val === null) return 'null'
    if (typeof val === 'string') return `"${val}"`
    return String(val)
  }

  if (isPrimitive || data === null) {
    return (
      <div className="font-mono text-sm">
        {keyName !== null && <span className="text-zinc-400">{keyName}: </span>}
        <span className={getValueColor(data)}>{formatValue(data)}</span>
      </div>
    )
  }

  const entries = isArray
    ? data.map((item, i) => [i, item])
    : Object.entries(data)
  const bracket = isArray ? ['[', ']'] : ['{', '}']

  const preview = useMemo(() => {
    const previewLength = getPreviewLength(data)

    if (previewLength <= 80 && isArray) {
      const lastIndex = data.length - 1
      return (
        <span>
          [
          {data.map((item, i) => (
            <React.Fragment key={`array-preview-${uniqueKey}-${i}`}>
              <span className={getValueColor(item)}>
                {getItemOrPreview(item)}
              </span>
              {i !== lastIndex && <span>, </span>}
            </React.Fragment>
          ))}
          ]
        </span>
      )
    }

    if (previewLength <= 80 && !isArray) {
      const entries = Object.entries(data)
      const lastIndex = entries.length - 1
      return (
        <span>
          {'{'}
          {entries.map(([keyName, value], i) => (
            <React.Fragment key={`object-preview-${uniqueKey}-${i}`}>
              <span className="text-zinc-400">{keyName}</span>
              <span>: </span>
              <span className={getValueColor(value)}>
                {getItemOrPreview(value)}
              </span>
              {i !== lastIndex && <span>, </span>}
            </React.Fragment>
          ))}
          {'}'}
        </span>
      )
    }

    return isArray
      ? `Array(${data.length})`
      : `Object ${Object.keys(data).length > 0 ? '{…}' : '{}'}`
  }, [isArray, data, uniqueKey])

  return (
    <div className="font-mono py-1 text-xs leading-4">
      <div className="flex items-start">
        <div className="flex-1 flex items-start">
          {keyName !== null &&
            (typeof keyName === 'number' ? (
              <span className="text-zinc-500">{keyName}: </span>
            ) : (
              <span className="text-zinc-400">{keyName}: </span>
            ))}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mr-1 text-zinc-600 hover:text-zinc-800 focus:outline-none w-4 flex-shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
          {isCollapsed ? (
            <span
              className="text-zinc-600 cursor-pointer"
              onClick={() => setIsCollapsed(false)}
            >
              {preview}
            </span>
          ) : (
            <div>
              <span className="text-zinc-700">{bracket[0]}</span>
              <div className="ml-5">
                {entries.map(([key, value], i) => (
                  <JsonNode
                    key={`${uniqueKey}-${key}-${i}`}
                    keyName={key}
                    data={value}
                    level={level + 1}
                  />
                ))}
              </div>
              <span className="text-zinc-700">{bracket[1]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
