use sha1::{Digest, Sha1};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

pub fn calculate_sha1(path: &Path) -> Result<String, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha1::new();
    let mut buffer = [0u8; 8192];

    loop {
        let count = reader.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

pub fn verify_file_sha1(path: &Path, expected_hash: &str) -> bool {
    if !path.exists() {
        return false;
    }
    match calculate_sha1(path) {
        Ok(hash) => hash.eq_ignore_ascii_case(expected_hash),
        Err(_) => false,
    }
}
