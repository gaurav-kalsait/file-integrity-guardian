# ============================================
# FILE INTEGRITY GUARDIAN — Python Backend
# File: backend/app.py
# Author: Gaurav Kalsait
#
# What this does:
# - Reads REAL files on your computer
# - Computes SHA-256 and MD5 hashes using hashlib
# - Stores a trusted baseline of hashes
# - Compares current hashes vs baseline to detect tampering
# - Serves everything via REST API for React frontend
# ============================================

import os
import json
import hashlib
import platform
from datetime import datetime
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1: APP SETUP
# Creates the Flask server and enables CORS
# so React (port 5173) can talk to Flask (port 5000)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2: DATA STORAGE
# All data is saved as JSON files in fig_data/ folder
# This folder is auto-created when the server starts
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fig_data")
BASELINE_FILE = os.path.join(DATA_DIR, "baseline.json")
ALERTS_FILE = os.path.join(DATA_DIR, "alerts.json")
HISTORY_FILE = os.path.join(DATA_DIR, "scan_history.json")

# Create data folder if it doesn't exist
os.makedirs(DATA_DIR, exist_ok=True)


def load_json(filepath, default=None):
    """Load data from a JSON file. Returns default if file doesn't exist."""
    if default is None:
        default = {}
    try:
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return default


def save_json(filepath, data):
    """Save data to a JSON file."""
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


def add_alert(alert_type, message):
    """Add a security alert to the alerts log.
    Types: 'info', 'warning', 'danger'
    """
    alerts = load_json(ALERTS_FILE, [])
    alerts.append({
        "time": datetime.now().isoformat(),
        "type": alert_type,
        "msg": message,
    })
    save_json(ALERTS_FILE, alerts)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3: HASHING ENGINE
# The core of the tool — reads files and computes hashes
#
# How hashing works:
# 1. Open the file in binary mode (rb)
# 2. Read it in 8KB chunks (handles large files)
# 3. Feed each chunk to the hash algorithm
# 4. Output a fixed-length hex string (fingerprint)
#
# If even 1 byte changes, the entire hash changes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def compute_sha256(filepath):
    """Compute SHA-256 hash of a file.
    SHA-256 outputs a 64-character hex string.
    This is the industry standard for file integrity.
    """
    sha256 = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except PermissionError:
        return "ERROR:PERMISSION_DENIED"
    except FileNotFoundError:
        return "ERROR:FILE_NOT_FOUND"
    except OSError as e:
        return f"ERROR:{str(e)}"


def compute_md5(filepath):
    """Compute MD5 hash of a file.
    MD5 outputs a 32-character hex string.
    Faster but less secure than SHA-256.
    """
    md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                md5.update(chunk)
        return md5.hexdigest()
    except PermissionError:
        return "ERROR:PERMISSION_DENIED"
    except FileNotFoundError:
        return "ERROR:FILE_NOT_FOUND"
    except OSError as e:
        return f"ERROR:{str(e)}"


