# Extension Development Roadmap

## Phase 1: MVP (Current) ✅

### Completed
- [x] Manifest V3 structure
- [x] Background service worker with policy resolution
- [x] Content script injection for spoofing
- [x] Navigator API spoofing (userAgent, language, languages)
- [x] Screen API spoofing (width, height, colorDepth, devicePixelRatio)
- [x] Media query spoofing (window.matchMedia)
- [x] Popup UI for persona selection
- [x] Inter-script messaging system
- [x] Rule pattern matching (Exact, Prefix, Suffix, Glob)
- [x] Persona caching for performance
- [x] Configuration storage in chrome.storage.local

### Status: Ready for local testing

## Phase 2: Core Integration (Next)

### HTTP API Bridge
- [ ] Expose Rust policy engine as local HTTP server
- [ ] Extend background.ts to call localhost:9090 for persona resolution
- [ ] Fall back to in-memory config if server unavailable
- [ ] API endpoints:
  - `POST /resolve-persona` - Get persona for hostname
  - `GET /config` - Retrieve full policy config
  - `POST /config` - Update policy config

### WASM Module Integration
- [ ] Build Rust core to WebAssembly (`wasm-pack`)
- [ ] Import WASM in background service worker
- [ ] Use WASM Policy::resolve_persona() directly
- [ ] Eliminates need for HTTP server
- [ ] ~500KB WASM + gzip compression needed

### Config Import/Export
- [ ] Parse TOML files (JavaScript parser)
- [ ] Parse JSON files (native)
- [ ] Export current config as TOML/JSON
- [ ] Validate config before import
- [ ] Handle parsing errors gracefully

## Phase 3: Advanced Spoofing

