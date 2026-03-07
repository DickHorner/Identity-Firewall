# Identity Firewall

A policy-driven identity layer for browsers and network traffic that controls which digital identity signals websites receive.

## Project Status

**Current Stage**: Core + Browser Extension (Steps 1-4 complete)

✅ Rust core with policy engine  
✅ Configuration loading (TOML/JSON)  
✅ Rule patterns with specificity ordering  
✅ Logging infrastructure  
✅ Browser extension (TypeScript/Manifest V3)  
⬜ HTTP/WASM integration (next)  
⬜ GUI (optional, future)

## Quick Links

- [PROJECT.md](PROJECT.md) – Complete project description and goals
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) – Security analysis
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – System design
- [core/README.md](core/README.md) – Core library usage
- [extension/README.md](extension/README.md) – Extension development

## Repository Structure

```
├── core/                   # Rust policy engine (28 KB)
│   ├── src/
│   │   ├── persona.rs      # Identity profile definitions
│   │   ├── rules.rs        # Pattern matching
│   │   ├── policy.rs       # Persona resolution
│   │   ├── config.rs       # Configuration loading (TOML/JSON)
│   │   └── logging.rs      # Logging infrastructure
│   ├── Cargo.toml
│   └── examples/
│       └── identity_firewall.example.toml
├── extension/              # Browser extension (TypeScript)
│   ├── src/
│   │   ├── types.ts        # Shared interfaces
│   │   ├── background.ts   # Service Worker
│   │   └── content.ts      # Content Script
│   ├── ui/
│   │   ├── popup.html      # Popup interface
│   │   └── popup.ts        # Popup controller
│   ├── manifest.json       # Manifest V3
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── docs/
│   ├── THREAT_MODEL.md     # Security analysis
│   └── ARCHITECTURE.md     # System design
├── PROJECT.md              # Project description
└── LICENSE
```

## Core Features

### Personas
Define reusable identity profiles with:
- User-Agent strings
- Language preferences
- Timezone
- Screen parameters

### Rule Patterns
Map domains to personas using:
- **Exact**: `example.com`
- **Prefix**: `api.*`
- **Suffix**: `*.example.com`
- **Glob**: `shop*.example.*`

Rules automatically sorted by specificity for best match.

### Logging
Privacy-aware logging with pluggable sinks:
- Stdout
- File
- Custom implementations via `Logger` trait

## Example Config

```toml
[[personas]]
id = "standard"
user_agent = "Mozilla/5.0..."
languages = ["en-US", "en"]
timezone = "America/New_York"

[personas.screen]
width = 1920
height = 1080

[[rules]]
pattern = { Exact = "example.com" }
persona_id = "standard"
```

## Development

### Build Core

```bash
# Build and test Rust library
cd core
cargo build
cargo test --lib
```

### Build Extension

```bash
# Install dependencies
cd extension
npm install

# Development build (with source maps)
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

### Load Extension in Browser

1. Build the extension: `npm run build`
2. Open `chrome://extensions` (Chrome/Edge) or `about:debugging` (Firefox)
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension/` directory
5. Open any website to test - click the extension icon to see matched persona

## License

MIT
