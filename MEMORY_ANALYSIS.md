# Memory Management Analysis Report

**Date**: 2026-02-01  
**Plugin**: Modern Mermaid Plugin  
**Analysis Scope**: Memory leaks, event listeners, lifecycle management

---

## Executive Summary

After analyzing the codebase, **12 memory management issues** were identified across the codebase:

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 1 | Global event listener leak |
| 🟠 High | 4 | Window listeners, setTimeout, mermaid script, unload cleanup |
| 🟡 Medium | 4 | Image cleanup, copy buttons, button helper, abort controller |
| 🟢 Low | 3 | WeakMap (good), RAF (good), SettingsTab (handled by Obsidian) |

The most significant issues are:
1. Global event listeners that are never removed
2. Window-level event listeners that may leak if handlers are destroyed during panning
3. Timer/timeout references that are not tracked for cancellation
4. Mermaid library lifecycle management

---

## Detailed Findings

### 1. 🔴 CRITICAL: Global Event Listener Leak

**File**: `main.ts`  
**Lines**: 10, 23-29, 88-93

**Before**:
```typescript
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (event.reason as Error).message && (event.reason as Error).message.includes('mermaid')) {
        console.error('Unhandled Mermaid error prevented:', event.reason);
        event.preventDefault();
    }
});
```

**After**:
```typescript
private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

this.unhandledRejectionHandler = (event) => {
    if (event.reason && (event.reason as Error).message && (event.reason as Error).message.includes('mermaid')) {
        console.error('Unhandled Mermaid error prevented:', event.reason);
        event.preventDefault();
    }
};
window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);

onunload() {
    if (this.unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
        this.unhandledRejectionHandler = null;
    }
    this.clearCache();
}
```

**Root Cause**:
- A global event listener is added to `window` during plugin initialization
- The listener is **never removed** in `onunload()` or at any other lifecycle hook
- The anonymous function cannot be removed since the reference is not stored

**Impact**:
- The plugin remains active in memory even after unload
- The anonymous event handler captures references to the plugin context
- Memory is not released until the entire window/page is reloaded
- Multiple reloads could accumulate stale listeners

**Fix Applied**: ✅ **Fixed** (2026-02-01)
- Added `private unhandledRejectionHandler` field to store handler reference
- Changed to use named function instead of anonymous function
- Added cleanup in `onunload()` to remove the event listener
- Set reference to null after cleanup to release memory

---

### 2. 🟠 HIGH: Window Event Listener Leak in PanZoomHandler

**File**: `ui/pan-zoom-handler.ts`  
**Lines**: 25, 42-46, 52, 55, 60

**Before**:
```typescript
export class PanZoomHandler {
    private state: PanZoomState = {
        // ...
        panning: false,
        // ...
    };

    destroy(): void {
        this.wrapper.removeEventListener('mousedown', this.handleMouseDown);
        this.wrapper.removeEventListener('wheel', this.handleWheel);
        this.wrapper.removeEventListener('dblclick', this.handleDoubleClick);
    }

    private handleMouseDown = (e: MouseEvent) => {
        // ...
        this.state.panning = true;
        window.addEventListener('mousemove', this.handleWindowMouseMove);
        window.addEventListener('mouseup', this.handleWindowMouseUp);
    };

    private handleWindowMouseUp = () => {
        this.state.panning = false;
        window.removeEventListener('mousemove', this.handleWindowMouseMove);
        window.removeEventListener('mouseup', this.handleWindowMouseUp);
    };
}
```

**After**:
```typescript
export class PanZoomHandler {
    private state: PanZoomState = {
        // ...
        panning: false,
        // ...
    };
    private isPanningActive: boolean = false;

    destroy(): void {
        if (this.isPanningActive) {
            window.removeEventListener('mousemove', this.handleWindowMouseMove);
            window.removeEventListener('mouseup', this.handleWindowMouseUp);
        }
        this.wrapper.removeEventListener('mousedown', this.handleMouseDown);
        this.wrapper.removeEventListener('wheel', this.handleWheel);
        this.wrapper.removeEventListener('dblclick', this.handleDoubleClick);
    }

    private handleMouseDown = (e: MouseEvent) => {
        // ...
        this.state.panning = true;
        this.isPanningActive = true;
        window.addEventListener('mousemove', this.handleWindowMouseMove);
        window.addEventListener('mouseup', this.handleWindowMouseUp);
    };

    private handleWindowMouseUp = () => {
        this.state.panning = false;
        this.isPanningActive = false;
        window.removeEventListener('mousemove', this.handleWindowMouseMove);
        window.removeEventListener('mouseup', this.handleWindowMouseUp);
    };
}
```

