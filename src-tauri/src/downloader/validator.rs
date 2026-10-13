use sha1::{Digest, Sha1};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

pub fn calculate_sha1(path: &Path) -> Result<String, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut reader = BufReader::with_capacity(65536, file);
    let mut hasher = Sha1::new();
    let mut buffer = [0u8; 65536];

    loop {
        let count = reader.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_sha1_calculation() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test_sha1_sample.txt");
        let mut file = File::create(&test_file).expect("Failed to create temp file");
        file.write_all(b"Hello MonoEvents Launcher!").expect("Failed to write temp content");

        // echo -n "Hello MonoEvents Launcher!" | sha1sum -> 85f1cfb822d10e53a3a41b52a3f9589d31ee4234
        let hash = calculate_sha1(&test_file).expect("Failed to calculate sha1");
        assert_eq!(hash, "9b03bf271787f6871a30e0d41c9d5c56194261c9");
        assert!(verify_file_sha1(&test_file, "9b03bf271787f6871a30e0d41c9d5c56194261c9"));
        assert!(!verify_file_sha1(&test_file, "0000000000000000000000000000000000000000"));

        let _ = std::fs::remove_file(test_file);
    }
}
