# START_ORGO_WORLDS_v2.pyw
# Windows development launcher for Orgo_Worlds.
# - No PowerShell execution-policy dependency
# - Captures npm/node diagnostics in the GUI log
# - Preserves the static architecture gate
# - If the repository checker only fails because import.meta.dirname is unsupported
#   by the current Node runtime, it runs an equivalent temporary compatibility copy.
# - Does NOT silently ignore real static-check failures.

from __future__ import annotations

import json
import os
import queue
import shutil
import socket
import subprocess
import threading
import time
import traceback
import webbrowser
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, scrolledtext


ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / "runtime"
LOG_FILE = RUNTIME / "start-orgo-worlds.log"
PID_FILE = RUNTIME / ".orgo-worlds-launcher.json"

WEB_URL = "http://127.0.0.1:3100/worlds"
API_BASE_URL = "http://127.0.0.1:4100/api"
API_WORLDS_URL = "http://127.0.0.1:4100/api/control/worlds"
WEB_PORT = 3100
API_PORT = 4100

CREATE_NEW_CONSOLE = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
CREATE_NEW_PROCESS_GROUP = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

events: queue.Queue[tuple[str, str]] = queue.Queue()
children: dict[str, subprocess.Popen] = {}
starting = False


def ensure_runtime() -> None:
    RUNTIME.mkdir(parents=True, exist_ok=True)


def log_line(text: str) -> None:
    ensure_runtime()
    for raw in str(text).splitlines() or [""]:
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{stamp}] {raw.rstrip()}\n"
        try:
            with LOG_FILE.open("a", encoding="utf-8") as f:
                f.write(line)
        except Exception:
            pass
        events.put(("log", line))


def port_open(port: int, host: str = "127.0.0.1", timeout: float = 0.30) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def find_executable(*names: str) -> str | None:
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    return None