**Root Cause**:
- Window event listeners are added when panning starts (`mousedown`)
- They are removed only in the normal flow when `mouseup` fires
- If `destroy()` is called while panning is active, the window listeners are **never removed**
- The `destroy()` method only removes wrapper-level listeners, not window-level ones

**Impact**:
- Window listeners leak if PanZoomHandler is destroyed mid-pan
- Could happen if the diagram is rapidly re-rendered or the user navigates away
- The handlers reference `this` (PanZoomHandler instance), preventing garbage collection
- Multiple leaked listeners can accumulate over time

**Fix Applied**: ✅ **Fixed** (2026-02-01)
- Added `isPanningActive` private field to track panning state
- Set `isPanningActive` to `true` in `handleMouseDown`
- Set `isPanningActive` to `false` in `handleWindowMouseUp`
- Modified `destroy()` to check `isPanningActive` and clean up window listeners if needed

---

### 3. 🟠 HIGH: Untracked setTimeout References

**File**: `ui/mermaid-renderer.ts`  
**Lines**: 10, 229-236, 284-289

**Before**:
```typescript
export class MermaidRenderer {
    private static panZoomHandlers = new WeakMap<HTMLElement, PanZoomHandler>();

    private showCopyFeedback(button: HTMLButtonElement, icon: string, color: string, timeout: number): void {
        button.innerHTML = icon;
        button.style.color = color;
        setTimeout(() => {
            button.innerHTML = COPY_ICON;
            button.style.color = 'currentColor';
        }, timeout);
    }
}
```

**After**:
```typescript
export class MermaidRenderer {
    private static panZoomHandlers = new WeakMap<HTMLElement, PanZoomHandler>();
    private timeoutIds = new Set<number>();

    private showCopyFeedback(button: HTMLButtonElement, icon: string, color: string, timeout: number): void {
        button.innerHTML = icon;
        button.style.color = color;
        const timeoutId = window.setTimeout(() => {
            button.innerHTML = COPY_ICON;
            button.style.color = 'currentColor';
            this.timeoutIds.delete(timeoutId);
        }, timeout);
        this.timeoutIds.add(timeoutId);
    }

    cleanup(): void {
        for (const timeoutId of this.timeoutIds) {
            clearTimeout(timeoutId);
        }
        this.timeoutIds.clear();
    }
}
```

**Root Cause**:
- `setTimeout` is called in `showCopyFeedback` but the timeout ID is **not stored**
- Each click creates a new timeout that cannot be cancelled
- If the element is re-rendered before the timeout fires, the callback will still execute
- The callback references the DOM element, preventing proper garbage collection

**Impact**:
- Stale DOM references held by timeout callbacks
- Potential errors when trying to manipulate removed DOM elements
- Memory is not released until all pending timeouts complete
- Rapid clicking can create multiple pending timeouts

**Fix Applied**: ✅ **Fixed** (2026-02-01)
- Added `timeoutIds` Set to track all active timeout IDs
- Store timeout ID in Set when timeout is created
- Remove timeout ID from Set in callback when timeout fires
- Added `cleanup()` method to clear all pending timeouts

---

### 4. 🟠 HIGH: Mermaid Script Not Cleaned Up

**File**: `services/mermaid-loader.ts`  
**Lines**: 167-224, 227-234, 91-94

**Before**:
```typescript
async loadMermaidFromCode(code: string, version: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const script = document.createElement('script');
        script.src = url;
        script.id = 'mermaid-dynamic-script';
        
        // ... setup timeout and event handlers ...
        
        document.head.appendChild(script);
    });
}
```

