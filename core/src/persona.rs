use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Screen {
    pub width: u32,
    pub height: u32,
    pub color_depth: Option<u8>,
    pub pixel_ratio: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Persona {
    pub id: String,
    pub user_agent: Option<String>,
    pub accept_language: Option<String>,
    pub languages: Vec<String>,
    pub timezone: Option<String>,
    pub screen: Option<Screen>,
}

impl Persona {
    pub fn new<I: Into<String>>(id: I) -> Self {
        Self {
            id: id.into(),
            user_agent: None,
            accept_language: None,
            languages: Vec::new(),
            timezone: None,
            screen: None,
        }
    }
}
