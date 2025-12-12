# Identity Firewall

A policy-driven identity layer for browsers and network traffic that controls which digital identity signals websites receive.

## Project Status

**Current Stage**: Core implementation (Step 1-5 complete)

✅ Rust core with policy engine  
✅ Configuration loading (TOML/JSON)  
✅ Rule patterns with specificity ordering  
✅ Logging infrastructure  
⬜ Browser extension (next)  
⬜ GUI (optional, future)

## Quick Links

- [PROJECT.md](PROJECT.md) – Complete project description and goals
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) – Security analysis
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – System design
- [core/README.md](core/README.md) – Core library usage

## Repository Structure

```
├── core/                   # Rust policy engine
│   ├── src/
│   │   ├── persona.rs      # Identity profile definitions
│   │   ├── rules.rs        # Pattern matching
│   │   ├── policy.rs       # Persona resolution
│   │   ├── config.rs       # Configuration loading
│   │   └── logging.rs      # Logging infrastructure
│   └── examples/
│       └── identity_firewall.example.toml
├── extension/              # Browser extension (TODO)
├── docs/
│   ├── THREAT_MODEL.md
│   └── ARCHITECTURE.md
└── PROJECT.md
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

```bash
# Build and test core
cd core
cargo build
cargo test
```

## License

MIT