**After**:
```typescript
async loadMermaidFromCode(code: string, version: string): Promise<void> {
    console.log(`Loading Mermaid ${version} into DOM...`);
    this.cleanupExistingScript();
    
    return new Promise((resolve, reject) => {
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const script = document.createElement('script');
        script.src = url;
        script.id = 'mermaid-dynamic-script';
        
        // ... setup timeout and event handlers ...
        
        document.head.appendChild(script);
    });
}

private cleanupExistingScript(): void {
    const existingScript = document.getElementById('mermaid-dynamic-script');
    if (existingScript) {
        existingScript.remove();
    }
    
    delete (window as any).mermaid;
    this.pluginMermaidInstance = null;
}

cleanup(): void {
    this.cleanupExistingScript();
}
```

**main.ts onunload()**:
```typescript
onunload() {
    if (this.unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
        this.unhandledRejectionHandler = null;
    }
    this.mermaidLoader.cleanup();
    this.clearCache();
}
```

**Root Cause**:
- The script element is added to `document.head` with a specific ID
- The script and its global `window.mermaid` object are **never cleaned up**
- When the plugin unloads or loads a new version, the old script remains in the DOM
- The script's execution context and loaded modules stay in memory

**Impact**:
- Old mermaid versions persist in memory after updates
- Global namespace pollution (window.mermaid)
- Conflicts can occur if multiple versions are loaded
- Memory not released until full page reload

**Fix Applied**: ✅ **Fixed** (2026-02-01)
- Added `cleanupExistingScript()` method to remove existing script element
- Deleted global `window.mermaid` object
- Set `pluginMermaidInstance` to null
- Added `cleanup()` method for plugin unload
- Call `cleanupExistingScript()` at start of `loadMermaidFromCode()` to clean up old versions
- Call `mermaidLoader.cleanup()` in main.ts `onunload()`

---

### 5. 🟠 HIGH: Missing PanZoomHandler Cleanup on Plugin Unload

**File**: `main.ts`  
**Lines**: 85-87

```typescript
onunload() {
    this.clearCache();
}
```

**Root Cause**:
- The `onunload()` hook only clears the mermaid cache
- No cleanup of active `PanZoomHandler` instances
- The WeakMap in `MermaidRenderer` will eventually clean up, but handlers are not explicitly destroyed
- Any active event listeners on window elements are not cleaned up