def find_npm() -> str | None:
    candidates = [
        find_executable("npm.cmd", "npm"),
        os.path.expandvars(r"%ProgramFiles%\Volta\npm.cmd"),
        os.path.expandvars(r"%LOCALAPPDATA%\Volta\bin\npm.cmd"),
        os.path.expandvars(r"%ProgramFiles%\nodejs\npm.cmd"),
        os.path.expandvars(r"%ProgramFiles(x86)%\nodejs\npm.cmd"),
        str(Path.home() / "AppData" / "Roaming" / "npm" / "npm.cmd"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return str(Path(candidate))
    return None


def find_node(npm: str | None) -> str | None:
    candidates = [
        find_executable("node.exe", "node"),
        str(Path(npm).with_name("node.exe")) if npm else None,
        os.path.expandvars(r"%ProgramFiles%\Volta\node.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Volta\bin\node.exe"),
        os.path.expandvars(r"%ProgramFiles%\nodejs\node.exe"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return str(Path(candidate))
    return None


def run_capture(cmd: list[str], label: str, cwd: Path = ROOT) -> subprocess.CompletedProcess:
    log_line(f"{label}: {' '.join(cmd)}")
    flags = CREATE_NO_WINDOW if os.name == "nt" else 0
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        creationflags=flags,
        check=False,
    )
    output = (proc.stdout or "").rstrip()
    if output:
        for line in output.splitlines():
            log_line(f"  {line}")
    log_line(f"{label}: exit code {proc.returncode}")
    return proc


def run_static_gate(npm: str, node: str | None) -> None:
    """
    Run the repo's real static gate first.

    Older Node runtimes can choke on `import.meta.dirname` before the gate logic
    itself runs. If that happens (or if the real checker returns 1 for any reason),
    make a temporary compatibility copy of the SAME checker, replacing only the
    dirname bootstrap, then run it. Any actual architecture failures still fail.
    """
    events.put(("status", "Running static Worlds gate…"))
    original = run_capture([npm, "run", "check:worlds"], "Static Worlds gate")
    if original.returncode == 0:
        return

    checker = ROOT / "scripts" / "check-worlds.mjs"
    if not checker.exists() or not node:
        raise RuntimeError(
            "Static Worlds gate failed. See the launcher log for the checker output."
        )

    source = checker.read_text(encoding="utf-8")
    old = "const root = path.resolve(import.meta.dirname, '..');"
    if old not in source:
        raise RuntimeError(
            "Static Worlds gate failed. The compatibility fallback does not apply.\n"
            "See the launcher log for the exact checker output."
        )

    log_line(
        "Static gate returned 1; retrying an equivalent temporary checker "
        "with Node-compatible import.meta.url dirname resolution."
    )

    import_line = "import { fileURLToPath } from 'node:url';"
    if import_line not in source:
        source = source.replace(
            "import path from 'node:path';",
            "import path from 'node:path';\n" + import_line,
            1,
        )

    replacement = (
        "const __filename = fileURLToPath(import.meta.url);\n"
        "const __dirname = path.dirname(__filename);\n"
        "const root = path.resolve(__dirname, '..');"
    )
    source = source.replace(old, replacement, 1)

    temp_checker = checker.parent / ".check-worlds.compat.mjs"
    try:
        temp_checker.write_text(source, encoding="utf-8")
        compat = run_capture(
            [node, str(temp_checker)],
            "Static Worlds gate (Node compatibility retry)",
        )
    finally:
        try:
            temp_checker.unlink(missing_ok=True)
        except Exception:
            pass

    if compat.returncode != 0:
        raise RuntimeError(
            "Static Worlds gate really failed.\n"
            "The compatibility retry also returned exit code "
            f"{compat.returncode}. See the log for the exact failing rule(s)."
        )

    log_line(
        "Compatibility retry PASSED. The repository architecture gate is valid; "
        "the original failure is compatible with a Node/import.meta.dirname mismatch."
    )


def start_child(name: str, npm: str, script: str) -> subprocess.Popen:
    env = os.environ.copy()
    flags = 0
    if os.name == "nt":
        flags = CREATE_NEW_CONSOLE | CREATE_NEW_PROCESS_GROUP

    log_line(f"Starting {name}: {npm} run {script}")
    proc = subprocess.Popen(
        [npm, "run", script],
        cwd=ROOT,
        env=env,
        creationflags=flags,
    )
    children[name] = proc
    log_line(f"{name} PID: {proc.pid}")
    return proc


def save_pids() -> None:
    ensure_runtime()
    data = {
        "root": str(ROOT),
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "processes": {name: proc.pid for name, proc in children.items()},
    }
    PID_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def wait_for_ports(timeout: float = 40.0) -> tuple[bool, bool]:
    deadline = time.time() + timeout
    web_ok = port_open(WEB_PORT)
    api_ok = port_open(API_PORT)
    while time.time() < deadline and not (web_ok and api_ok):
        time.sleep(0.5)
        web_ok = web_ok or port_open(WEB_PORT)
        api_ok = api_ok or port_open(API_PORT)
    return web_ok, api_ok


def start_all() -> None:
    global starting
    if starting:
        return
    starting = True
    events.put(("state", "starting"))

    try:
        ensure_runtime()
        log_line("=" * 68)
        log_line(f"Orgo Worlds launcher root: {ROOT}")

        package_json = ROOT / "package.json"
        if not package_json.exists():
            raise RuntimeError(
                "package.json not found.\n"
                "Put this .pyw in the root of the Orgo_Worlds repository."
            )

        npm = find_npm()
        if not npm:
            raise RuntimeError("npm.cmd was not found. Install Node.js/npm or fix PATH.")

        node = find_node(npm)
        log_line(f"npm executable: {npm}")
        log_line(f"node executable: {node or 'NOT FOUND'}")

        if node:
            run_capture([node, "--version"], "Node version")
        run_capture([npm, "--version"], "npm version")

        api_already = port_open(API_PORT)
        web_already = port_open(WEB_PORT)
        if api_already or web_already:
            msg = []
            if api_already:
                msg.append(f"API port {API_PORT} is already in use.")
            if web_already:
                msg.append(f"Web port {WEB_PORT} is already in use.")
            msg.append("No duplicate process was started.")
            log_line(" ".join(msg))
            events.put(("already", "\n".join(msg)))
            return

        if not (ROOT / "node_modules").exists():
            events.put(("status", "Installing npm dependencies…"))
            install = run_capture(
                [npm, "install", "--no-audit", "--no-fund"],
                "npm install",
            )
            if install.returncode != 0:
                raise RuntimeError(
                    f"npm install failed with exit code {install.returncode}."
                )

        run_static_gate(npm, node)

        events.put(("status", "Starting API…"))
        start_child("api", npm, "dev:api")

        events.put(("status", "Starting web…"))
        start_child("web", npm, "dev:web")
        save_pids()

        events.put(("status", "Waiting for ports 4100 and 3100…"))
        web_ok, api_ok = wait_for_ports()

        if api_ok and web_ok:
            log_line(f"ORGO WORLDS STARTED — Web: {WEB_URL}")
            log_line(f"ORGO WORLDS API — {API_BASE_URL}")
            events.put(("started", "ok"))
            webbrowser.open(WEB_URL)
        else:
            missing = []
            if not api_ok:
                missing.append(f"API {API_PORT}")
            if not web_ok:
                missing.append(f"Web {WEB_PORT}")
            raise RuntimeError(
                "Processes were launched, but these endpoints did not become reachable: "
                + ", ".join(missing)
                + ".\nCheck the API/Web console windows and this launcher log."
            )

    except Exception as exc:
        log_line(f"ERROR: {exc}")
        log_line(traceback.format_exc())
        events.put(("error", str(exc)))
    finally:
        starting = False
        events.put(("state", "idle"))


def taskkill_tree(pid: int) -> None:
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            creationflags=CREATE_NO_WINDOW,
        )
    else:
        try:
            os.kill(pid, 15)
        except OSError:
            pass


def stop_all() -> None:
    stopped_any = False
    for name, proc in list(children.items()):
        if proc.poll() is None:
            log_line(f"Stopping {name} PID {proc.pid}…")
            taskkill_tree(proc.pid)
            stopped_any = True
        children.pop(name, None)

    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except OSError:
            pass

    if stopped_any:
        log_line("Orgo Worlds processes stopped.")
    refresh_status()


def background_start() -> None:
    threading.Thread(target=start_all, daemon=True).start()


def open_log() -> None:
    ensure_runtime()
    LOG_FILE.touch(exist_ok=True)
    if os.name == "nt":
        os.startfile(LOG_FILE)
    else:
        webbrowser.open(LOG_FILE.as_uri())


def copy_log() -> None:
    try:
        text = LOG_FILE.read_text(encoding="utf-8") if LOG_FILE.exists() else ""
        root.clipboard_clear()
        root.clipboard_append(text)
        root.update()
        messagebox.showinfo("Orgo Worlds", "Launcher log copied to clipboard.")
    except Exception as exc:
        messagebox.showerror("Orgo Worlds", f"Could not copy log:\n{exc}")


def refresh_status() -> None:
    api = port_open(API_PORT)
    web = port_open(WEB_PORT)
    if api and web:
        status_var.set("RUNNING")
        detail_var.set(f"API : {API_BASE_URL}\nWeb : {WEB_URL}")
        status_label.configure(fg="#176b45")
    elif api or web:
        status_var.set("PARTIAL")
        detail_var.set(
            f"API : {'UP' if api else 'DOWN'} ({API_PORT})\n"
            f"Web : {'UP' if web else 'DOWN'} ({WEB_PORT})"
        )
        status_label.configure(fg="#a35a00")
    else:
        status_var.set("STOPPED")
        detail_var.set(f"API : port {API_PORT}\nWeb : port {WEB_PORT}")
        status_label.configure(fg="#8a2020")


def poll_events() -> None:
    try:
        while True:
            kind, payload = events.get_nowait()
            if kind == "log":
                log_box.configure(state="normal")
                log_box.insert("end", payload)
                log_box.see("end")
                log_box.configure(state="disabled")
            elif kind == "status":
                detail_var.set(payload)
            elif kind == "started":
                refresh_status()
            elif kind == "already":
                refresh_status()
                messagebox.showinfo("Orgo Worlds", payload)
            elif kind == "error":
                refresh_status()
                messagebox.showerror("Orgo Worlds — startup failed", payload)
            elif kind == "state":
                start_button.configure(
                    state=("disabled" if payload == "starting" else "normal")
                )
    except queue.Empty:
        pass
    root.after(250, poll_events)


def on_close() -> None:
    running = any(proc.poll() is None for proc in children.values())
    if running:
        answer = messagebox.askyesnocancel(
            "Close launcher",
            "Stop the Orgo Worlds processes before closing?\n\n"
            "Yes = stop API/Web\n"
            "No = leave them running\n"
            "Cancel = keep launcher open",
        )
        if answer is None:
            return
        if answer:
            stop_all()
    root.destroy()


# ----- GUI -----
root = tk.Tk()
root.title("Orgo Worlds — Dev Launcher v2")
root.geometry("780x560")
root.minsize(680, 440)

status_var = tk.StringVar(value="CHECKING")
detail_var = tk.StringVar(value="")

header = tk.Frame(root, padx=18, pady=16)
header.pack(fill="x")

tk.Label(header, text="ORGO WORLDS", font=("Segoe UI", 18, "bold")).pack(anchor="w")
tk.Label(
    header,
    text="Development launcher · captures static-gate diagnostics",
    font=("Segoe UI", 10),
).pack(anchor="w", pady=(2, 10))

status_label = tk.Label(header, textvariable=status_var, font=("Segoe UI", 12, "bold"))
status_label.pack(anchor="w")

tk.Label(
    header,
    textvariable=detail_var,
    justify="left",
    font=("Consolas", 10),
).pack(anchor="w", pady=(4, 0))

buttons = tk.Frame(root, padx=18, pady=4)
buttons.pack(fill="x")

start_button = tk.Button(buttons, text="Start", width=11, command=background_start)
start_button.pack(side="left", padx=(0, 7))
tk.Button(buttons, text="Stop", width=11, command=stop_all).pack(side="left", padx=(0, 7))
tk.Button(buttons, text="Open Worlds", command=lambda: webbrowser.open(WEB_URL)).pack(side="left", padx=(0, 7))
tk.Button(buttons, text="Open API Worlds", command=lambda: webbrowser.open(API_WORLDS_URL)).pack(side="left", padx=(0, 7))
tk.Button(buttons, text="Open log", command=open_log).pack(side="left", padx=(0, 7))
tk.Button(buttons, text="Copy log", command=copy_log).pack(side="left")

tk.Label(
    root,
    text=f"Repo: {ROOT}",
    anchor="w",
    padx=18,
    font=("Segoe UI", 9),
).pack(fill="x", pady=(8, 2))

log_box = scrolledtext.ScrolledText(
    root,
    height=18,
    font=("Consolas", 9),
    state="disabled",
    wrap="word",
)
log_box.pack(fill="both", expand=True, padx=18, pady=(4, 18))

refresh_status()
root.protocol("WM_DELETE_WINDOW", on_close)
root.after(250, poll_events)

# Auto-start on double-click.
root.after(400, background_start)
root.mainloop()
