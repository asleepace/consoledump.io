# Local Storage Hooks

Comprehensive hooks for persisting settings, messages, and metadata to browser local storage.

## Files

- `useLocalStorage.ts` - Core local storage operations
- `useAutoSave.ts` - Automatic saving and restoration

## Quick Start

### 1. Basic Usage in AppContext

```tsx
import { useAutoSave, useRestoreState } from '@/hooks/useAutoSave'

export function AppContextProvider(
  props: PropsWithChildren<{ initialUrl: URL }>
) {
  const app = useSettings()
  const stream = useEventStream()
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Auto-save when "Save Locally" is enabled
  useAutoSave({
    settings: app.settings,
    stream,
    expandedLogs,
    enabled: app.settings.saveLocally,
  })

  // Restore state on mount
  const { restoreAll } = useRestoreState()

  useEffect(() => {
    const restored = restoreAll()
    if (restored.settings) {
      app.loadSettings(restored.settings)
    }
    if (restored.sessionState) {
      setExpandedLogs(new Set(restored.sessionState.expandedLogs))
    }
  }, [])

  // ...rest of provider
}
```

### 2. Manual Storage Operations

```tsx
import { useLocalStorage } from '@/hooks/useLocalStorage'

function MyComponent() {
  const storage = useLocalStorage()

  // Save settings
  const handleSave = () => {
    storage.saveSettings({
      showTimestamp: true,
      autoScroll: false,
    })
  }

  // Load settings
  const handleLoad = () => {
    const settings = storage.loadSettings()
    console.log('Loaded:', settings)
  }

  // Get storage info
  const handleCheckStorage = () => {
    const info = storage.getStorageInfo()
    console.log(
      `Using ${info.used} bytes of ${info.total} (${info.percentage.toFixed(
        1
      )}%)`
    )
  }

  // Export all data
  const handleExport = () => {
    const data = storage.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consoledump-backup-${Date.now()}.json`
    a.click()
  }

  // Clear everything
  const handleClear = () => {
    if (confirm('Clear all saved data?')) {
      storage.clearAll()
    }
  }

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleLoad}>Load</button>
      <button onClick={handleCheckStorage}>Check Storage</button>
      <button onClick={handleExport}>Export Data</button>
      <button onClick={handleClear}>Clear All</button>
    </div>
  )
}
```

## API Reference

### `useLocalStorage()`

Core hook for all local storage operations.

#### Settings

- **`saveSettings(settings)`** - Save settings object
- **`loadSettings()`** - Load settings (returns `null` if none exist)

#### Messages

- **`saveMessages(messages, debounce?)`** - Save messages with optional debouncing (1s)
- **`loadMessages()`** - Load all messages
- **`clearMessages()`** - Remove messages and metadata only
- **`clearOldMessages()`** - Remove messages older than 7 days or keep only last 1000

#### Metadata

- **`saveMetadata(meta, messageCount)`** - Save session metadata
- **`loadMetadata()`** - Load session metadata

#### Session State

- **`saveSessionState(sessionId, expandedLogs)`** - Save UI state
- **`loadSessionState()`** - Load UI state

#### Utilities

- **`clearAll()`** - Remove all stored data
- **`getStorageInfo()`** - Get storage usage statistics
  ```ts
  {
    used: number,        // bytes used
    total: number,       // estimated total available
    percentage: number,  // percentage used
    breakdown: {         // breakdown by category
      SETTINGS: number,
      MESSAGES: number,
      METADATA: number,
      SESSION_STATE: number
    }
  }
  ```
- **`exportData()`** - Export all data as JSON object
- **`importData(data)`** - Import data from JSON object

### `useAutoSave({ settings, stream, expandedLogs, enabled })`

Automatically saves data when it changes (only when `settings.saveLocally` is true).

**Features:**

- Debounced message saving (1 second delay)
- Automatic cleanup when storage is >80% full
- Only saves when settings actually change
- Saves session state on expandedLogs changes

**Returns:** `useLocalStorage()` hook instance

### `useRestoreState()`

Provides functions to restore saved state.

#### Methods

- **`restoreSettings()`** - Restore settings
- **`restoreMessages()`** - Restore messages
- **`restoreMetadata()`** - Restore metadata
- **`restoreSessionState()`** - Restore session state
- **`restoreAll()`** - Restore everything at once
- **`storage`** - Access to `useLocalStorage()` instance

## Data Structures

### StoredMessage

```ts
{
  id: string,
  data: string,
  timestamp: number,
  type?: 'message' | 'system'
}
```

### StoredMetadata

```ts
{
  clientId: string,
  streamId: string,
  createdAt: Date,
  updatedAt: Date,
  clients: number,
  lastSaved: number,
  messageCount: number
}
```

### SessionState

```ts
{
  sessionId: string,
  expandedLogs: string[],
  lastActive: number
}
```

## Storage Keys

All data is namespaced with `consoledump:` prefix:

- `consoledump:settings` - User settings
- `consoledump:messages` - Message history
- `consoledump:metadata` - Session metadata
- `consoledump:session-state` - UI state (expanded logs, etc.)

## Storage Management

### Automatic Cleanup

- Messages older than 7 days are automatically removed on mount
- Only last 1000 messages are kept when cleaning up
- Inactive sessions (>7 days) are cleared on mount

### Quota Management

- Warning logged when storage exceeds 80%
- Graceful handling of quota exceeded errors
- Manual cleanup functions provided

### Best Practices

1. **Enable saving selectively** - Only save when user opts in (`saveLocally` setting)
2. **Export regularly** - Users should export important data
3. **Clear old data** - Use `clearOldMessages()` periodically
4. **Monitor usage** - Use `getStorageInfo()` to track storage usage
5. **Test quota errors** - Test behavior when storage is full

## Example: Adding Export/Import UI

```tsx
function StorageManager() {
  const storage = useLocalStorage()
  const [info, setInfo] = useState(storage.getStorageInfo())

  const handleExport = () => {
    const data = storage.exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consoledump-${Date.now()}.json`
    a.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        storage.importData(data)
        alert('Data imported successfully!')
      } catch (error) {
        alert('Failed to import data: ' + error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Storage Usage</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Used:</span>
            <span>{(info.used / 1024).toFixed(2)} KB</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2">
            <div
              className="bg-orange-400 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(info.percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400">
            {info.percentage.toFixed(1)}% of estimated storage
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleExport} className="btn-primary">
          Export Data
        </button>
        <label className="btn-secondary cursor-pointer">
          Import Data
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
        <button onClick={() => storage.clearAll()} className="btn-danger">
          Clear All
        </button>
      </div>
    </div>
  )
}
```

## Troubleshooting

### Storage not persisting

- Check if `saveLocally` setting is enabled
- Verify browser supports localStorage
- Check browser console for errors
- Verify not in incognito/private mode

### Quota exceeded errors

- Run `storage.clearOldMessages()`
- Export and clear old data
- Reduce frequency of saves
- Check storage info with `getStorageInfo()`

### Data not restoring

- Verify data exists with `loadSettings()`
- Check browser console for parse errors
- Ensure calling restore functions on mount
- Verify storage keys haven't changed

## Performance Considerations

- Message saving is debounced (1 second)
- Settings save immediately on change
- Cleanup runs only on mount
- Export/import are synchronous operations
