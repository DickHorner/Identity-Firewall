use std::time::SystemTime;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct LogEntry {
    pub timestamp: SystemTime,
    pub host: String,
    pub persona_id: String,
    pub headers_rewritten: bool,
}

impl LogEntry {
    pub fn new(host: impl Into<String>, persona_id: impl Into<String>) -> Self {
        Self {
            timestamp: SystemTime::now(),
            host: host.into(),
            persona_id: persona_id.into(),
            headers_rewritten: false,
        }
    }
}