def get_file_metadata(filepath):
    """Get file metadata: size, permissions, timestamps.
    Uses os.stat() to read file properties without opening the file.
    """
    try:
        st = os.stat(filepath)
        return {
            "exists": True,
            "size": st.st_size,
            "permissions": oct(st.st_mode)[-3:],
            "last_modified": datetime.fromtimestamp(st.st_mtime).isoformat(),
            "last_accessed": datetime.fromtimestamp(st.st_atime).isoformat(),
            "created": datetime.fromtimestamp(st.st_ctime).isoformat(),
        }
    except FileNotFoundError:
        return {"exists": False, "error": "File not found"}
    except PermissionError:
        return {"exists": True, "error": "Permission denied", "size": 0, "permissions": "???"}
    except OSError as e:
        return {"exists": True, "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4: FILES TO MONITOR
# Auto-detects your OS and picks the right files
# Windows → system32 DLLs, executables, config files
# Linux   → /etc, /usr/bin, /boot critical files
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_monitored_files():
    """Return list of critical system files based on OS."""
    system = platform.system()

    if system == "Windows":
        return [
            {"path": r"C:\Windows\System32\cmd.exe",         "type": "binary", "risk": "critical", "desc": "Command Prompt"},
            {"path": r"C:\Windows\System32\kernel32.dll",     "type": "binary", "risk": "critical", "desc": "Windows kernel library"},
            {"path": r"C:\Windows\System32\ntdll.dll",        "type": "binary", "risk": "critical", "desc": "NT Layer DLL"},
            {"path": r"C:\Windows\System32\svchost.exe",      "type": "binary", "risk": "critical", "desc": "Service Host process"},
            {"path": r"C:\Windows\System32\advapi32.dll",     "type": "binary", "risk": "critical", "desc": "Advanced API library"},
            {"path": r"C:\Windows\System32\secur32.dll",      "type": "binary", "risk": "critical", "desc": "Security library"},
            {"path": r"C:\Windows\System32\user32.dll",       "type": "binary", "risk": "high",     "desc": "User interface DLL"},
            {"path": r"C:\Windows\System32\taskmgr.exe",      "type": "binary", "risk": "high",     "desc": "Task Manager"},
            {"path": r"C:\Windows\System32\notepad.exe",      "type": "binary", "risk": "medium",   "desc": "Notepad editor"},
            {"path": r"C:\Windows\System32\calc.exe",         "type": "binary", "risk": "medium",   "desc": "Calculator app"},
            {"path": r"C:\Windows\explorer.exe",              "type": "binary", "risk": "high",     "desc": "Windows Explorer"},
            {"path": r"C:\Windows\regedit.exe",               "type": "binary", "risk": "critical", "desc": "Registry Editor"},
            {"path": r"C:\Windows\System32\netsh.exe",        "type": "binary", "risk": "high",     "desc": "Network shell utility"},
            {"path": r"C:\Windows\System32\drivers\etc\hosts","type": "config", "risk": "high",     "desc": "Host mappings"},
            {"path": r"C:\Windows\System32\drivers\etc\services","type": "config","risk": "medium",  "desc": "Network services"},
            {"path": r"C:\Windows\win.ini",                   "type": "config", "risk": "medium",   "desc": "Windows init config"},
            {"path": r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe","type":"binary","risk":"critical","desc":"PowerShell"},
            {"path": r"C:\Windows\System32\wbem\WMIC.exe",    "type": "binary", "risk": "high",     "desc": "WMI Command-line"},
            {"path": r"C:\Windows\System32\mstsc.exe",        "type": "binary", "risk": "high",     "desc": "Remote Desktop Client"},
            {"path": r"C:\Windows\System32\dllhost.exe",      "type": "binary", "risk": "high",     "desc": "COM Surrogate"},
            {"path": r"C:\Users\gauravk\Documents\Test-File.txt", "type": "binary", "risk": "high",     "desc": "COM Surrogate"},
        ]
    else:
        return [
            {"path": "/etc/passwd",             "type": "config", "risk": "critical", "desc": "User account info"},
            {"path": "/etc/shadow",             "type": "config", "risk": "critical", "desc": "Password hashes"},
            {"path": "/etc/hosts",              "type": "config", "risk": "high",     "desc": "Host mappings"},
            {"path": "/etc/ssh/sshd_config",    "type": "config", "risk": "high",     "desc": "SSH daemon config"},
            {"path": "/etc/sudoers",            "type": "config", "risk": "critical", "desc": "Sudo permissions"},
            {"path": "/etc/crontab",            "type": "config", "risk": "high",     "desc": "Scheduled tasks"},
            {"path": "/etc/resolv.conf",        "type": "config", "risk": "medium",   "desc": "DNS resolver"},
            {"path": "/etc/fstab",              "type": "config", "risk": "high",     "desc": "Filesystem table"},
            {"path": "/etc/pam.d/common-auth",  "type": "config", "risk": "critical", "desc": "PAM auth config"},
            {"path": "/etc/apt/sources.list",   "type": "config", "risk": "high",     "desc": "Package sources"},
            {"path": "/usr/bin/ssh",            "type": "binary", "risk": "critical", "desc": "SSH client binary"},
            {"path": "/usr/bin/sudo",           "type": "binary", "risk": "critical", "desc": "Sudo binary"},
            {"path": "/usr/sbin/sshd",          "type": "binary", "risk": "critical", "desc": "SSH server daemon"},
            {"path": "/bin/bash",               "type": "binary", "risk": "high",     "desc": "Bash shell"},
            {"path": "/bin/ls",                 "type": "binary", "risk": "medium",   "desc": "List directory"},
            {"path": "/boot/vmlinuz",           "type": "binary", "risk": "critical", "desc": "Linux kernel"},
            {"path": "/usr/lib/systemd/systemd","type": "binary", "risk": "critical", "desc": "Init system"},
            {"path": "/var/log/auth.log",       "type": "log",    "risk": "high",     "desc": "Auth log file"},
            {"path": "/var/log/syslog",         "type": "log",    "risk": "medium",   "desc": "System log"},
            {"path": "/etc/iptables/rules.v4",  "type": "config", "risk": "critical", "desc": "Firewall rules"},
        ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5: API ROUTES
# Each route = one endpoint the React frontend calls
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# --- GET /api/status ---
# Returns system info and whether baseline exists
@app.route("/api/status", methods=["GET"])
def get_status():
    baseline = load_json(BASELINE_FILE)
    return jsonify({
        "system": platform.system(),
        "hostname": platform.node(),
        "python_version": platform.python_version(),
        "initialized": len(baseline) > 0,
        "monitored_count": len(get_monitored_files()),
        "baseline_count": len(baseline),
        "timestamp": datetime.now().isoformat(),
    })


# --- GET /api/files ---
# Returns all monitored files with their current metadata
@app.route("/api/files", methods=["GET"])
def get_files():
    files = get_monitored_files()
    result = []
    for f in files:
        meta = get_file_metadata(f["path"])
        result.append({**f, **meta})
    return jsonify(result)


# --- POST /api/baseline/create ---
# Scans all files and saves their hashes as the trusted baseline
@app.route("/api/baseline/create", methods=["POST"])
def create_baseline():
    files = get_monitored_files()
    algo = request.json.get("algorithm", "SHA-256") if request.json else "SHA-256"
    baseline = {}
    scanned = 0
    errors = 0

    print(f"\n{'='*55}")
    print(f"  FILE INTEGRITY GUARDIAN — Creating Baseline")
    print(f"  Algorithm: {algo}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*55}\n")

    for f in files:
        path = f["path"]
        meta = get_file_metadata(path)

        if not meta.get("exists", False):
            print(f"  [SKIP] {path} — not found")
            errors += 1
            baseline[path] = {
                **f, "sha256": "N/A", "md5": "N/A",
                "status": "not_found", **meta,
                "baseline_created": datetime.now().isoformat(),
            }
            continue

        sha256 = compute_sha256(path)
        md5 = compute_md5(path)

        if sha256.startswith("ERROR"):
            errors += 1
            print(f"  [ERR]  {path} — {sha256}")
        else:
            scanned += 1
            print(f"  [OK]   {path}")
            print(f"         SHA-256: {sha256[:40]}...")

        baseline[path] = {
            **f, "sha256": sha256, "md5": md5,
            **meta, "baseline_created": datetime.now().isoformat(),
        }

    save_json(BASELINE_FILE, baseline)

    # Clear old alerts and history for fresh start
    save_json(ALERTS_FILE, [])
    save_json(HISTORY_FILE, [])

    add_alert("info", f"Baseline created: {scanned} files scanned, {errors} errors ({algo})")

    print(f"\n  Done: {scanned} scanned, {errors} errors")
    print(f"  Saved to: {BASELINE_FILE}\n")

    return jsonify({
        "success": True,
        "scanned": scanned,
        "errors": errors,
        "total": len(files),
        "algorithm": algo,
    })


# --- POST /api/scan ---
# Compares current file hashes against the baseline
@app.route("/api/scan", methods=["POST"])
def run_scan():
    baseline = load_json(BASELINE_FILE)

    if not baseline:
        return jsonify({"error": "No baseline found. Create one first."}), 400

    print(f"\n{'='*55}")
    print(f"  FILE INTEGRITY GUARDIAN — Running Scan")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*55}\n")

    results = []
    modified_count = 0
    intact_count = 0
    deleted_count = 0

    for path, bl in baseline.items():
        # Skip files that weren't found during baseline
        if bl.get("status") == "not_found":
            meta = get_file_metadata(path)
            if meta.get("exists"):
                results.append({
                    **bl, "status": "added",
                    "current_sha256": compute_sha256(path),
                    "current_md5": compute_md5(path), **meta,
                })
                add_alert("warning", f"NEW FILE: {path} — appeared after baseline")
                modified_count += 1
                print(f"  [NEW]  {path}")
            else:
                results.append({**bl, "status": "not_found"})
            continue

        # Check if file still exists
        meta = get_file_metadata(path)
        if not meta.get("exists", False):
            results.append({
                **bl, "status": "deleted",
                "current_sha256": "DELETED", "current_md5": "DELETED",
            })
            add_alert("danger", f"DELETED: {path} ({bl.get('risk', '?')} risk)")
            deleted_count += 1
            print(f"  [DEL]  {path}")
            continue

        # Compute current hashes and compare
        current_sha256 = compute_sha256(path)
        current_md5 = compute_md5(path)

        hash_match = (bl.get("sha256") == current_sha256)
        perm_changed = (str(bl.get("permissions", "")) != str(meta.get("permissions", "")))

        if not hash_match or perm_changed:
            status = "modified"
            modified_count += 1
            reasons = []
            if not hash_match:
                reasons.append("hash mismatch")
            if perm_changed:
                reasons.append(f"perms {bl.get('permissions')}→{meta.get('permissions')}")

            add_alert("danger",
                f"VIOLATION: {path} — {', '.join(reasons)} ({bl.get('risk', '?')} risk)")
            print(f"  [FAIL] {path} — {', '.join(reasons)}")
        else:
            status = "intact"
            intact_count += 1
            print(f"  [OK]   {path}")

        results.append({
            **bl, "status": status,
            "current_sha256": current_sha256,
            "current_md5": current_md5,
            "current_size": meta.get("size", 0),
            "current_permissions": meta.get("permissions", "???"),
            "current_last_modified": meta.get("last_modified", ""),
            "size_change": meta.get("size", 0) - bl.get("size", 0),
            "perm_changed": perm_changed,
            "hash_match": hash_match,
        })

    # Save scan to history
    scan_record = {
        "time": datetime.now().isoformat(),
        "total": len(results),
        "modified": modified_count,
        "intact": intact_count,
        "deleted": deleted_count,
    }
    history = load_json(HISTORY_FILE, [])
    history.append(scan_record)
    save_json(HISTORY_FILE, history)

    print(f"\n  Results: {intact_count} intact, {modified_count} modified, {deleted_count} deleted\n")

    return jsonify({"results": results, "summary": scan_record})


# --- GET /api/alerts ---
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    return jsonify(load_json(ALERTS_FILE, []))


# --- POST /api/alerts/clear ---
@app.route("/api/alerts/clear", methods=["POST"])
def clear_alerts():
    save_json(ALERTS_FILE, [])
    return jsonify({"success": True})


# --- GET /api/history ---
@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify(load_json(HISTORY_FILE, []))


# --- GET /api/baseline ---
@app.route("/api/baseline", methods=["GET"])
def get_baseline():
    return jsonify(load_json(BASELINE_FILE))


# --- POST /api/browse ---
# Browse a directory — returns list of files and folders
@app.route("/api/browse", methods=["POST"])
def browse_directory():
    data = request.json or {}
    path = data.get("path", "")

    if not path:
        path = "C:\\" if platform.system() == "Windows" else "/"

    if not os.path.exists(path):
        return jsonify({"error": f"Path not found: {path}"}), 404
    if not os.path.isdir(path):
        return jsonify({"error": "Not a directory"}), 400

    items = []
    try:
        for entry in sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower())):
            try:
                st = entry.stat(follow_symlinks=False)
                items.append({
                    "name": entry.name,
                    "path": entry.path,
                    "is_dir": entry.is_dir(follow_symlinks=False),
                    "size": st.st_size if not entry.is_dir() else None,
                    "modified": datetime.fromtimestamp(st.st_mtime).isoformat(),
                    "extension": os.path.splitext(entry.name)[1].lower() if not entry.is_dir() else None,
                })
            except (PermissionError, OSError):
                items.append({
                    "name": entry.name, "path": entry.path,
                    "is_dir": entry.is_dir(follow_symlinks=False),
                    "size": None, "modified": None, "extension": None,
                    "error": "Permission denied",
                })
    except PermissionError:
        return jsonify({"error": f"Permission denied: {path}"}), 403

    parent = str(Path(path).parent)
    if parent == path:
        parent = None

    return jsonify({
        "current_path": path,
        "parent": parent,
        "items": items,
        "total_files": len([i for i in items if not i["is_dir"]]),
        "total_dirs": len([i for i in items if i["is_dir"]]),
    })


