# Getting Started with Identity Firewall Extension

## Quick Start (5 minutes)

### 1. Build the Extension

```bash
cd extension
npm install
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 2. Load in Chrome/Edge

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Toggle "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder (not `dist/`)
5. The extension should now appear in your toolbar

### 3. Test It Out

1. Click the extension icon (🛡️) in the toolbar
2. You'll see:
   - Current site hostname
   - Matched persona (if rules match the site)
   - Total personas and rules
3. Navigate to a new site and click the icon again - persona may change

### Development Workflow

Watch for changes and rebuild automatically:

```bash
cd extension
npm run dev
```

Then reload the extension in Chrome:
- Click extension icon → Right-click → "Manage extension"
- Click the reload icon in the extension's card
- Or press `Ctrl+Shift+R` with DevTools open

## Testing Spoofing

### Verify Navigator Spoofing

Open the site's console (F12 → Console) and run:

```javascript
// Check what identity the site sees
console.log('User-Agent:', navigator.userAgent);
console.log('Language:', navigator.language);
console.log('Languages:', navigator.languages);
console.log('Screen:', `${screen.width}x${screen.height} @ ${screen.colorDepth}bit`);
```

Compare with your actual system info to verify spoofing is working.

### Check Extension Logs

Open the extension's service worker logs:

1. `chrome://extensions/`
2. Find "Identity Firewall"
3. Click "Service Worker" link under it
4. Console will show logs like:
   ```
   [Identity Firewall] Initialized with config: {...}
   [Identity Firewall] Applied persona "standard" to example.com
   ```

## Configuration

### Change Default Personas/Rules

Edit `extension/src/background.ts` function `loadDefaultConfig()`:

```typescript
async function loadDefaultConfig(): Promise<PolicyConfig> {
  return {
    personas: [
      {
        id: "your-persona",
        user_agent: "Your custom user agent string",
        accept_language: "en-US,en;q=0.9",
        timezone: "America/New_York",
        screen: {
          width: 1920,
          height: 1080,
          color_depth: 24,
          pixel_ratio: 1,
        },
      },
    ],
    rules: [
      {
        pattern: { Exact: "example.com" },
        persona_id: "your-persona",
      },
    ],
  };
}
```

Then rebuild: `npm run build`

### Load Config from File (Future)

The extension is designed to load policy config from:

1. **Chrome storage** (current): `chrome.storage.local.policyConfig`
2. **WASM module** (planned): Compiled Rust core
3. **HTTP API** (planned): Local policy server on localhost:9090

## Debugging

### Enable Source Maps

Development builds include source maps. To debug TypeScript:

1. Open DevTools in the extension's service worker
2. Sources tab → will show `.ts` files directly
3. Set breakpoints, step through code

### Check Message Flow

Add logging to see message passing:

```typescript
// In background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message);
  // ... handle message ...
  console.log('[Background] Response sent:', response);
  sendResponse(response);
});
```

### Inspect Content Script

In a site's DevTools console, the content script has already run. Check logs:

```javascript
// Check if spoofing is active
console.log('[Identity Firewall] active for persona:', window.__IF_persona_id);
```

## Troubleshooting

### Extension doesn't appear in toolbar

- Make sure you loaded it from the `extension/` folder, not `dist/`
- Restart Chrome completely
- Try loading again from `chrome://extensions`

### Manifest errors

```
"Error while parsing manifest: Unrecognized key 'permissions'"
```

This means the folder doesn't have `manifest.json` at the root. Make sure you're loading `extension/` directly.

### Type errors when building

```bash
npm run type-check
```

Fix TypeScript errors before building.

### Build fails

```bash
rm -rf node_modules dist
npm install
npm run build
```

Clean install and rebuild.

## Next Steps

### Integration with Rust Core

Currently uses in-memory config. To use the Rust policy engine:

**Option A: WASM Module**
```bash
cd core
wasm-pack build --target web
```

Then in `extension/src/background.ts`:
```typescript
import * as PolicyEngine from '../../core/pkg/policy_engine';
const policy = PolicyEngine.load_config_from_file('example.toml');
```

**Option B: HTTP API**
```bash
# Start Rust server
cd core && cargo run --example policy_server -- --port 9090

# In extension, fetch from localhost:9090/resolve-persona
const response = await fetch('http://localhost:9090/resolve-persona', {
  method: 'POST',
  body: JSON.stringify({ host: 'example.com' })
});
```

### Full Privacy Testing

- Use [Coveryourtracks.eff.org](https://coveryourtracks.eff.org) to test fingerprinting protection
- Check [canvas fingerprinting](https://browserleaks.com/canvas) - not yet spoofed
- Check [WebGL fingerprinting](https://browserleaks.com/webgl) - not yet spoofed
- Test with [browseraudit.com](https://www.browseraudit.com/) for full privacy profile

### Add More Features

- **Canvas spoofing**: Hook `<canvas>.getImageData()`
- **WebGL spoofing**: Hook shader compilation and texture reads
- **WebAudio spoofing**: Hook AudioContext fingerprinting
- **Options page**: UI for importing config and managing personas
- **Header rewriting**: Use declarativeNetRequest API for full HTTP header spoofing

## File Structure Reference

```
extension/
├── manifest.json           # Manifest V3 declaration
├── src/
│   ├── types.ts           # Shared TypeScript types
│   ├── background.ts      # Service Worker (compile to background.js)
│   └── content.ts         # Content Script (compile to content.js)
├── ui/
│   ├── popup.html         # Popup UI
│   └── popup.ts           # Popup logic (compile to popup.js)
├── dist/                  # Compiled JavaScript (generated by build)
├── node_modules/          # Dependencies (generated by npm install)
├── package.json           # NPM config
├── tsconfig.json          # TypeScript config
└── README.md              # Full documentation
```

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/mv2-migration/)
- [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Identity Firewall Architecture](../docs/ARCHITECTURE.md)
- [Threat Model](../docs/THREAT_MODEL.md)
