# Modern Mermaid Plugin - Dynamic Loading & Auto-Update Plan

## Overview

Implement dynamic Mermaid loading from CDN with automatic update checking and caching system.

## Requirements

- No settings tab required
- Obsidian notifications for updates
- Auto-update to latest version when available
- Cache only the latest version
- Always use latest Mermaid version

## Architecture

### Current Structure
```
main.js (5.9MB) with Mermaid v11.12.2 bundled
```

### New Structure
```
main.js (small bundle) + CDN dynamic loading
- Online: Load Mermaid from CDN
- Offline: Use cached version
- Fallback: Built-in bundle
```

## Implementation Plan

### Phase 1: Caching System

**localStorage Keys:**
- `modern-mermaid-cached-version`: Store latest version number
- `modern-mermaid-cached-code`: Store Mermaid JavaScript code

**Cache Functions:**
- `saveCache(version: string, code: string)`: Save version and code
- `loadCache()`: Return { version, code } or null
- `clearCache()`: Clear all cached data

**Cache Strategy:**
- Keep only latest version (single cache)
- Max cache size: ~10MB (one version)
- Auto-replace with new version

### Phase 2: Dynamic Loading System

**CDN URL Format:**
```
https://cdn.jsdelivr.net/npm/mermaid@{version}/dist/mermaid.min.js
```

**Loading Process:**
1. Fetch Mermaid code from CDN
2. Inject script tag with code
3. Wait for load completion
4. Initialize Mermaid
5. Update cache

**Script Injection Method:**
```typescript
function loadMermaidFromCode(code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.textContent = code;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Mermaid'));
    document.head.appendChild(script);
  });
}
```

### Phase 3: Version Check System

**npm API Endpoint:**
```
https://registry.npmjs.org/mermaid/latest
Response: { "version": "12.3.4" }
```

**Check Process:**
1. Call npm API
2. Get latest version
3. Compare with cached version
4. If newer, trigger update
5. If same, use cache

**Version Comparison:**
```typescript
function isNewerVersion(latest: string, current: string): boolean {
  // Semantic version comparison
  // Return true if latest > current
}
```

### Phase 4: Notification System

**Update Success Notification:**
```
Mermaid v12.3.4 업데이트 완료!
```

**Update Failure Notification:**
```
Mermaid 업데이트 실패, 이전 버전 유지됨
```

**Offline Notification:**
```
오프라인 모드: 캐시된 버전 사용
```

### Phase 5: Error Handling

**Fallback Strategy:**
1. CDN load failed → Use cached version
2. Cache not available → Use built-in bundle
3. All failed → Show error message

**Error Scenarios:**
- Network error (offline)
- CDN unavailable
- Invalid Mermaid code
- Version mismatch

## User Experience Flow

### On Obsidian Startup

```
ModernMermaidPlugin.onload()
  ↓
checkForUpdates()
  ↓
[Async] npm API call
  ↓
Latest version received
  ↓
Compare with cached version
  ↓
Newer? 
  ├─ YES → loadLatestFromCDN()
  │         ↓
  │       Success?
  │         ├─ YES → Update cache + Show notification
  │         └─ NO  → Use cache + Show error notification
  │
  └─ NO  → Use cache
  ↓
Initialize Mermaid
  ↓
Ready to render
```

### On Code Block Rendering

```
User writes ```mer
  ↓
renderMermaid() called
  ↓
Check if Mermaid loaded
  ├─ YES → Render diagram
  └─ NO  → Wait for load + Show loading state
  ↓
Display rendered diagram
```

## Implementation Steps

### Step 1: Cache System
- [ ] Create cache functions
- [ ] Implement save/load logic
- [ ] Test cache persistence

### Step 2: Dynamic Loading
- [ ] Implement CDN fetch
- [ ] Create script injection
- [ ] Handle load events
- [ ] Test with different versions

### Step 3: Version Checking
- [ ] Implement npm API call
- [ ] Create version comparison
- [ ] Add update trigger logic
- [ ] Test version detection

### Step 4: Notifications
- [ ] Add success notifications
- [ ] Add error notifications
- [ ] Add offline notifications
- [ ] Test notification display

### Step 5: Error Handling
- [ ] Implement offline detection
- [ ] Add fallback to cache
- [ ] Add fallback to built-in bundle
- [ ] Test error scenarios

### Step 6: Integration
- [ ] Integrate all components
- [ ] Test full flow
- [ ] Optimize performance
- [ ] Clean up code

## Technical Considerations

### Bundle Size
- Current: 5.9MB
- Target: ~100KB (without Mermaid)
- Savings: ~5.8MB

### Loading Performance
- Cold cache: ~1-2s (CDN fetch)
- Warm cache: ~100ms (localStorage)
- Fallback: Immediate (built-in)

### Browser Compatibility
- localStorage: All modern browsers
- fetch API: All modern browsers
- Script injection: All modern browsers

### Security
- CDN: jsdelivr (reliable, fast)
- HTTPS only
- Code validation before execution

## Testing Plan

### Unit Tests
- Cache functions
- Version comparison
- API calls

### Integration Tests
- Full update flow
- Rendering with new version
- Error handling

### Manual Tests
- Online mode
- Offline mode
- CDN unavailable
- Version update scenarios

## Future Enhancements

- [ ] Settings tab (when users request)
- [ ] Version selection (when users request)
- [ ] Beta version support
- [ ] Custom CDN selection
- [ ] Update frequency control
- [ ] Update history display
