# Identity Firewall Core – Quick Start

This README covers the Rust core library implementation.

## Building

```bash
cargo build
```

## Testing

```bash
cargo test
```

## Usage

### Basic API

```rust
use identity_firewall_core::{load_config_from_path, Logger, StdoutLogger};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load policy from config file
    let policy = load_config_from_path("config.toml")?;
    
    // Resolve persona for a request
    if let Some(persona) = policy.resolve_persona("shop.example.com") {
        println!("Using persona: {}", persona.id);
        
        // Log the identity access
        let logger = StdoutLogger;
        let entry = LogEntry::new("shop.example.com", &persona.id)
            .with_headers_rewritten(true);
        logger.log(&entry)?;
    }
    
    Ok(())
}
```

### Configuration Format

See [examples/identity_firewall.example.toml](examples/identity_firewall.example.toml) for a complete example.

## Features

- **Persona Management**: Define reusable identity profiles
- **Rule Patterns**: Exact, Prefix, Suffix, Glob matching
- **Automatic Specificity**: Rules sorted by specificity for best match
- **Flexible Logging**: Stdout, File, or custom logger implementations
- **Safe Rust**: `#![forbid(unsafe_code)]`

## Documentation

- [THREAT_MODEL.md](../docs/THREAT_MODEL.md) – Security considerations
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) – System design
- API docs: `cargo doc --open`
