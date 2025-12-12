# Identity Firewall – Architecture

## Overview

The Identity Firewall is a modular system that controls digital identity signals sent to websites. It consists of three main components:

1. **Core (Rust)**: Policy engine, configuration management, logging
2. **Extension (TypeScript)**: Browser integration for header and JS spoofing
3. **GUI (Tauri)**: Optional desktop interface for management

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User                                 │
└─────────────────┬───────────────────────────┬────────────────┘
                  │                           │
                  │                           │
         ┌────────▼─────────┐        ┌───────▼────────┐
         │  Browser         │        │  GUI (Tauri)   │
         │  Extension       │        │  [Optional]    │
         └────────┬─────────┘        └───────┬────────┘
                  │                           │
                  │  Native Messaging         │  IPC/HTTP API
                  │  [Future]                 │  [Future]
         ┌────────▼───────────────────────────▼────────┐
         │                                              │
         │        Identity Firewall Core (Rust)        │
         │                                              │
         │  ┌─────────────────────────────────────┐    │
         │  │  Config Loader                      │    │
         │  │  • TOML/JSON parsing                │    │
         │  │  • Validation                       │    │
         │  └─────────────────────────────────────┘    │
         │                                              │
         │  ┌─────────────────────────────────────┐    │
         │  │  Policy Engine                      │    │
         │  │  • Persona definitions              │    │
         │  │  • Rule matching (host → persona)   │    │
         │  │  • Resolution API                   │    │
         │  └─────────────────────────────────────┘    │
         │                                              │
         │  ┌─────────────────────────────────────┐    │
         │  │  Logger                             │    │
         │  │  • Structured logging               │    │
         │  │  • Pluggable sinks                  │    │
         │  └─────────────────────────────────────┘    │
         │                                              │
         │  ┌─────────────────────────────────────┐    │
         │  │  Proxy [Optional]                   │    │
         │  │  • HTTP(S) MITM                     │    │
         │  │  • Header rewriting                 │    │
         │  └─────────────────────────────────────┘    │
         │                                              │
         └──────────────────────────────────────────────┘
                          │
                          │  Rewritten requests
                          │
                  ┌───────▼────────┐
                  │   Web Servers  │
                  └────────────────┘
```

---

## Component Breakdown

### 1. Core (Rust Library)

**Location**: `core/`

**Modules**:

- **`persona`** (`persona.rs`)
  - Data structures: `Persona`, `Screen`
  - Identity profile attributes (user agent, language, timezone, screen)
  - Serialization via `serde`

- **`rules`** (`rules.rs`)
  - `RulePattern`: Exact, Suffix, [future: Prefix, Glob]
  - `Rule`: Pattern + persona_id mapping
  - Host matching logic

- **`policy`** (`policy.rs`)
  - `Policy`: Container for personas + rules
  - `resolve_persona(host) -> Option<&Persona>`
  - Rule evaluation (first match wins)

- **`config`** (`config.rs`)
  - `Config`: TOML/JSON deserialization structure
  - `from_toml_str`, `from_json_str`, `from_path`
  - Validation (duplicate personas, unknown persona references)
  - Conversion to `Policy`

- **`logging`** (`logging.rs`)
  - `LogEntry`: timestamp, host, persona_id, flags
  - [Future] `Logger` trait with stdout/file sinks

- **`proxy`** (`proxy.rs`) [Future]
  - HTTP(S) proxy using `hyper`/`tokio`
  - TLS MITM with `rustls`
  - Header rewriting via policy engine

**Dependencies**:
```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
thiserror = "1"
```

**API Surface**:
```rust
// Load config and build policy
let policy = Config::from_path("config.toml")?.into_policy()?;

// Resolve persona for a request
if let Some(persona) = policy.resolve_persona("shop.example.com") {
    println!("Using persona: {}", persona.id);
}

// Create log entry
let entry = LogEntry::new("example.com", "standard_persona");
```

---

### 2. Browser Extension (TypeScript)

**Location**: `extension/`

**Structure**:
```
extension/
├── src/
│   ├── background.ts    # Background service worker/script
│   ├── content.ts       # Content scripts for JS spoofing
│   ├── types.ts         # Shared types (Persona, Rule)
│   └── config.ts        # Config management
├── manifest.json        # WebExtension manifest
├── package.json
└── tsconfig.json
```

**Components**:

- **Background Script** (`background.ts`)
  - Hooks `webRequest.onBeforeSendHeaders` (Firefox) or `declarativeNetRequest` (Chrome)
  - Loads config (initially static JSON, future: native messaging to core)
  - Resolves persona for each request
  - Rewrites headers: User-Agent, Accept-Language, Sec-CH-*
  - Logs actions to browser console/storage

- **Content Scripts** (`content.ts`)
  - Injected at `document_start` to run before page scripts
  - Overrides:
    - `navigator.userAgent`, `navigator.platform`, `navigator.languages`
    - `screen.width`, `screen.height`, `screen.colorDepth`
    - `Intl.DateTimeFormat().resolvedOptions()` for timezone
  - Uses `Object.defineProperty` with `configurable: false` to prevent detection
  - Ensures consistency with HTTP headers

- **Types** (`types.ts`)
  - TypeScript interfaces matching Rust structs
  - `Persona`, `Screen`, `Rule`, `RulePattern`

**Data Flow**:
1. User visits `shop.example.com`
2. Background script intercepts request
3. Matches domain against rules → resolves persona "standard"
4. Rewrites User-Agent, Accept-Language headers
5. Content script injects, overrides `navigator.*` to match
6. Page receives consistent spoofed identity

---

### 3. GUI (Tauri) [Optional]

**Location**: `gui/`

**Purpose**:
- Visual interface for managing personas and rules
- View logs and experiment results
- Not required for core functionality

**Structure**:
```
gui/
├── src/              # Frontend (React/Svelte/Vue)
├── src-tauri/        # Rust backend
│   └── src/
│       └── main.rs   # Tauri app, links to core
└── package.json
```

**Features**:
- Persona editor (add/edit/delete personas)
- Rule builder (drag-drop domain patterns)
- Log viewer (table of identity access events)
- Experiment launcher (test multiple personas against URL)

**Integration**:
- Calls core library functions via Tauri commands
- Or connects to local HTTP API exposed by proxy

---

## Data Flow

### Request Lifecycle

```
1. Browser Request
   └─> extension/background.ts: webRequest hook
       └─> Load config (static or via native messaging)
       └─> Match domain → persona
       └─> Rewrite headers
       └─> Log entry created

