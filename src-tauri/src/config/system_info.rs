use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SystemMemoryInfo {
    pub total_ram_gb: u32,
    pub available_ram_gb: u32,
    pub recommended_ram_gb: u32,
}

pub fn get_system_memory() -> SystemMemoryInfo {
    let mut sys = System::new();
    sys.refresh_memory();

    let total_bytes = sys.total_memory();
    let available_bytes = sys.available_memory();

    // Round bytes to nearest GB
    let total_ram_gb = ((total_bytes as f64) / (1024.0 * 1024.0 * 1024.0)).round() as u32;
    let available_ram_gb = ((available_bytes as f64) / (1024.0 * 1024.0 * 1024.0)).round() as u32;

    let total_ram_gb = total_ram_gb.max(2);
    let available_ram_gb = available_ram_gb.max(1);

    // Recommended RAM for Forge 1.20.1:
    // If system has >= 16 GB -> 8 GB
    // If system has >= 8 GB -> 6 GB
    // Otherwise -> 4 GB (or max available minus 1)
    let recommended_ram_gb = if total_ram_gb >= 16 {
        8
    } else if total_ram_gb >= 8 {
        6
    } else {
        4.min(total_ram_gb.saturating_sub(1)).max(2)
    };

    SystemMemoryInfo {
        total_ram_gb,
        available_ram_gb,
        recommended_ram_gb,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_memory_detection() {
        let mem = get_system_memory();
        assert!(mem.total_ram_gb >= 2, "Total RAM should be at least 2 GB");
        assert!(mem.available_ram_gb >= 1, "Available RAM should be at least 1 GB");
        assert!(mem.recommended_ram_gb >= 2, "Recommended RAM should be at least 2 GB");
        assert!(mem.recommended_ram_gb <= mem.total_ram_gb, "Recommended RAM cannot exceed total RAM");
    }
}
