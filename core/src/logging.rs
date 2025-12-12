use std::fs::{File, OpenOptions};
use std::io::{self, Write};
use std::path::Path;
use std::sync::Mutex;
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

    pub fn with_headers_rewritten(mut self, rewritten: bool) -> Self {
        self.headers_rewritten = rewritten;
        self
    }
}

/// Trait for logging sinks that can receive log entries.
pub trait Logger: Send + Sync {
    fn log(&self, entry: &LogEntry) -> Result<(), Box<dyn std::error::Error>>;
}

/// Logger that writes JSON-formatted log entries to stdout.
pub struct StdoutLogger;

impl Logger for StdoutLogger {
    fn log(&self, entry: &LogEntry) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string(entry)?;
        println!("{}", json);
        Ok(())
    }
}

/// Logger that writes JSON-formatted log entries to a file.
pub struct FileLogger {
    file: Mutex<File>,
}

impl FileLogger {
    pub fn new(path: impl AsRef<Path>) -> io::Result<Self> {
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;
        Ok(Self {
            file: Mutex::new(file),
        })
    }
}

impl Logger for FileLogger {
    fn log(&self, entry: &LogEntry) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string(entry)?;
        let mut file = self.file.lock().unwrap();
        writeln!(file, "{}", json)?;
        file.flush()?;
        Ok(())
    }
}

/// Combines multiple loggers into one.
pub struct MultiLogger {
    loggers: Vec<Box<dyn Logger>>,
}

impl MultiLogger {
    pub fn new(loggers: Vec<Box<dyn Logger>>) -> Self {
        Self { loggers }
    }
}

impl Logger for MultiLogger {
    fn log(&self, entry: &LogEntry) -> Result<(), Box<dyn std::error::Error>> {
        for logger in &self.loggers {
            logger.log(entry)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{LogEntry, Logger, StdoutLogger};

    #[test]
    fn log_entry_creates_with_timestamp() {
        let entry = LogEntry::new("example.com", "p1");
        assert_eq!(entry.host, "example.com");
        assert_eq!(entry.persona_id, "p1");
        assert!(!entry.headers_rewritten);
    }

    #[test]
    fn log_entry_with_headers_rewritten() {
        let entry = LogEntry::new("example.com", "p1").with_headers_rewritten(true);
        assert!(entry.headers_rewritten);
    }

    #[test]
    fn stdout_logger_succeeds() {
        let logger = StdoutLogger;
        let entry = LogEntry::new("test.com", "p1");
        assert!(logger.log(&entry).is_ok());
    }
}
