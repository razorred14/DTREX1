use std::fs;
use std::path::Path;

/// Store a contract file
pub fn store_contract_file(
    content: &[u8],
    filename: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let storage_dir = "storage/contracts";
    fs::create_dir_all(storage_dir)?;

    let file_path = format!("{}/{}", storage_dir, filename);
    fs::write(&file_path, content)?;

    tracing::info!("Stored contract file: {}", file_path);

    Ok(file_path)
}

/// Load a contract file
pub fn load_contract_file(file_path: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    if !Path::new(file_path).exists() {
        return Err(format!("File not found: {}", file_path).into());
    }

    let content = fs::read(file_path)?;
    Ok(content)
}

/// Delete a contract file
pub fn delete_contract_file(file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    if Path::new(file_path).exists() {
        fs::remove_file(file_path)?;
        tracing::info!("Deleted contract file: {}", file_path);
    }
    Ok(())
}

/// List all contract files
pub fn list_contract_files() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let storage_dir = "storage/contracts";

    if !Path::new(storage_dir).exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(storage_dir)?;
    let mut files = vec![];

    for entry in entries {
        let entry = entry?;
        if entry.path().is_file() {
            if let Some(filename) = entry.path().file_name() {
                files.push(filename.to_string_lossy().to_string());
            }
        }
    }

    Ok(files)
}

/// Store contract metadata
pub fn store_contract_metadata(
    contract_id: &str,
    metadata: &serde_json::Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let storage_dir = "storage/metadata";
    fs::create_dir_all(storage_dir)?;

    let metadata_path = format!("{}/{}.json", storage_dir, contract_id);
    let metadata_str = serde_json::to_string_pretty(metadata)?;
    fs::write(&metadata_path, metadata_str)?;

    tracing::info!("Stored contract metadata: {}", metadata_path);

    Ok(())
}

/// Load contract metadata
pub fn load_contract_metadata(
    contract_id: &str,
) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let metadata_path = format!("storage/metadata/{}.json", contract_id);

    if !Path::new(&metadata_path).exists() {
        return Err(format!("Metadata not found for contract: {}", contract_id).into());
    }

    let content = fs::read_to_string(&metadata_path)?;
    let metadata: serde_json::Value = serde_json::from_str(&content)?;

    Ok(metadata)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_and_load_file() {
        let content = b"test contract content";
        let filename = "test_contract.txt";

        let result = store_contract_file(content, filename);
        assert!(result.is_ok());

        let file_path = result.unwrap();
        let loaded = load_contract_file(&file_path);
        assert!(loaded.is_ok());
        assert_eq!(loaded.unwrap(), content);

        // Cleanup
        let _ = delete_contract_file(&file_path);
    }
}
