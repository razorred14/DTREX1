use sha2::{Digest, Sha256};
use std::fs;

/// Hash a contract file using SHA-256
pub fn hash_contract_file(path: &str) -> Result<String, std::io::Error> {
    let data = fs::read(path)?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let result = hasher.finalize();
    Ok(hex::encode(result))
}

/// Hash contract content directly
pub fn hash_contract_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Hash bytes
pub fn hash_bytes(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    hex::encode(result)
}

/// Verify a hash matches the content
pub fn verify_hash(content: &str, expected_hash: &str) -> bool {
    let computed_hash = hash_contract_content(content);
    computed_hash == expected_hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_content() {
        let content = "test contract";
        let hash = hash_contract_content(content);

        // SHA256 produces 64 character hex string
        assert_eq!(hash.len(), 64);

        // Hashing same content produces same hash
        let hash2 = hash_contract_content(content);
        assert_eq!(hash, hash2);
    }

    #[test]
    fn test_verify_hash() {
        let content = "contract terms";
        let hash = hash_contract_content(content);

        assert!(verify_hash(content, &hash));
        assert!(!verify_hash("different content", &hash));
    }

    #[test]
    fn test_hash_bytes() {
        let data = b"test data";
        let hash = hash_bytes(data);
        assert_eq!(hash.len(), 64);
    }
}
