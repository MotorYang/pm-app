use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, OsRng},
};
use argon2::{
    Argon2,
    password_hash::{
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::RngCore,
    },
};
use base64::{Engine as _, engine::general_purpose};
use zeroize::Zeroize;

/// Hash a password using Argon2id
pub fn hash_password(password: &str) -> Result<(String, String), String> {
    let mut password_bytes = password.as_bytes().to_vec();

    // Generate a random salt
    let salt = SaltString::generate(&mut OsRng);

    // Argon2 with default params (Argon2id)
    let argon2 = Argon2::default();

    // Hash password to PHC string ($argon2id$v=19$...)
    let password_hash = argon2
        .hash_password(&password_bytes, &salt)
        .map_err(|e| format!("Failed to hash password: {}", e))?
        .to_string();

    // Zeroize password from memory
    password_bytes.zeroize();

    Ok((password_hash, salt.to_string()))
}

/// Verify a password against a hash
pub fn verify_password(password: &str, password_hash: &str) -> Result<bool, String> {
    let mut password_bytes = password.as_bytes().to_vec();

    let parsed_hash = PasswordHash::new(password_hash)
        .map_err(|e| format!("Failed to parse password hash: {}", e))?;

    let argon2 = Argon2::default();
    let result = argon2
        .verify_password(&password_bytes, &parsed_hash)
        .is_ok();

    // Zeroize password from memory
    password_bytes.zeroize();

    Ok(result)
}

/// Derive an encryption key from a password and salt using Argon2
fn derive_key(password: &str, salt: &str) -> Result<[u8; 32], String> {
    let mut password_bytes = password.as_bytes().to_vec();
    let salt_bytes = salt.as_bytes();

    let argon2 = Argon2::default();

    let mut key = [0u8; 32];
    argon2
        .hash_password_into(&password_bytes, salt_bytes, &mut key)
        .map_err(|e| format!("Failed to derive key: {}", e))?;

    // Zeroize password from memory
    password_bytes.zeroize();

    Ok(key)
}

/// Encrypt data using AES-256-GCM
/// Returns (encrypted_data_base64, nonce_base64)
pub fn encrypt_data(
    plaintext: &str,
    password: &str,
    salt: &str,
) -> Result<(String, String), String> {
    let mut plaintext_bytes = plaintext.as_bytes().to_vec();

    // Derive key from password
    let key = derive_key(password, salt)?;

    // Create cipher
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate a random nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt
    let ciphertext = cipher
        .encrypt(nonce, plaintext_bytes.as_ref())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Zeroize sensitive data
    plaintext_bytes.zeroize();

    // Encode to base64
    let encrypted_b64 = general_purpose::STANDARD.encode(&ciphertext);
    let nonce_b64 = general_purpose::STANDARD.encode(&nonce_bytes);

    Ok((encrypted_b64, nonce_b64))
}

/// Decrypt data using AES-256-GCM
pub fn decrypt_data(
    encrypted_b64: &str,
    nonce_b64: &str,
    password: &str,
    salt: &str,
) -> Result<String, String> {
    // Decode from base64
    let ciphertext = general_purpose::STANDARD
        .decode(encrypted_b64)
        .map_err(|e| format!("Failed to decode ciphertext: {}", e))?;

    let nonce_bytes = general_purpose::STANDARD
        .decode(nonce_b64)
        .map_err(|e| format!("Failed to decode nonce: {}", e))?;

    let nonce = Nonce::from_slice(&nonce_bytes);

    // Derive key from password
    let key = derive_key(password, salt)?;

    // Create cipher
    let cipher =
        Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Decrypt
    let plaintext_bytes = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // Convert to string
    let plaintext = String::from_utf8(plaintext_bytes)
        .map_err(|e| format!("Failed to convert to UTF-8: {}", e))?;

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let (hash, _salt) = hash_password(password).unwrap();

        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }
    #[test]
    fn test_decrypt_vault_entry_from_json() {
        let encrypted_password = "EWCVvQ41DUmIN6FfOxCHF1je2LTmofJA7BROgBwyYdI=";
        let nonce_b64 = "oTJl+L0SnCC3uWP2";
        let salt = "2beELqYsEaVYzc8eWsQ0xBT2HBMjMYqf";

        let master_password = "745700123"; // 保险箱主密码
        match decrypt_data(encrypted_password, nonce_b64, master_password, salt) {
            Ok(decrypted) => {
                println!("Decrypted password: {}", decrypted);
            }
            Err(e) => {
                println!("Failed to decrypt: {}", e);
            }
        }
    }


    #[test]
    fn test_encryption_decryption() {
        let plaintext = "Secret data!";
        let password = "my_password";
        let salt = "random_salt_12345";

        let (encrypted, nonce) = encrypt_data(plaintext, password, salt).unwrap();
        let decrypted = decrypt_data(&encrypted, &nonce, password, salt).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_decryption_with_wrong_password() {
        let plaintext = "Secret data!";
        let password = "my_password";
        let wrong_password = "wrong_password";
        let salt = "random_salt_12345";

        let (encrypted, nonce) = encrypt_data(plaintext, password, salt).unwrap();
        let result = decrypt_data(&encrypted, &nonce, wrong_password, salt);

        assert!(result.is_err());
    }
}
