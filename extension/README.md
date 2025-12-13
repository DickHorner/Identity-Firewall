# Identity Firewall Browser Extension

TypeScript/JavaScript browser extension for applying identity spoofing rules to websites.

## Architecture

### Components

- **Background Service Worker** (`src/background.ts`)
  - Loads policy configuration from storage
  - Resolves personae for hostnames using rule matching
  - Handles inter-script messaging
  - Caches persona resolutions

- **Content Script** (`src/content.ts`)
  - Injects spoofing code into page context
  - Spoof Navigator properties (userAgent, language, languages)
  - Spoof Screen properties (width, height, colorDepth, devicePixelRatio)
  - Spoof matchMedia for responsive design queries

- **Popup UI** (`ui/popup.ts`)
  - Shows current site and matched persona
  - Displays available personas and their details
  - Stats showing total personas and rules
  - Settings and reset buttons

- **Shared Types** (`src/types.ts`)
  - TypeScript interfaces for all data structures
  - Message types for cross-script communication

### Communication Flow

```
┌─────────────────┐
│   Popup UI      │
└────────┬────────┘
         │ sendMessage()
         ↓
┌─────────────────────────────────────┐
│  Background Service Worker          │
│  - Policy Resolution                │
│  - Rule Matching                    │
│  - Persona Caching                  │
└────────┬────────────────────────────┘
         │ sendMessage()
         ↓
┌─────────────────────────────────────┐
│  Content Script                     │
│  - Gets resolved persona            │
│  - Injects spoofing code            │
│  - Logs activity                    │
└────────┬────────────────────────────┘
         │ execute in page context
         ↓
┌─────────────────────────────────────┐
│  Page JavaScript (Spoofed APIs)     │
│  - navigator.userAgent              │
│  - screen properties                │
│  - window.matchMedia()              │
└─────────────────────────────────────┘
```

## Building

### Prerequisites

```bash
npm install
```

### Development Build

```bash
npm run dev
```

Builds TypeScript to JavaScript in `dist/` directory with source maps, watching for changes.

### Production Build

```bash
npm run build
```

Creates optimized bundles without source maps.

### Type Checking

```bash
npm run type-check
```

Validates TypeScript without producing output.

## Installation

1. Build the extension: `npm run build`
2. Open `chrome://extensions` in Chrome/Edge
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the extension folder
5. The extension will load the manifest.json and compiled JavaScript

### Firefox (Future)

The extension is designed to be compatible with Firefox by using manifest_version 3 and chrome.* APIs that have Firefox equivalents.

## Features

### Header Rewriting (WIP)

Currently the extension logs intended header rewrites:
- `User-Agent`: Spoofed via Navigator API
- `Accept-Language`: Spoofed via Navigator.language/languages APIs

Full HTTP header interception requires Manifest V3's `declarativeNetRequest` API (Chrome 88+, Firefox TBD).

### DOM Spoofing (Implemented)

The extension successfully spoofs:

- **Navigator API**
  - `navigator.userAgent` - Custom user agent string
  - `navigator.language` - Primary language
  - `navigator.languages` - Supported languages array

- **Screen API**
  - `screen.width / availWidth` - Viewport dimensions
  - `screen.height / availHeight` - Viewport dimensions
  - `screen.colorDepth / pixelDepth` - Display color depth
  - `window.devicePixelRatio` - Device pixel ratio

- **Media Queries**
  - `window.matchMedia()` - Evaluates against spoofed screen dimensions

### Canvas/WebGL Fingerprinting (Future)

Could extend with:
- Canvas readPixels() hooking
- WebGL uniform/texture read interception
- WebAudio context fingerprinting protection

## Configuration

The extension loads policy configuration from `chrome.storage.local.policyConfig`. This can be:

1. **Default config** - Loaded on first run with bundled personas/rules
2. **Imported config** - Users can import TOML/JSON config from the core Rust library
3. **Manual config** - Users can add/edit personas and rules via options page (TODO)

### Example Config Structure

```json
{
  "personas": [
    {
      "id": "standard",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "accept_language": "en-US,en;q=0.9",
      "timezone": "America/New_York",
      "screen": {
        "width": 1920,
        "height": 1080,
        "color_depth": 24,
        "pixel_ratio": 1
      }
    }
  ],
  "rules": [
    {
      "pattern": { "Suffix": ".amazon.com" },
      "persona_id": "standard"
    }
  ]
}
```

## Integration with Core Library

The extension is designed to integrate with the Rust core policy engine:

### Option 1: WASM Module (Recommended)

Compile the Rust core to WebAssembly:
```bash
cd core && wasm-pack build --target web
```

Then import in background.ts:
```typescript
import * as PolicyEngine from '../core/pkg/policy_engine';
const policy = await PolicyEngine.load_config_from_path('/default.toml');
```

### Option 2: HTTP API

Expose the Rust core as a local HTTP server on `localhost:9090`:

```typescript
const response = await fetch('http://localhost:9090/resolve-persona', {
  method: 'POST',
  body: JSON.stringify({ host: 'example.com' })
});
const persona = await response.json();
```

### Option 3: Hybrid (Current)

For MVP, extension loads default config in TypeScript and communicates via chrome.runtime.sendMessage(). This allows testing without WASM/HTTP dependencies.

## Manifest V3 Considerations

This extension uses Manifest V3, which differs from V2:

- Service Workers instead of persistent background pages
- Declarative Net Request API instead of webRequest
- Restricted inline scripts (uses injected script technique)
- Limited persistent storage (uses chrome.storage.local)
- Message passing remains unchanged

## Testing

### Manual Testing

1. Load extension in Chrome/Edge
2. Navigate to any site
3. Open extension popup - should show current hostname and matched persona
4. Open DevTools console - should show spoofing logs
5. Run JavaScript in console to verify spoofing:
   ```javascript
   console.log(navigator.userAgent);
   console.log(screen.width);
   console.log(navigator.language);
   ```

### Automated Testing (TODO)

- Unit tests for persona resolution logic
- Integration tests for content script injection
- E2E tests for full privacy flows

## Security Considerations

- Extension content script runs with minimal privileges
- All spoofing code executes in page context (not extension context)
- Storage uses chrome.storage.local (not synced)
- No external network requests (for privacy)
- Messages pass through chrome.runtime.sendMessage() which is secure

## Privacy

This extension is designed for **privacy preservation only**:
- No telemetry or tracking
- No external servers contacted
- All logic runs locally
- Configuration stored in local Chrome storage
- No access to browsing history or other sensitive APIs

## Future Enhancements

- [ ] Options page for persona/rule management
- [ ] Import/export config from JSON/TOML
- [ ] Canvas/WebGL fingerprinting protection
- [ ] WebAudio fingerprinting protection
- [ ] Local certificate pinning for HTTPS sites
- [ ] Per-domain credential manager
- [ ] Integration with password managers
- [ ] Statistical analysis of spoofing effectiveness