# --- POST /api/custom-files ---
# Hash a single file entered by the user
@app.route("/api/custom-files", methods=["POST"])
def hash_custom_file():
    data = request.json
    path = data.get("path", "")

    if not path:
        return jsonify({"error": "Path is required"}), 400
    if not os.path.exists(path):
        return jsonify({"error": f"Path not found: {path}"}), 404
    if os.path.isdir(path):
        return jsonify({"error": "This is a directory. Use Browse or Scan Folder instead."}), 400

    return jsonify({
        "path": path,
        "sha256": compute_sha256(path),
        "md5": compute_md5(path),
        **get_file_metadata(path),
    })


# --- POST /api/scan-folder ---
# Hash all files in a folder
@app.route("/api/scan-folder", methods=["POST"])
def scan_folder():
    data = request.json or {}
    path = data.get("path", "")
    recursive = data.get("recursive", False)

    if not path or not os.path.isdir(path):
        return jsonify({"error": "Valid directory path required"}), 400

    results = []
    scanned = 0
    errors = 0
    max_files = 100

    print(f"\n  [FOLDER SCAN] {path} (recursive={recursive})\n")

    if recursive:
        for root, dirs, files in os.walk(path):
            for fname in files:
                if scanned >= max_files:
                    break
                fpath = os.path.join(root, fname)
                try:
                    results.append({
                        "path": fpath, "name": fname,
                        "sha256": compute_sha256(fpath),
                        "md5": compute_md5(fpath),
                        **get_file_metadata(fpath),
                    })
                    scanned += 1
                except Exception as e:
                    errors += 1
                    results.append({"path": fpath, "name": fname, "error": str(e)})
            if scanned >= max_files:
                break
    else:
        for entry in os.scandir(path):
            if entry.is_file() and scanned < max_files:
                try:
                    results.append({
                        "path": entry.path, "name": entry.name,
                        "sha256": compute_sha256(entry.path),
                        "md5": compute_md5(entry.path),
                        **get_file_metadata(entry.path),
                    })
                    scanned += 1
                except Exception as e:
                    errors += 1
                    results.append({"path": entry.path, "name": entry.name, "error": str(e)})

    add_alert("info", f"Folder scan: {scanned} files hashed in {path}")
    print(f"  Done: {scanned} files, {errors} errors\n")

    return jsonify({
        "folder": path, "scanned": scanned,
        "errors": errors, "truncated": scanned >= max_files,
        "results": results,
    })


