#![forbid(unsafe_code)]

pub mod config;
pub mod logging;
pub mod persona;
pub mod policy;
pub mod rules;

pub use config::{Config, ConfigError};
pub use logging::LogEntry;
pub use persona::{Persona, Screen};
pub use policy::Policy;
pub use rules::{Rule, RulePattern};

use std::path::Path;

/// High-level API: Load configuration from a file and build a policy.
///
/// # Example
/// ```no_run
/// use identity_firewall_core::load_config_from_path;
///
/// let policy = load_config_from_path("config.toml")?;
/// if let Some(persona) = policy.resolve_persona("example.com") {
///     println!("Using persona: {}", persona.id);
/// }
/// # Ok::<(), identity_firewall_core::ConfigError>(())
/// ```
pub fn load_config_from_path(path: impl AsRef<Path>) -> Result<Policy, ConfigError> {
    Config::from_path(path)?.into_policy()
}

/// High-level API: Load configuration from a TOML string and build a policy.
///
/// # Example
/// ```
/// use identity_firewall_core::load_config_from_toml;
///
/// let toml = r#"
/// [[personas]]
/// id = "p1"
/// languages = ["en"]
///
/// [[rules]]
/// pattern = { Exact = "example.com" }
/// persona_id = "p1"
/// "#;
///
/// let policy = load_config_from_toml(toml)?;
/// assert!(policy.resolve_persona("example.com").is_some());
/// # Ok::<(), identity_firewall_core::ConfigError>(())
/// ```
pub fn load_config_from_toml(input: &str) -> Result<Policy, ConfigError> {
    Config::from_toml_str(input)?.into_policy()
}

/// High-level API: Load configuration from a JSON string and build a policy.
pub fn load_config_from_json(input: &str) -> Result<Policy, ConfigError> {
    Config::from_json_str(input)?.into_policy()
}

#[cfg(test)]
mod tests {
    use super::{Persona, Policy, Rule, RulePattern};
    use std::collections::HashMap;

    #[test]
    fn policy_wire_up_smoke_test() {
        let persona = Persona::new("p1");
        let mut personas = HashMap::new();
        personas.insert("p1".to_string(), persona);
        let rules = vec![Rule::new(RulePattern::Exact("example.com".into()), "p1")];
        let policy = Policy::new(personas, rules);
        assert!(policy.resolve_persona("example.com").is_some());
    }
}