### Canvas Fingerprinting Protection
- [ ] Hook canvas.getImageData() - return synthetic pixel data
- [ ] Generate consistent pseudo-random pixels per persona
- [ ] Prevent canvas extraction via toDataURL()
- [ ] Test with [browserleaks.com/canvas](https://browserleaks.com/canvas)

### WebGL Fingerprinting Protection
- [ ] Hook getParameter() - spoof vendor/renderer strings
- [ ] Hook WebGLRenderingContext properties
- [ ] Generate fake uniform values
- [ ] Intercept shader compilation to avoid GLSL analysis
- [ ] Test with [browserleaks.com/webgl](https://browserleaks.com/webgl)

### WebAudio Fingerprinting Protection
- [ ] Hook AudioContext creation
- [ ] Spoof audio settings (sample rate, channel count)
- [ ] Prevent audio worklet fingerprinting
- [ ] Test with privacy testing sites

### HTTP Header Rewriting (Manifest V3)
- [ ] Use declarativeNetRequest API
- [ ] Rewrite User-Agent header to match persona
- [ ] Rewrite Accept-Language header
- [ ] Rewrite Sec-CH-UA headers (if present)
- [ ] Requires Chrome 88+, Firefox TBD
- [ ] Dynamic rule registration based on persona

### WebRTC Leak Prevention
- [ ] Intercept RTCPeerConnection
- [ ] Spoof ICE candidates (hide real IP)
- [ ] Filter STUN/TURN servers
- [ ] Test with [browserleaks.com/ip](https://browserleaks.com/ip)

## Phase 4: User Experience

### Options/Settings Page
- [ ] Create `ui/options.html` and `ui/options.ts`
- [ ] Display list of personas (edit, add, delete)
- [ ] Display list of rules (reorder, edit, delete)
- [ ] Import/export config files
- [ ] Test personas against example sites
- [ ] Show spoofing coverage (Canvas, WebGL, Headers, etc.)
- [ ] Per-site persona override (remember choice)

### Popup Enhancements
- [ ] Show spoofing status (✓ spoofed, ✗ exposed, ? partial)
- [ ] Show active protections (Headers, Navigator, Screen, Canvas, WebGL)
- [ ] Per-site override button
- [ ] Quick access to settings
- [ ] Statistics (sites visited, personas used, tracking blocked)

### Statistics & Analytics (Local Only)
- [ ] Track persona usage per domain
- [ ] Measure spoofing effectiveness
- [ ] Log blocked fingerprinting attempts
- [ ] Show privacy score (0-100 based on coverage)
- [ ] All stored locally, no external reporting

### Visual Feedback
- [ ] Icon indicates spoofing status
- [ ] Badge shows current persona ID
- [ ] Different icons for full/partial spoofing
- [ ] Color coding for security level

## Phase 5: Advanced Features

### Per-Domain Credentials
- [ ] Store username/password per persona per site
- [ ] Auto-fill login forms with persona credentials
- [ ] Separate identity for each browsing context
- [ ] Encrypted storage in chrome.storage.local
- [ ] Integration with password managers (future)

### Session Isolation
- [ ] Track browsing sessions per persona
- [ ] Prevent cookie sharing across personas
- [ ] Separate localStorage per persona
- [ ] IndexedDB isolation
- [ ] Cache invalidation when switching personas

### Profile Management
- [ ] Create/edit/delete personas in UI
- [ ] Generate realistic persona data
- [ ] Import personas from online datasets
- [ ] Share personas with other users (encrypted)
- [ ] Version control for persona history

### Blockchain/Web3 Privacy
- [ ] Spoof MetaMask/dApp wallet identity
- [ ] Generate different Ethereum addresses per persona
- [ ] Prevent on-chain fingerprinting
- [ ] Privacy for Web3 browsing

## Phase 6: Testing & Quality

### Automated Tests
- [ ] Unit tests for persona resolution
- [ ] Integration tests for content script injection
- [ ] E2E tests with Puppeteer
- [ ] Privacy scanning automation
- [ ] Regression test suite

### Privacy Audits
- [ ] Run tests against EFF Panopticlick
- [ ] Run against Coveryourtracks
- [ ] Run against browseraudit.com
- [ ] Benchmark performance impact
- [ ] Document privacy gaps

### Performance Optimization
- [ ] Profile content script injection time
- [ ] Optimize spoofing code generation
- [ ] Cache compiled spoofing scripts
- [ ] Lazy load advanced protection (Canvas, WebGL)
- [ ] Minimize extension size and memory usage

### Cross-Browser Testing
- [ ] Test on Chrome 88+
- [ ] Test on Edge (Chromium-based)
- [ ] Adapt for Firefox WebExtensions
- [ ] Test on Safari (if supported)
- [ ] Document compatibility matrix

## Phase 7: Distribution

### Chrome Web Store
- [ ] Create app icon and screenshots
- [ ] Write store listing description
- [ ] Privacy policy document
- [ ] Submit for review
- [ ] Handle user reviews and feedback

### Firefox Add-ons Store
- [ ] Adapt manifest for Firefox
- [ ] Convert chrome.* APIs to Firefox equivalents
- [ ] Submit to AMO (addons.mozilla.org)
- [ ] Localization (en, de, fr, es, etc.)

### Self-Hosting
- [ ] GitHub Releases with signed packages
- [ ] Installation instructions for developers
- [ ] Update mechanism for self-hosted versions
- [ ] Security considerations documentation

## Known Limitations

- Manifest V3 restricts HTTP header rewriting (no webRequest)
- Service Worker can suspend (no persistent background page)
- Limited to Chromium/Firefox, not Safari with same API
- Canvas/WebGL spoofing requires script injection (not foolproof)
- Real-time browser updates may break spoofing

## Dependencies Needed

```json
{
  "@types/chrome": "^0.0.246",
  "esbuild": "^0.19.0",
  "typescript": "^5.3.0"
}
```

For WASM integration:
```json
{
  "wasm-bindgen": "^0.2.88",
  "wasm-pack": "^1.3.4"
}
```

## Architecture Notes

### Current (Phase 1)

```
Content Script → Background Worker → In-Memory Config
                                    ↓
                            Persona Lookup & Cache
                                    ↓
                                  Popup UI
```

### Future (Phase 2+)

```
Content Script → Background Worker → HTTP API (Rust Core)
                                    or WASM Module
                                         ↓
                                  Policy Engine
                                         ↓
                                  Persona Lookup
                                         ↓
                                  Per-Site Overrides
                                         ↓
                                  Options Page UI
                                         ↓
                            Statistics & Analytics
```

## Milestones

| Phase | Target | Status |
|-------|--------|--------|
| 1     | Q1 2025 | ✅ Done |
| 2     | Q2 2025 | ⏳ Next |
| 3     | Q2-Q3 2025 | ⏳ Planned |
| 4     | Q3 2025 | ⏳ Planned |
| 5     | Q4 2025 | 💭 Proposed |
| 6     | Q4 2025 | 💭 Proposed |
| 7     | 2026 | 💭 Proposed |

## Getting Help

- [Manifest V3 docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Canvas fingerprinting protection](https://browserleaks.com/canvas)
- [WebGL fingerprinting](https://browserleaks.com/webgl)
- Identity Firewall [Architecture](../docs/ARCHITECTURE.md)
- Identity Firewall [Threat Model](../docs/THREAT_MODEL.md)
