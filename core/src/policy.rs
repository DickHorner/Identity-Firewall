use std::collections::HashMap;

use crate::persona::Persona;
use crate::rules::Rule;

#[derive(Debug, Default)]
pub struct Policy {
    personas: HashMap<String, Persona>,
    rules: Vec<Rule>,
}

impl Policy {
    pub fn new(personas: HashMap<String, Persona>, mut rules: Vec<Rule>) -> Self {
        // Sort rules by specificity (most specific first)
        rules.sort_by(|a, b| b.pattern.specificity().cmp(&a.pattern.specificity()));
        Self { personas, rules }
    }

    pub fn resolve_persona(&self, host: &str) -> Option<&Persona> {
        let rule = self.rules.iter().find(|rule| rule.matches_host(host))?;
        self.personas.get(&rule.persona_id)
    }

    pub fn personas(&self) -> &HashMap<String, Persona> {
        &self.personas
    }

    pub fn rules(&self) -> &[Rule] {
        &self.rules
    }
}

#[cfg(test)]
mod tests {
    use super::Policy;
    use crate::persona::Persona;
    use crate::rules::{Rule, RulePattern};
    use std::collections::HashMap;

    #[test]
    fn resolves_persona_for_exact_match() {
        let persona = Persona::new("p1");
        let mut personas = HashMap::new();
        personas.insert(persona.id.clone(), persona);

        let rules = vec![Rule::new(RulePattern::Exact("example.com".into()), "p1")];
        let policy = Policy::new(personas, rules);

        assert!(policy.resolve_persona("example.com").is_some());
    }

    #[test]
    fn prioritizes_exact_over_suffix() {
        let mut personas = HashMap::new();
        personas.insert("p1".to_string(), Persona::new("p1"));
        personas.insert("p2".to_string(), Persona::new("p2"));

        let rules = vec![
            Rule::new(RulePattern::Suffix(".example.com".into()), "p1"),
            Rule::new(RulePattern::Exact("shop.example.com".into()), "p2"),
        ];
        let policy = Policy::new(personas, rules);

        // Exact match should win despite being later in original order
        let persona = policy.resolve_persona("shop.example.com").unwrap();
        assert_eq!(persona.id, "p2");
    }

    #[test]
    fn prioritizes_by_specificity() {
        let mut personas = HashMap::new();
        personas.insert("glob".to_string(), Persona::new("glob"));
        personas.insert("suffix".to_string(), Persona::new("suffix"));
        personas.insert("exact".to_string(), Persona::new("exact"));

        let rules = vec![
            Rule::new(RulePattern::Glob("*.com".into()), "glob"),
            Rule::new(RulePattern::Suffix(".example.com".into()), "suffix"),
            Rule::new(RulePattern::Exact("api.example.com".into()), "exact"),
        ];
        let policy = Policy::new(personas, rules);

        assert_eq!(policy.resolve_persona("api.example.com").unwrap().id, "exact");
        assert_eq!(
            policy.resolve_persona("shop.example.com").unwrap().id,
            "suffix"
        );
        assert_eq!(policy.resolve_persona("other.com").unwrap().id, "glob");
    }
}
