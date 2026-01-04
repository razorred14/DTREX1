use std::path::Path;
use std::process::Command;

/// Convert PEM cert+key to PKCS#12 using openssl CLI. Returns path to generated .p12 or error.
pub fn pem_to_pkcs12(cert_path: &str, key_path: &str, ca_path: Option<&str>, out_path: &str, password: Option<&str>) -> Result<(), String> {
    let mut cmd = Command::new("openssl");
    cmd.arg("pkcs12")
        .arg("-export")
        .arg("-out").arg(out_path)
        .arg("-inkey").arg(key_path)
        .arg("-in").arg(cert_path);
    if let Some(ca) = ca_path {
        cmd.arg("-certfile").arg(ca);
    }
    // Always set -passout to avoid interactive prompt
    let pass_arg = match password {
        Some(pass) => format!("pass:{}", pass),
        None => "pass:".to_string(), // empty password
    };
    cmd.arg("-passout").arg(pass_arg);
    let output = cmd.output().map_err(|e| format!("Failed to run openssl: {}", e))?;
    if !output.status.success() {
        return Err(format!("openssl failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    if !Path::new(out_path).exists() {
        return Err("PKCS#12 file not created".to_string());
    }
    Ok(())
}
