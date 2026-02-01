# Changelog

[**한국어 버전**](./CHANGELOG-KO.md) | Korean

## [2.1.2] - 2026-02-02

### 🖱️ Zoom Controls Improvements

**Command-Based Zoom (Ctrl/Cmd + Wheel)**
- Changed from always-on wheel zoom to Ctrl/Cmd + wheel for zooming
- This change was made to prevent interference with document scrolling
- Mouse wheel now allows normal document scrolling without blocking
- Users can still zoom using Ctrl/Cmd + wheel when needed

**Simplified Pan & Zoom**
- Removed touchpad pan feature (two-finger panning)
- Removed lock button and related settings
- Pan & zoom controls simplified for better user experience

**Always-On Features**
- Drag to pan: Always works for smooth diagram navigation
- Double-click zoom: Always works for quick zoom to configured level
- Zoom control buttons (+ / - / reset): Always available in bottom-right corner

### 📝 Breaking Changes

- Zoom now requires Ctrl/Cmd (Windows/Linux) or Cmd (macOS) + wheel
- Removed settings: "Pan & Zoom Locked by Default" and "Enable Touchpad Pan"
- Removed lock button from diagram controls

---

## [2.1.1] - 2026-02-01

### 🐛 Bug Fixes

- Fixed memory leaks in event listeners and resource management
- Properly cleaned up event listeners on plugin unload
- Enhanced cleanup of plugin resources to prevent memory leaks

### 📚 Documentation

- Added Korean README (README-KO.md)
- Added language switch between English and Korean versions
- Added pan & zoom demo GIF showing mouse wheel zoom, drag to pan, and double-click zoom toggle
- Improved README structure with "Why This Plugin" section at the top
- Added clear explanations with images showing latest Mermaid version benefits

---

## [2.1.0] - 2026-02-01

### 🎯 Code Refactoring

**Major Codebase Restructuring**
- Modularized `main.ts` into separate modules for better maintainability
  - `services/mermaid-loader.ts`: Mermaid loading and version management
  - `services/settings-manager.ts`: Plugin settings management
  - `ui/pan-zoom-handler.ts`: Pan and zoom interaction logic
  - `ui/mermaid-renderer.ts`: Mermaid diagram rendering
  - `ui/controls/button-helper.ts`: UI button helper functions
  - `types/index.ts`: TypeScript type definitions
- **Reduced `main.ts` from 748 to 167 lines** (581 line reduction - 78% decrease)
- Improved code organization and separation of concerns
- Fixed import path issues across all modules
- Added comprehensive refactoring guidelines (`REFACTORING_GUIDE.md`)

**MermaidRenderer Refactoring**
- Refactored `addCopyButton` function (115 lines) into 9 smaller functions
- Improved code predictability: ⭐ → ⭐⭐⭐⭐
- Maximum function length reduced from 115 to 41 lines (64% decrease)
- All functions now have ⭐⭐⭐⭐ predictability rating
- Enhanced bug traceability and maintainability

### 🖱️ Zoom Improvements

**Mouse-Centered Zoom**
- **Wheel zoom**: Now centers on mouse cursor position
- **Double-click zoom**: Now centers on mouse cursor position
- Zoom calculations use SVG element position instead of wrapper
- Improved accuracy and user experience

**Zoom Speed & Smoothness**
- Increased wheel zoom speed from 0.03 to 0.05 (67% faster)
- Applied smooth transition animation only to double-click zoom
- Removed transition during pan/wheel for instant response
- Conditional transition: `transition: 'transform 0.2s ease-out'` (double-click only)

### 🎨 UI Improvements

**Center Alignment**
- Fixed center alignment for pan-zoom mode
- Applied `textAlign: 'center'` to wrapper
- SVG element: `display: block` + `margin: 0 auto`
- Consistent alignment between pan-zoom and non-pan-zoom modes

**UI Controls**
- Improved zoom controls button styling
- Enhanced copy button hover effects
- Better visual feedback for copy operations

### 🔧 Technical Changes

- Unified `transform-origin: '0 0'` for consistent behavior
- Improved pan/zoom handler with conditional transition support
- Fixed SVG element positioning calculations
- Enhanced error handling and user feedback

### 📝 Documentation

- Added `REFACTORING_GUIDE.md` with code refactoring standards
- Documented predictability rating system (⭐ to ⭐⭐⭐⭐⭐)
- Provided anti-patterns and best practices

### 🐛 Bug Fixes

- Fixed center alignment issue in pan-zoom mode
- Fixed mouse position calculation for zoom operations
- Removed stuttering during pan/drag operations

### 📦 Installation

Download `main.js`, `manifest.json`, and `styles.css` files and place them in your Obsidian vault's plugins folder.

---

## [2.0.0] - 2026-02-01

### 🚀 Dynamic Loading with Auto-Update

- Load Mermaid library dynamically from CDN
- Cache Mermaid library in localStorage for faster loading
- Auto-update to latest Mermaid version in background
- Isolate plugin Mermaid instance to avoid global side effects
- Custom settings UI with version display

### 🎨 UI Enhancements

- Pan & zoom functionality for diagrams
- Mouse wheel zoom and drag-to-pan support
- Double-click to zoom
- Zoom control buttons (+ / / reset)
- Copy diagram as image
- Transparent background option

### 🔧 Settings

- Enable/disable Pan & Zoom
- Double-click zoom level (1.5x - 5x)
- Transparent background for "mer" code blocks
- Include background in copy
- Clear cache option

---

## [1.1.2] - 2026-02-01

### 🐛 Bug Fixes

- Fixed SVG size issues when pan/zoom is enabled
- Improved zoom behavior with smoother transitions
- Better handling of large diagrams

---

## [1.1.1] - 2026-02-01

### 📚 Documentation

- Added demo images and improved README
- Added transparent background example
- Documented width parameter usage

---

## [1.1.0] - 2026-02-01

### ✨ New Features

- Added Mermaid version comparison table
- Added width parameter for diagram sizing
- Improved error messages

---

## [1.0.0] - 2026-01-31

### 🎉 Initial Release

- Basic Mermaid diagram rendering
- "mer", "merlight", "merdark" code blocks
- Dynamic Mermaid loading
- Basic settings UI