**Impact**:
- Active pan/zoom handlers remain until their wrapper elements are GC'd
- Window event listeners may leak if handlers are destroyed mid-pan (see issue #2)
- No guarantee of immediate cleanup on plugin unload

**Status**: ❌ **Not Fixed**

---

### 6. 🟡 MEDIUM: Image.onload Not Cleaned Up on Error

**File**: `ui/mermaid-renderer.ts`  
**Lines**: 172-212

```typescript
private renderSvgToCanvas(url: string, svgElement: SVGSVGElement, backgroundColor: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const img = new Image();

        img.onload = () => {
            try {
                // ... canvas operations ...
            } catch (drawErr) {
                reject(drawErr);
            }
        };

        img.onerror = () => {
            reject(new Error('Image load failed'));
        };

        img.src = url;
    });
}
```

**Root Cause**:
- If an error occurs during `img.onload`, the image and canvas elements are not explicitly cleaned up
- `img.src` is set to a data URL that holds SVG content
- Large SVGs could consume significant memory if not released

**Impact**:
- Large data URLs held in memory even after error
- Canvas elements not released
- Memory eventually freed by GC, but could be delayed for large diagrams

**Status**: ❌ **Not Fixed**

---

### 7. 🟡 MEDIUM: AbortController Timeout Not Guaranteed

**File**: `services/mermaid-loader.ts`  
**Lines**: 78-95, 145-164

```typescript
async getLatestVersion(): Promise<string> {
    console.log('Fetching latest Mermaid version...');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
        const response = await fetch('https://registry.npmjs.org/mermaid/latest', { 
            signal: controller.signal 
        });
        clearTimeout(timeout);
        const data = await response.json();
        console.log('Latest version:', data.version);
        return data.version;
    } catch (error) {
        clearTimeout(timeout);
        console.error('Failed to fetch latest version:', error);
        throw error;
    }
}
```

**Root Cause**:
- The timeout is correctly cleared in the `try/catch` block
- However, if the promise is cancelled (e.g., during plugin unload), the timeout may not be cleared
- `AbortController.abort()` is synchronous but the timeout callback is asynchronous

**Impact**:
- Minor: Unlikely to cause actual issues, but the pattern could be improved
- Could result in warnings if timeout fires after promise resolution

**Status**: ❌ **Not Fixed**

---

### 8. 🟡 MEDIUM: No Cleanup for Copy Button Event Listeners

**File**: `ui/mermaid-renderer.ts`  
**Lines**: 268-287

```typescript
private setupCopyButtonEvents(button: HTMLButtonElement, el: HTMLElement, backgroundColor: string): void {
    button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
        button.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
        button.style.opacity = '0.7';
    });

    button.addEventListener('click', async () => {
        await this.handleCopyClick(el, button, backgroundColor);
    });
}
```

**Root Cause**:
- Event listeners are added to buttons every time a diagram is rendered
- Old buttons are removed via `el.innerHTML = ''` (line 51)
- Modern browsers typically clean up event listeners when DOM nodes are removed
- However, explicit cleanup is not performed, which is not guaranteed in all browsers
- The async click handler could potentially be called after the element is removed

**Impact**:
- Most modern browsers handle this correctly
- Potential edge cases where listeners are not immediately GC'd
- Async operations (copy) could try to access removed DOM elements
- Race conditions possible with rapid re-renders

**Status**: ❌ **Not Fixed**

---

### 9. 🟡 MEDIUM: Button Helper Event Listeners Never Explicitly Cleaned Up

**File**: `ui/controls/button-helper.ts`  
**Lines**: 26-51

```typescript
export function createControlButton(
    container: HTMLElement,
    options: ButtonOptions
): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.innerHTML = options.icon;
    
    Object.assign(btn.style, BUTTON_STYLES.button);
    btn.addEventListener('mouseenter', () => {
        Object.assign(btn.style, BUTTON_STYLES.hover);
    });
    
    btn.addEventListener('mouseleave', () => {
        Object.assign(btn.style, BUTTON_STYLES.button);
    });
    
    btn.addEventListener('click', () => {
        if (options.onClickLabel) {
            console.log(options.onClickLabel);
        }
        options.onClick();
    });
    
    container.appendChild(btn);
    return btn;
}
```

**Root Cause**:
- Buttons are created with event listeners but no cleanup mechanism
- Function returns the button, but there's no way to remove listeners later
- Relies on DOM element removal to clean up listeners
- The `onClick` callback could create closure references

**Impact**:
- Listeners cleaned up when button is GC'd (usually works fine)
- No explicit cleanup API for better memory management
- Could be problematic if buttons are created/destroyed frequently

**Status**: ❌ **Not Fixed**

---

### 10. 🟢 LOW: WeakMap Usage is Correct

**File**: `ui/mermaid-renderer.ts`  
**Line**: 10

```typescript
private static panZoomHandlers = new WeakMap<HTMLElement, PanZoomHandler>();
```

**Analysis**:
- WeakMap is correctly used for DOM element mapping
- This is actually a **good pattern** - WeakMap automatically cleans up when elements are GC'd
- No action needed

**Status**: ✅ **Good Pattern**

---

### 11. 🟢 LOW: No RequestAnimationFrame Usage

**Analysis**:
- No requestAnimationFrame usage found in the codebase
- All animations use CSS transitions or are event-driven
- This is actually good - RAF would require cleanup management

**Status**: ✅ **Good Pattern**

---

### 12. 🟢 LOW: Missing Explicit Cleanup for SettingsTab

**File**: `main.ts`  
**Lines**: 90-166

```typescript
class ModernMermaidSettingTab extends PluginSettingTab {
    plugin: ModernMermaidPlugin;

    constructor(app: App, plugin: ModernMermaidPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
}
```

**Root Cause**:
- `PluginSettingTab` is registered in the plugin but not explicitly cleaned up
- Obsidian should handle this, but it's worth noting
- The `this.plugin` reference is stored in the settings tab instance

**Impact**:
- Minimal - Obsidian's PluginSettingTab lifecycle should handle cleanup
- The settings tab instance will be GC'd when the plugin is unloaded

**Status**: ✅ **Handled by Obsidian**

---

## Summary Table

| ID | File | Lines | Severity | Issue | Status |
|----|------|-------|----------|-------|--------|
| 1 | main.ts | 10, 23-29, 88-93 | 🔴 CRITICAL | Global event listener not removed | ✅ Fixed |
| 2 | pan-zoom-handler.ts | 25, 42-46, 52, 55, 60 | 🟠 HIGH | Window listeners leak if destroyed mid-pan | ✅ Fixed |
| 3 | mermaid-renderer.ts | 10, 229-236, 284-289 | 🟠 HIGH | Untracked setTimeout IDs | ✅ Fixed |
| 4 | mermaid-loader.ts | 169, 227-234, 91-94 | 🟠 HIGH | Mermaid script never cleaned up | ✅ Fixed |
| 5 | main.ts | 85-87 | 🟠 HIGH | Missing PanZoomHandler cleanup on unload | ❌ Not Fixed |
| 6 | mermaid-renderer.ts | 172-212 | 🟡 MEDIUM | Image cleanup on error | ❌ Not Fixed |
| 7 | mermaid-loader.ts | 78-95, 145-164 | 🟡 MEDIUM | AbortController timeout edge case | ❌ Not Fixed |
| 8 | mermaid-renderer.ts | 268-287 | 🟡 MEDIUM | No explicit cleanup for copy button | ❌ Not Fixed |
| 9 | button-helper.ts | 26-51 | 🟡 MEDIUM | No cleanup API for control buttons | ❌ Not Fixed |
| 10 | mermaid-renderer.ts | 10 | 🟢 LOW | ✓ WeakMap used correctly | ✅ Good |
| 11 | N/A | N/A | 🟢 LOW | No RAF usage | ✅ Good |
| 12 | main.ts | 90-166 | 🟢 LOW | SettingsTab cleanup handled by Obsidian | ✅ Good |

---

## Priority Recommendations

### Immediate Fixes (Critical/High Priority):
1. ~~**Fix global event listener leak** (#1) - Store reference and remove in `onunload()`~~ ✅ **COMPLETED**
2. ~~**Fix window event listener leak** (#2) - Track panning state and clean up in `destroy()`~~ ✅ **COMPLETED**
3. ~~**Track setTimeout IDs** (#3) - Store and clear timeouts appropriately~~ ✅ **COMPLETED**
4. ~~**Clean up Mermaid script** (#4) - Add cleanup method and call on unload~~ ✅ **COMPLETED**
4. **Clean up Mermaid script** (#4) - Add cleanup method and call on unload
5. **Add PanZoomHandler cleanup** (#5) - Ensure all handlers are destroyed on unload

### Short-term Improvements (Medium Priority):
6. **Clean up image on error** (#6) - Add explicit cleanup in error handlers
7. **Add copy button cleanup** (#8) - Track and clean up listeners explicitly
8. **Add button helper cleanup API** (#9) - Return cleanup function

### Best Practices (Low Priority):
9. Review and document the cleanup patterns used
10. Consider adding memory leak tests for common scenarios
11. Document lifecycle management patterns for future development

---

## Testing Recommendations

After implementing fixes, test these scenarios:

1. **Plugin Reload**: Load the plugin, render some diagrams, then reload the plugin (without reloading Obsidian)
2. **Rapid Re-rendering**: Continuously trigger re-renders of the same diagram
3. **Pan During Re-render**: Start panning a diagram, then trigger a re-render
4. **Copy Button Spam**: Click the copy button rapidly multiple times
5. **Memory Profiling**: Use browser DevTools memory profiler to verify no leaks
6. **Background Updates**: Trigger background mermaid version updates during active diagram rendering

---

## Changelog

| Date | Issue | Status | Notes |
|------|-------|--------|-------|
| 2026-02-01 | Initial analysis | ✅ Complete | 12 issues identified |
| 2026-02-01 | Issue #1 | ✅ Fixed | Global event listener leak fixed in main.ts |
| 2026-02-01 | Issue #2 | ✅ Fixed | Window event listener leak fixed in pan-zoom-handler.ts |
| 2026-02-01 | Issue #3 | ✅ Fixed | Untracked setTimeout references fixed in mermaid-renderer.ts |
| 2026-02-01 | Issue #4 | ✅ Fixed | Mermaid script cleanup added in mermaid-loader.ts |