2. Page Load
   └─> extension/content.ts: injected at document_start
       └─> Override navigator/screen properties
       └─> Ensure consistency with headers

3. [Future] Proxy Mode
   └─> core/proxy: receive request
       └─> Resolve persona via policy engine
       └─> Rewrite headers
       └─> Forward to upstream
       └─> Log entry written to sink
```

### Configuration Flow

```
1. User edits config.toml
2. Config::from_path() loads and validates
3. into_policy() converts to Policy object
4. Extension/Proxy uses Policy.resolve_persona()
5. Persona fields applied to request/DOM
```

---

## Module Responsibilities

| Module | Responsibility | Dependencies |
|--------|----------------|--------------|
| `persona` | Define identity profile schema | `serde` |
| `rules` | Pattern matching for host→persona | `serde` |
| `policy` | Rule evaluation, persona resolution | `persona`, `rules` |
| `config` | Parse/validate TOML/JSON configs | `serde`, `toml`, `policy` |
| `logging` | Record identity access events | `serde` |
| `proxy` [future] | HTTP(S) interception | `tokio`, `hyper`, `policy` |

---

## Extension Points

### 1. Rule Pattern Types
**Current**: Exact, Suffix  
**Future**: Prefix, Glob, Regex  
**How**: Add variants to `RulePattern` enum, implement `matches()` logic

### 2. Logging Sinks
**Current**: `LogEntry` struct, manual serialization  
**Future**: `Logger` trait with stdout/file/HTTP implementations  
**How**: Define trait, implement for different backends

### 3. Native Messaging
**Current**: Extension uses static config  
**Future**: Extension communicates with core daemon via native messaging  
**How**: WebExtension native messaging API + core IPC server

### 4. Experiment Mode
**Current**: Single persona per request  
**Future**: Parallel requests with different personas, diff results  
**How**: Core exposes batch API, GUI orchestrates requests

---

## Testing Strategy

### Unit Tests
- Rule matching (exact, suffix, case-insensitive)
- Config parsing and validation errors
- Policy resolution order and correctness
- Persona serialization round-trip

### Integration Tests
- Load example config, resolve multiple hosts
- Extension: simulate webRequest hooks, verify header rewrites
- Content script: verify navigator overrides in test DOM

### Manual Testing
- Real browser with extension loaded
- Visit test sites, check Network tab for headers
- Console check for overridden properties
- Verify consistency (HTTP headers match JS values)

---

## Security Considerations

### Trust Boundary

```
User's Machine:
├─ Core (Rust) ─────────────┐
├─ Extension (Browser) ─────┤──> Trusted
└─ GUI (Tauri) ─────────────┘

Websites ───────────────────> Adversarial
```

### Threat Mitigations

1. **Config validation**: Prevent malformed configs from crashing core
2. **Content script injection timing**: Run at `document_start` to beat page scripts
3. **Property immutability**: Use `configurable: false` in `defineProperty`
4. **Logging privacy**: Never log actual user data, only persona IDs and flags

### Known Limitations

- Cannot defend against all fingerprinting (canvas, WebGL, fonts)
- Sites may detect inconsistencies between signals
- No protection against network-level tracking (IP address)

---

## Deployment Modes

### Mode 1: Extension Only (MVP)
- Browser extension with static config
- No proxy, no GUI
- Lightest weight, easiest setup

### Mode 2: Extension + Core Daemon
- Extension uses native messaging to query core
- Core daemon runs locally, exposes IPC API
- Centralized config, shared across browsers

### Mode 3: Proxy + Extension + GUI
- Full-featured deployment
- Proxy handles all HTTP traffic
- Extension handles JS-level spoofing
- GUI for management
- Most powerful, most complex

---

## Future Architecture Considerations

- **Multi-browser support**: Chrome, Safari extension variants
- **Mobile**: Android WebView instrumentation, iOS limitations
- **Cloud sync**: Optional encrypted config sync
- **Community persona database**: Curated, tested persona profiles
- **Automated testing**: CI pipeline with fingerprinting test suite

---

## References

- [PROJECT.md](../PROJECT.md) – Project goals and MVP definition
- [THREAT_MODEL.md](THREAT_MODEL.md) – Adversary analysis
- [Rust crate docs](../core/src/lib.rs) – API documentation
