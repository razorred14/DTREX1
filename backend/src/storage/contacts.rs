use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tracing::warn;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub xch_address: Option<String>,
    pub email: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

fn contacts_dir() -> &'static str {
    "storage/contacts"
}

fn contact_path(id: &str) -> String {
    format!("{}/{}.json", contacts_dir(), id)
}

pub fn store_contact(contact: &Contact) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(contacts_dir())?;
    let path = contact_path(&contact.id);
    let body = serde_json::to_string_pretty(contact)?;
    fs::write(path, body)?;
    Ok(())
}

pub fn load_contact(id: &str) -> Result<Contact, Box<dyn std::error::Error>> {
    let path = contact_path(id);
    if !Path::new(&path).exists() {
        return Err(format!("Contact not found: {}", id).into());
    }

    let content = fs::read_to_string(path)?;
    let contact: Contact = serde_json::from_str(&content)?;
    Ok(contact)
}

pub fn list_contacts() -> Result<Vec<Contact>, Box<dyn std::error::Error>> {
    fs::create_dir_all(contacts_dir())?;
    let mut contacts = Vec::new();

    for entry in fs::read_dir(contacts_dir())? {
        let entry = entry?;
        if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }

        let id = match entry.path().file_stem().and_then(|s| s.to_str()) {
            Some(id) => id.to_string(),
            None => continue,
        };

        match load_contact(&id) {
            Ok(contact) => contacts.push(contact),
            Err(e) => warn!("Failed to load contact {}: {}", id, e),
        }
    }

    Ok(contacts)
}

pub fn delete_contact(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = contact_path(id);
    if Path::new(&path).exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}
