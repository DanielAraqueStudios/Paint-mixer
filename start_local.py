"""
Paint Mixer — localhost launcher
Run from the repo root: py -u start_local.py
"""

import os, socket, subprocess, sys, time, webbrowser, io
from pathlib import Path

# Unbuffered UTF-8 output — works with py, python, or direct & call
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)

ROOT = Path(__file__).parent.resolve()
API  = ROOT / "api"
WEB  = ROOT / "web"
URL  = "http://localhost:4200"

# ── helpers ──────────────────────────────────────────────────────────────────

def ok(msg=""):   print(f"  \033[32m✔\033[0m  {msg}", flush=True)
def err(msg=""):  print(f"  \033[31m✘\033[0m  {msg}", flush=True)
def info(msg=""):  print(f"  \033[33m→\033[0m  {msg}", flush=True)

def load_env(path: Path) -> dict:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def audit_env():
    """Print all env values relevant to startup (no secrets shown in full)."""
    print("\n  --- environment audit ---")
    env_root = load_env(ROOT / ".env")
    env_api  = load_env(API  / ".env")
    merged   = {**env_root, **env_api}

    for key in ["DATABASE_URL", "MQTT_URL"]:
        val = merged.get(key, "<NOT SET>")
        # mask password portion
        display = val
        if "@" in val:
            scheme, rest = val.split("//", 1)
            userinfo, hostpart = rest.split("@", 1)
            user = userinfo.split(":")[0]
            display = f"{scheme}//{user}:****@{hostpart}"
        status = "\033[32mOK\033[0m" if val != "<NOT SET>" else "\033[31mMISSING\033[0m"
        print(f"    {key:15s} [{status}] {display}")

    # check port number is correct
    db_url = merged.get("DATABASE_URL", "")
    if "localhost:" in db_url:
        port = db_url.split("localhost:")[1].split("/")[0]
        if port != "5433":
            err(f"DATABASE_URL uses port {port} but Docker maps PostgreSQL to 5433!")
        else:
            ok(f"DATABASE_URL port is 5433 ✓")

    print("  --- end audit ---\n")
    return {**os.environ, **merged}


def wait_for_port(host, port, label, timeout=30):
    print(f"  Waiting for {label} on {host}:{port}", end="", flush=True)
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            s = socket.create_connection((host, port), timeout=1)
            s.close()
            print(" OK", flush=True)
            return True
        except OSError:
            print(".", end="", flush=True)
            time.sleep(1)
    print(f" TIMED OUT after {timeout}s", flush=True)
    return False


def run(cmd, cwd=None, check=True):
    info(f"$ {cmd}")
    result = subprocess.run(cmd, cwd=str(cwd or ROOT), shell=True,
                            check=False, capture_output=True, text=True,
                            stdin=subprocess.DEVNULL)
    if result.stdout.strip():
        for line in result.stdout.strip().splitlines():
            print(f"     {line}")
    if result.returncode != 0:
        if result.stderr.strip():
            for line in result.stderr.strip().splitlines():
                err(line)
        if check:
            raise SystemExit(f"Command failed (exit {result.returncode}): {cmd}")
    return result


def test_fastapi(env):
    """Smoke-test: import main.py and verify no startup errors."""
    info("Testing FastAPI import...")
    script = API / "_importcheck.py"
    script.write_text(
        "import sys\n"
        "sys.path.insert(0, '.')\n"
        "import main\n"
        "print('import OK')\n"
    )
    result = subprocess.run(
        "py _importcheck.py", shell=True, capture_output=True, text=True,
        cwd=str(API), env=env, stdin=subprocess.DEVNULL
    )
    script.unlink(missing_ok=True)
    if "import OK" in result.stdout:
        ok("FastAPI main.py imports cleanly")
        return True
    err("FastAPI import failed:")
    for line in result.stderr.strip().splitlines():
        err(f"  {line}")
    return False


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    print("\n\033[1m=== Paint Mixer — localhost startup ===\033[0m\n")

    # ── STEP 0: env audit ─────────────────────────────────────────────────────
    print("[0/4] Auditing environment...")
    merged_env = audit_env()

    # ── STEP 1: Docker ────────────────────────────────────────────────────────
    print("[1/4] Starting Docker containers...")
    run("docker compose up -d", cwd=ROOT)

    # ── STEP 2: PostgreSQL ────────────────────────────────────────────────────
    print("[2/4] Waiting for PostgreSQL (host port 5433)...")
    if not wait_for_port("localhost", 5433, "PostgreSQL"):
        err("PostgreSQL never became ready.")
        err("  Check: docker ps  →  is paint-postgres-1 Up?")
        err("  Check: docker-compose.yml ports  →  should be '5433:5432'")
        sys.exit(1)
    ok("PostgreSQL is accepting connections")

    # quick DB connection test
    info("Testing DB connection with SQLAlchemy...")
    db_script = API / "_dbcheck.py"
    db_url = merged_env.get("DATABASE_URL", "")
    db_script.write_text(
        f"from sqlalchemy import create_engine, text\n"
        f"e = create_engine({db_url!r})\n"
        f"e.connect().execute(text('select 1'))\n"
        f"print('DB OK')\n"
    )
    db_test = subprocess.run(
        "py _dbcheck.py", shell=True, capture_output=True, text=True,
        env=merged_env, stdin=subprocess.DEVNULL, cwd=str(API)
    )
    db_script.unlink(missing_ok=True)
    if "DB OK" in db_test.stdout:
        ok("Database connection successful")
    else:
        err(f"Database connection FAILED")
        for line in db_test.stderr.strip().splitlines():
            err(f"  {line}")
        err("  Fix DATABASE_URL in .env — check host, port (5433), user, password, dbname")

    # ── STEP 3: FastAPI ───────────────────────────────────────────────────────
    print("[3/4] Starting FastAPI backend...")
    if not test_fastapi(merged_env):
        err("FastAPI failed to import — fix errors above before continuing")
        sys.exit(1)

    api_proc = subprocess.Popen(
        "py -m uvicorn main:app --reload --port 8000",
        cwd=str(API), shell=True, env=merged_env,
        creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0,
    )

    if not wait_for_port("localhost", 8000, "FastAPI", timeout=15):
        err("FastAPI did not start — check the FastAPI console window for errors")
        sys.exit(1)
    ok("FastAPI is up at http://localhost:8000/docs")

    # ── STEP 4: Angular ───────────────────────────────────────────────────────
    print("[4/4] Starting Angular dev server...")

    # Skip if already running
    try:
        s = socket.create_connection(("localhost", 4200), timeout=1)
        s.close()
        ok("Angular already running on port 4200 — skipping start")
        web_proc = None
    except OSError:
        web_proc = subprocess.Popen(
            "npm run start",
            cwd=str(WEB), shell=True,
            creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0,
        )
        info("Angular is compiling — waiting for port 4200 (up to 3 min)...")
        if not wait_for_port("localhost", 4200, "Angular", timeout=180):
            err("Angular did not start in time — check the Angular console window for errors")
            sys.exit(1)
        ok(f"Angular is up at {URL}")

    print("\n\033[1m=== All services running ===\033[0m")
    ok(f"Web UI  → {URL}")
    ok(f"API     → http://localhost:8000/docs")
    ok(f"MQTT    → mqtt://localhost:1883")
    ok(f"DB      → postgresql://localhost:5433/paintmixer")
    print("\nPress Ctrl+C to stop (Docker keeps running).\n")

    try:
        if web_proc:
            web_proc.wait()
        else:
            api_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping...")
        if web_proc:
            web_proc.terminate()
        api_proc.terminate()


if __name__ == "__main__":
    main()
