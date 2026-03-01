// Import crates
use std::io::{self, Read};
use std::process::{Command, Stdio};
use std::fs::File;
use std::io::Write;
use serde_json::json;
use std::env;

// Main function 
fn main() {
    // Read input code from stdin
    let mut code = String::new();
    io::stdin()
        .read_to_string(&mut code)
        .expect("Failed to read from stdin");

    // Generate unique temp file using process ID and timestamp
    let pid = std::process::id();
    let timestamp = chrono::Utc::now().timestamp_millis();
    let file_path = format!("/tmp/codebento_{}_{}.py", pid, timestamp);

    // Write code to temp file
    let mut file = File::create(&file_path).expect("Failed to create temp file");
    file.write_all(code.as_bytes())
        .expect("Failed to write to temp file");

    // Run python process
    let output_result = Command::new("python3")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    // Prepare JSON output
    let result = match output_result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            json!({
                "stdout": stdout,
                "stderr": stderr
            })
        }
        Err(e) => {
            json!({
                "stdout": "",
                "stderr": format!("Failed to execute Python process: {}", e)
            })
        }
    };

    // Print JSON output
    println!("{}", result);

    // Cleanup temp file (ignore errors)
    let _ = std::fs::remove_file(&file_path);
}