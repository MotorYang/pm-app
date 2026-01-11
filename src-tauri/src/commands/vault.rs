use crate::crypto::{decrypt_data, encrypt_data, hash_password, verify_password};
use rand::{Rng, distributions::Alphanumeric};
use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct VaultEntry {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub param_key: Option<String>,
    pub encrypted_value: String,
    pub encrypted_notes: Option<String>,
    pub url: Option<String>,
    pub category: String,
    pub salt: String,
    pub nonce: String,
    pub created_at: String,
    pub updated_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVaultEntryInput {
    pub project_id: i64,
    pub title: String,
    pub param_key: Option<String>,
    pub param_value: String,
    pub notes: Option<String>,
    pub url: Option<String>,
    pub category: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct DecryptedVaultEntry {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub param_key: Option<String>,
    pub param_value: String,
    pub notes: Option<String>,
    pub url: Option<String>,
    pub category: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Generate a random salt
fn generate_salt() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

/// Hash a master password using Argon2
#[tauri::command]
pub fn vault_hash_password(password: String) -> Result<(String, String), String> {
    hash_password(&password)
}

/// Verify master password for a project
#[tauri::command]
pub async fn vault_verify_master(
    master_password: String,
    password_hash: String,
) -> Result<bool, String> {
    verify_password(&master_password, &password_hash)
}

/// Encrypt and prepare vault entry data
#[tauri::command]
pub async fn vault_encrypt_entry(
    param_value: String,
    notes: Option<String>,
    master_password: String,
) -> Result<(String, String, Option<String>, Option<String>, String), String> {
    // Generate a unique salt for this entry
    let salt = generate_salt();

    // Encrypt param_value
    let (encrypted_value, value_nonce) = encrypt_data(&param_value, &master_password, &salt)?;

    // Encrypt notes if provided
    let (encrypted_notes, notes_nonce) = if let Some(notes_text) = notes {
        let (enc, nonce) = encrypt_data(&notes_text, &master_password, &salt)?;
        (Some(enc), Some(nonce))
    } else {
        (None, None)
    };

    // For simplicity, we'll use the same nonce field for both
    // In production, you might want separate nonce fields
    let combined_nonce = if let Some(nn) = notes_nonce {
        format!("{}|{}", value_nonce, nn)
    } else {
        value_nonce
    };

    Ok((
        encrypted_value,
        combined_nonce,
        encrypted_notes,
        None, // notes_nonce is combined
        salt,
    ))
}

/// Decrypt vault entry data
#[tauri::command]
pub async fn vault_decrypt_entry(
    encrypted_value: String,
    nonce: String,
    encrypted_notes: Option<String>,
    salt: String,
    master_password: String,
) -> Result<(String, Option<String>), String> {
    // Split nonce if it contains both value and notes nonce
    let nonce_parts: Vec<&str> = nonce.split('|').collect();
    let value_nonce = nonce_parts[0];

    // Decrypt param_value
    let param_value = decrypt_data(&encrypted_value, value_nonce, &master_password, &salt)?;

    // Decrypt notes if provided
    let notes = if let Some(enc_notes) = encrypted_notes {
        if nonce_parts.len() > 1 {
            let notes_nonce = nonce_parts[1];
            Some(decrypt_data(
                &enc_notes,
                notes_nonce,
                &master_password,
                &salt,
            )?)
        } else {
            None
        }
    } else {
        None
    };

    Ok((param_value, notes))
}

/// Generate a random password
#[tauri::command]
pub fn vault_generate_password(
    length: usize,
    include_uppercase: bool,
    include_lowercase: bool,
    include_numbers: bool,
    include_symbols: bool,
) -> Result<String, String> {
    if length == 0 || length > 128 {
        return Err("Password length must be between 1 and 128".to_string());
    }

    let mut charset = String::new();

    if include_lowercase {
        charset.push_str("abcdefghijklmnopqrstuvwxyz");
    }
    if include_uppercase {
        charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if include_numbers {
        charset.push_str("0123456789");
    }
    if include_symbols {
        charset.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }

    if charset.is_empty() {
        return Err("At least one character type must be selected".to_string());
    }

    let charset_bytes: Vec<char> = charset.chars().collect();
    let mut rng = rand::thread_rng();

    let password: String = (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..charset_bytes.len());
            charset_bytes[idx]
        })
        .collect();

    Ok(password)
}
