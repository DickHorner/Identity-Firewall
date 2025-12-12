use std::{collections::HashMap, fs, path::Path};

use serde::Deserialize;

use crate::{persona::Persona, policy::Policy, rules::Rule};

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("toml parse error: {0}")]
    Toml(#[from] toml::de::Error),
    #[error("json parse error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("duplicate persona id: {0}")]
    DuplicatePersona(String),
    #[error("rule references unknown persona: {0}")]
    UnknownPersona(String),
}

#[derive(Debug, Deserialize)]
pub struct Config {
    pub personas: Vec<Persona>,
    pub rules: Vec<Rule>,
}

impl Config {
    pub fn from_toml_str(input: &str) -> Result<Self, ConfigError> {
        toml::from_str(input).map_err(ConfigError::from)
    }

    pub fn from_json_str(input: &str) -> Result<Self, ConfigError> {
        serde_json::from_str(input).map_err(ConfigError::from)
    }

    pub fn from_path(path: impl AsRef<Path>) -> Result<Self, ConfigError> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)?;
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();

        match ext.as_str() {
            "json" => Self::from_json_str(&content),
            _ => Self::from_toml_str(&content),
        }
    }

    pub fn into_policy(self) -> Result<Policy, ConfigError> {
        Policy::try_from(self)
    }
}

impl TryFrom<Config> for Policy {
    type Error = ConfigError;

    fn try_from(config: Config) -> Result<Self, Self::Error> {
        let mut personas = HashMap::new();
        for persona in config.personas {
            if personas.contains_key(&persona.id) {
                return Err(ConfigError::DuplicatePersona(persona.id));
            }
            personas.insert(persona.id.clone(), persona);
        }

        for rule in &config.rules {
            if !personas.contains_key(&rule.persona_id) {
                return Err(ConfigError::UnknownPersona(rule.persona_id.clone()));
            }
        }

        Ok(Policy::new(personas, config.rules))
    }
}

#[cfg(test)]
mod tests {
    use super::{Config, ConfigError};
    use crate::{Policy, RulePattern};

    const SIMPLE_TOML: &str = r#"
[[personas]]
id = "p1"
languages = ["en"]

[[rules]]
pattern = { Exact = "example.com" }
persona_id = "p1"
"#;

    #[test]
    fn loads_toml_and_builds_policy() {
        let config = Config::from_toml_str(SIMPLE_TOML).unwrap();
        let policy = Policy::try_from(config).unwrap();
        let persona = policy.resolve_persona("example.com").unwrap();
        assert_eq!(persona.id, "p1");
    }

    #[test]
    fn errors_on_unknown_persona() {
        let config = Config::from_toml_str(
            r#"[[personas]]
id = "p1"
languages = ["en"]

[[rules]]
pattern = { Exact = "example.com" }
persona_id = "missing"
"#,
        )
        .unwrap();

        let err = Policy::try_from(config).unwrap_err();
        matches!(err, ConfigError::UnknownPersona(_));
    }

    #[test]
    fn errors_on_duplicate_persona() {
        let err = Config::from_toml_str(
            r#"[[personas]]
id = "p1"
languages = ["en"]

[[personas]]
id = "p1"
languages = ["en"]

[[rules]]
pattern = { Exact = "example.com" }
persona_id = "p1"
"#,
        )
        .and_then(Policy::try_from)
        .unwrap_err();

        matches!(err, ConfigError::DuplicatePersona(_));
    }

    #[test]
    fn supports_json_config() {
        let json = r#"{
  "personas": [{"id": "p1", "languages": ["en"]}],
  "rules": [{"pattern": {"Exact": "example.com"}, "persona_id": "p1"}]
}"#;
        let policy = Config::from_json_str(json)
            .and_then(Policy::try_from)
            .unwrap();
        assert!(policy.resolve_persona("example.com").is_some());
    }

    #[test]
    fn respects_rule_order_for_resolution() {
        let toml = r#"
[[personas]]
id = "p1"
languages = ["en"]

[[personas]]
id = "p2"
languages = ["en"]

[[rules]]
pattern = { Suffix = ".example.com" }
persona_id = "p1"

[[rules]]
pattern = { Exact = "shop.example.com" }
persona_id = "p2"
"#;
        let policy = Config::from_toml_str(toml)
            .and_then(Policy::try_from)
            .unwrap();

        // First matching rule wins (order preserved)
        let persona = policy.resolve_persona("shop.example.com").unwrap();
        assert_eq!(persona.id, "p1");

        assert_eq!(policy.rules().len(), 2);
    }
}
