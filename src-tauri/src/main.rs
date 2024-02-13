// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{
    env::temp_dir,
    fs::File,
    io::Write,
    path::PathBuf,
    process::{Command, Stdio},
    time::Duration,
};

use serde::Deserialize;
use tauri::WindowEvent;
use ts_rs::TS;
use wait_timeout::ChildExt;

#[derive(Deserialize, TS)]
#[ts(export)]
enum CommandType {
    Node,
    Python,
    Deno,
}

fn create_temp_file(name: &str, contents: &str) -> PathBuf {
    let mut path = temp_dir().join("script-runner.txt");
    path.set_file_name(name);
    println!("{}", path.to_string_lossy());
    let mut file: File = File::create(&path).expect("Couldn't create temp file");

    file.write_all(contents.as_bytes())
        .expect("Couldn't write input in");

    path
}

fn do_command(
    command: &mut Command,
    code: PathBuf,
    input_string: &str,
    timeout: Duration,
) -> Result<String, String> {
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .arg(code.as_os_str())
        .spawn()
        .map_err(|_| String::from("Couldn't spawn command."))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input_string.as_bytes())
            .map_err(|_| String::from("Couldn't write input in"))?;
    }

    child
        .wait_timeout(timeout)
        .map_err(|_| String::from("Something unexpected happened during execution."))?
        .ok_or_else(|| String::from("Execution Timeout..."))?;

    let out = child
        .wait_with_output()
        .map_err(|_| String::from("Something unexpected happened during output"))?;

    match out.status.code() {
        Some(0) => String::from_utf8(out.stdout).map_err(|_| {
            String::from(
                "Something unexpected happened with script-runner. Error: unexpected stdout output",
            )
        }),
        _ => String::from_utf8(out.stderr).map_err(|_| {
            String::from(
                "Something unexpected happened with script-runner. Error: unexpected stderr output",
            )
        }),
    }
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command(async)]
fn run_command(language: CommandType, code: &str, input: &str) -> Result<String, String> {
    match language {
        CommandType::Node => do_command(
            &mut Command::new("node"),
            create_temp_file("script-runner-code.js", code),
            input,
            Duration::from_secs(7),
        ),
        CommandType::Python => do_command(
            &mut Command::new("python"),
            create_temp_file("script-runner-code.py", code),
            input,
            Duration::from_secs(10),
        ),
        CommandType::Deno => do_command(
            &mut Command::new("deno").arg("run"),
            create_temp_file("script-runner-code.ts", code),
            input,
            Duration::from_secs(10),
        ),
    }
}

fn main() {
    tauri::Builder::default()
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                std::thread::sleep(std::time::Duration::from_nanos(1));
            }
        })
        .invoke_handler(tauri::generate_handler![run_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
