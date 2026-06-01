"""
Paint Mixer — localhost shutdown
Stops FastAPI (port 8000), Angular (port 4200), and Docker containers.
Run from the repo root: py stop_local.py

test
"""

import subprocess, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)

ROOT = Path(__file__).parent


def kill_port(port: int, label: str):
    result = subprocess.run(
        f'netstat -ano | findstr ":{port} "',
        shell=True, capture_output=True, text=True
    )
    pids = set()
    for line in result.stdout.splitlines():
        parts = line.split()
        if parts and parts[-1].isdigit():
            pids.add(parts[-1])
    if pids:
        for pid in pids:
            subprocess.run(f"taskkill /PID {pid} /F", shell=True, capture_output=True)
        print(f"  \033[32m✔\033[0m  {label} (port {port}) — killed PID(s) {', '.join(pids)}")
    else:
        print(f"  \033[33m·\033[0m  {label} (port {port}) — not running")


def main():
    print("\n\033[1m=== Paint Mixer — shutdown ===\033[0m\n")

    print("[1/3] Stopping Angular dev server (port 4200)...")
    kill_port(4200, "Angular")

    print("[2/3] Stopping FastAPI backend (port 8000)...")
    kill_port(8000, "FastAPI")

    print("[3/3] Stopping Docker containers (PostgreSQL + Mosquitto)...")
    result = subprocess.run(
        "docker compose down", cwd=str(ROOT),
        shell=True, capture_output=True, text=True
    )
    if result.returncode == 0:
        print("  \033[32m✔\033[0m  Docker containers stopped")
    else:
        print("  \033[33m·\033[0m  Docker already stopped or not running")

    print("\n\033[1m=== All services stopped ===\033[0m\n")


if __name__ == "__main__":
    main()
