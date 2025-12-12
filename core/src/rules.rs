use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RulePattern {
    Exact(String),
    Prefix(String),
    Suffix(String),
    Glob(String),
}

impl RulePattern {
    pub fn matches(&self, host: &str) -> bool {
        match self {
            RulePattern::Exact(h) => host.eq_ignore_ascii_case(h),
            RulePattern::Prefix(prefix) => host.starts_with(prefix),
            RulePattern::Suffix(suffix) => host.ends_with(suffix),
            RulePattern::Glob(pattern) => {
                glob::Pattern::new(pattern)
                    .map(|p| p.matches(host))
                    .unwrap_or(false)
            }
        }
    }

    /// Returns specificity score for prioritization.
    /// Higher scores = more specific patterns = higher priority.
    pub fn specificity(&self) -> usize {
        match self {
            RulePattern::Exact(s) => 1000 + s.len(),
            RulePattern::Prefix(s) => 500 + s.len(),
            RulePattern::Suffix(s) => 500 + s.len(),
            RulePattern::Glob(s) => {
                // Count non-wildcard chars for glob specificity
                s.chars().filter(|&c| c != '*' && c != '?').count()
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Rule {
    pub pattern: RulePattern,
    pub persona_id: String,
}

impl Rule {
    pub fn new(pattern: RulePattern, persona_id: impl Into<String>) -> Self {
        Self {
            pattern,
            persona_id: persona_id.into(),
        }
    }

    pub fn matches_host(&self, host: &str) -> bool {
        self.pattern.matches(host)
    }
}

#[cfg(test)]
mod tests {
    use super::{Rule, RulePattern};

    #[test]
    fn exact_pattern_matches_case_insensitive() {
        let rule = Rule::new(RulePattern::Exact("Example.com".into()), "p1");
        assert!(rule.matches_host("example.com"));
    }

    #[test]
    fn suffix_pattern_matches() {
        let rule = Rule::new(RulePattern::Suffix(".example.com".into()), "p1");
        assert!(rule.matches_host("shop.example.com"));
        assert!(!rule.matches_host("example.org"));
    }

    #[test]
    fn prefix_pattern_matches() {
        let rule = Rule::new(RulePattern::Prefix("shop.".into()), "p1");
        assert!(rule.matches_host("shop.example.com"));
        assert!(!rule.matches_host("example.com"));
    }

    #[test]
    fn glob_pattern_matches() {
        let rule = Rule::new(RulePattern::Glob("*.example.com".into()), "p1");
        assert!(rule.matches_host("shop.example.com"));
        assert!(rule.matches_host("api.example.com"));
        assert!(!rule.matches_host("example.com"));
    }

    #[test]
    fn specificity_ordering() {
        let exact = RulePattern::Exact("example.com".into());
        let prefix = RulePattern::Prefix("exa".into());
        let suffix = RulePattern::Suffix(".com".into());
        let glob = RulePattern::Glob("*.com".into());

        assert!(exact.specificity() > prefix.specificity());
        assert!(exact.specificity() > suffix.specificity());
        assert!(exact.specificity() > glob.specificity());
    }
}