# --- GET /api/report ---
# Generate a summary report
@app.route("/api/report", methods=["GET"])
def get_report():
    baseline = load_json(BASELINE_FILE)
    history = load_json(HISTORY_FILE, [])
    alerts = load_json(ALERTS_FILE, [])

    return jsonify({
        "generated_at": datetime.now().isoformat(),
        "system": platform.system(),
        "hostname": platform.node(),
        "total_monitored": len(baseline),
        "total_scans": len(history),
        "total_alerts": len(alerts),
        "critical_alerts": len([a for a in alerts if a.get("type") == "danger"]),
        "last_scan": history[-1] if history else None,
        "recommendations": [
            "Isolate affected systems immediately upon detection",
            "Restore from trusted backup or reinstall affected packages",
            "Review authentication logs for unauthorized access",
            "Enable real-time monitoring with inotify / auditd",
            "Implement mandatory access controls (SELinux / AppArmor)",
            "Schedule automated scans every 4-6 hours",
            "Store baselines on air-gapped storage",
            "Integrate FIM alerts with your SIEM solution",
        ],
    })


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6: SERVER STARTUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    print(f"""
╔═══════════════════════════════════════════════════╗
║         🛡️  FILE INTEGRITY GUARDIAN v1.0           ║
║         Python Backend Server                     ║
╠═══════════════════════════════════════════════════╣
║  OS:       {platform.system()} {platform.release()[:30]:<30}║
║  Hostname: {platform.node()[:40]:<40}║
║  Python:   {platform.python_version():<40}║
║  API:      http://localhost:5000                  ║
║  Data:     {DATA_DIR[:40]:<40}║
╚═══════════════════════════════════════════════════╝
    """)
    app.run(debug=True, port=5000, host="0.0.0.0")