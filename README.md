<div align="center">

# 🛡️ File Integrity Guardian

### A Full-Stack File Integrity Monitoring (FIM) Tool

**Real-time system file verification using SHA-256 & MD5 cryptographic hashing**

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask)
![License](https://img.shields.io/badge/License-MIT-00d4ff?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-brightgreen?style=for-the-badge)

</div>

---

## 📸 Screenshots

<div align="center">

| Dashboard | Scan Results |
|:---------:|:------------:|
|<img width="1835" height="1420" alt="Screenshot 2026-03-24 114343" src="https://github.com/user-attachments/assets/0b74399a-8b9d-43cf-9a64-3b10f98b3800" /> |<img width="1824" height="1481" alt="Screenshot 2026-03-24 114311" src="https://github.com/user-attachments/assets/ca9cbbf6-d887-4274-83df-b250f0c554dc" /> |


| File Browser Modal | Hash Comparison |
|:------------------:|:---------------:|
|<img width="1793" height="1396" alt="Screenshot 2026-03-24 114851" src="https://github.com/user-attachments/assets/ce2deb49-6fe4-472c-a25e-3760e4047bc6" /> | <img width="1769" height="1284" alt="Screenshot 2026-03-24 114739" src="https://github.com/user-attachments/assets/9bde0730-3268-4a9c-9ce1-daf98f5ffc6b" /> |

</div>

> **Note:** Add your screenshots in the `screenshots/` folder after running the tool

---

## 🎯 What It Does

File Integrity Guardian monitors critical operating system files by computing cryptographic hashes and comparing them against a trusted baseline. Any unauthorized modification is instantly detected and reported.

### Key Features

- **Real File Scanning** — Reads actual Windows/Linux system files using Python's `hashlib`
- **Dual Hashing** — Computes both SHA-256 (64-char) and MD5 (32-char) hashes
- **Trusted Baseline** — Creates and stores a snapshot of file hashes as the "known good" state
- **Integrity Scanning** — Compares current hashes against baseline to detect tampering
- **5-Level Status Indicator** — SECURE → MONITORING → WARNING → CRITICAL → COMPROMISED
- **Auto-Scan Scheduler** — Set automatic scans from 1 minute to 24 hours
- **File Browser Modal** — Navigate your file system in a popup window with recursive scanning
- **Custom File Hashing** — Hash any file or folder on your system
- **Alert System** — Color-coded severity alerts (danger / warning / info)
- **Scan History** — Complete log of all integrity scans, custom scans, and folder scans
- **Security Report** — Auto-generated report with recommendations
- **20 Critical Files** — Pre-configured monitoring for Windows and Linux system files

---

## 🏗️ Architecture

```
┌──────────────────────────┐                    ┌──────────────────────────┐
│    React Frontend        │     REST API       │    Python Backend        │
│    (localhost:5173)      │◄══ JSON/HTTP ══►   │    (localhost:5000)      │
├──────────────────────────┤                    ├──────────────────────────┤
│                          │                    │                          │
│  ▸ Dashboard + Metrics   │  /api/status       │  ▸ hashlib.sha256()     │
│  ▸ 5-Level Status        │  /api/baseline     │  ▸ hashlib.md5()        │
│  ▸ Auto-Scan Scheduler   │  /api/scan         │  ▸ os.stat() metadata   │
│  ▸ File Table + Details  │  /api/alerts       │  ▸ os.scandir() browse  │
│  ▸ File Browser Modal    │  /api/browse       │  ▸ Baseline comparison  │
│  ▸ Alert Feed            │  /api/custom-files │  ▸ Alert generation     │
│  ▸ Scan History          │  /api/scan-folder  │  ▸ JSON persistence     │
│  ▸ Security Report       │  /api/report       │  ▸ Scan history log     │
│                          │  /api/history      │                          │
└──────────────────────────┘                    └──────────────────────────┘
                                                           │
                                                           ▼
                                                ┌──────────────────────┐
                                                │   Operating System   │
                                                │   Files (Real)       │
                                                ├──────────────────────┤
                                                │ Windows:             │
                                                │  cmd.exe, kernel32   │
                                                │  ntdll.dll, hosts    │
                                                │  powershell.exe ...  │
                                                │ Linux:               │
                                                │  /etc/passwd, shadow │
                                                │  /usr/bin/ssh ...    │
                                                └──────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/file-integrity-guardian.git
cd file-integrity-guardian
```

**2. Start the Python backend**

```bash
cd backend
pip install -r requirements.txt
python app.py
```

You should see:

```
╔═══════════════════════════════════════════════════╗
║         🛡️  FILE INTEGRITY GUARDIAN v1.0           ║
║         Python Backend Server                     ║
╠═══════════════════════════════════════════════════╣
║  OS:       Windows 10                             ║
║  API:      http://localhost:5000                  ║
╚═══════════════════════════════════════════════════╝
```

**3. Start the React frontend** (new terminal)

```bash
cd frontend
npm install
npm run dev
```

**4. Open your browser**

```
http://localhost:5173
```

---

## 🔧 How to Use

| Step | Action | What Happens |
|:----:|--------|--------------|
| 1 | Click **⚡ Initialize Baseline** | Python scans 20 system files, computes SHA-256/MD5, stores in `baseline.json` |
| 2 | Click **🔍 Run Integrity Scan** | Recalculates all hashes and compares with baseline |
| 3 | Check **Status Indicator** | Shows SECURE (green) / WARNING (yellow) / COMPROMISED (red) |
| 4 | Click any **file row** | See side-by-side baseline vs current hash comparison |
| 5 | Go to **Custom Scan** tab | Browse files, hash individual files, scan entire folders |
| 6 | Enable **Auto-Scan** | Set interval (1min to 24hr) for automatic scanning with countdown |
| 7 | View **Report** tab | Auto-generated security report with recommendations |

---

## 📁 Project Structure

```
file-integrity-guardian/
│
├── backend/
│   ├── app.py                 # Python Flask backend (main server)
│   ├── requirements.txt       # Python dependencies (flask, flask-cors)
│   └── fig_data/              # Auto-created data directory (gitignored)
│       ├── baseline.json      # Trusted hash baseline
│       ├── alerts.json        # Security alerts log
│       └── scan_history.json  # Scan history records
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # React dashboard component (logic)
│   │   ├── App.css            # Dashboard styles (all CSS classes)
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Global styles (fonts, resets, scrollbar)
│   ├── index.html             # HTML template
│   ├── package.json           # Node dependencies
│   └── vite.config.js         # Vite build config
│
├── screenshots/               # App screenshots for documentation
├── generate_ppt.py            # Auto-generates PowerPoint presentation
├── PROJECT_REPORT.md          # Full BIA project report
├── .gitignore                 # Git ignore rules
├── LICENSE                    # MIT License
└── README.md                  # This file
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:------:|----------|-------------|
| `GET` | `/api/status` | System info, baseline status, file count |
| `GET` | `/api/files` | List all monitored files with metadata |
| `POST` | `/api/baseline/create` | Create trusted hash baseline for all files |
| `POST` | `/api/scan` | Run integrity scan comparing current vs baseline |
| `GET` | `/api/alerts` | Get all security alerts |
| `POST` | `/api/alerts/clear` | Clear alert history |
| `GET` | `/api/history` | Get complete scan history |
| `POST` | `/api/browse` | Browse directory contents (for file browser modal) |
| `POST` | `/api/custom-files` | Hash an individual file (SHA-256 + MD5) |
| `POST` | `/api/scan-folder` | Scan and hash all files in a folder |
| `GET` | `/api/report` | Generate security report with recommendations |
| `GET` | `/api/baseline` | Get stored baseline data |

---

## 🔐 Monitored Files

The tool automatically detects your OS and monitors 20 critical system files:

<details>
<summary><b>Windows Files (click to expand)</b></summary>

| File | Type | Risk |
|------|------|------|
| `C:\Windows\System32\cmd.exe` | Binary | Critical |
| `C:\Windows\System32\kernel32.dll` | Binary | Critical |
| `C:\Windows\System32\ntdll.dll` | Binary | Critical |
| `C:\Windows\System32\svchost.exe` | Binary | Critical |
| `C:\Windows\System32\advapi32.dll` | Binary | Critical |
| `C:\Windows\System32\secur32.dll` | Binary | Critical |
| `C:\Windows\System32\user32.dll` | Binary | High |
| `C:\Windows\System32\taskmgr.exe` | Binary | High |
| `C:\Windows\System32\notepad.exe` | Binary | Medium |
| `C:\Windows\System32\calc.exe` | Binary | Medium |
| `C:\Windows\explorer.exe` | Binary | High |
| `C:\Windows\regedit.exe` | Binary | Critical |
| `C:\Windows\System32\netsh.exe` | Binary | High |
| `C:\Windows\System32\drivers\etc\hosts` | Config | High |
| `C:\Windows\System32\drivers\etc\services` | Config | Medium |
| `C:\Windows\win.ini` | Config | Medium |
| `C:\Windows\System32\...\powershell.exe` | Binary | Critical |
| `C:\Windows\System32\wbem\WMIC.exe` | Binary | High |
| `C:\Windows\System32\mstsc.exe` | Binary | High |
| `C:\Windows\System32\dllhost.exe` | Binary | High |

</details>

<details>
<summary><b>Linux Files (click to expand)</b></summary>

| File | Type | Risk |
|------|------|------|
| `/etc/passwd` | Config | Critical |
| `/etc/shadow` | Config | Critical |
| `/etc/hosts` | Config | High |
| `/etc/ssh/sshd_config` | Config | High |
| `/etc/sudoers` | Config | Critical |
| `/etc/crontab` | Config | High |
| `/etc/resolv.conf` | Config | Medium |
| `/etc/fstab` | Config | High |
| `/etc/pam.d/common-auth` | Config | Critical |
| `/etc/apt/sources.list` | Config | High |
| `/usr/bin/ssh` | Binary | Critical |
| `/usr/bin/sudo` | Binary | Critical |
| `/usr/sbin/sshd` | Binary | Critical |
| `/bin/bash` | Binary | High |
| `/bin/ls` | Binary | Medium |
| `/boot/vmlinuz` | Binary | Critical |
| `/usr/lib/systemd/systemd` | Binary | Critical |
| `/var/log/auth.log` | Log | High |
| `/var/log/syslog` | Log | Medium |
| `/etc/iptables/rules.v4` | Config | Critical |

</details>

---

## 🚦 Status Levels

The header displays a real-time system status indicator with 5 levels:

| Status | Color | Condition |
|--------|-------|-----------|
| 🟢 **SECURE** | Green | All files intact after scan / No baseline yet |
| 🔵 **MONITORING** | Cyan | Baseline created, waiting for scan |
| 🟡 **WARNING** | Yellow | 1 non-critical file modified |
| 🟠 **CRITICAL** | Orange | 2+ files modified |
| 🔴 **COMPROMISED** | Red | Critical files tampered or files deleted |

---

## ⏰ Auto-Scan Scheduler

Enable automatic integrity scanning at custom intervals:

| Interval | Use Case |
|----------|----------|
| 1 minute | Testing / demo |
| 5 minutes | Development |
| 15 minutes | Active monitoring |
| 30 minutes | Standard security |
| 1 hour | Recommended for production |
| 6 hours | Low-change environments |
| 12 hours | Stable servers |
| 24 hours | Compliance scans |

Features a live countdown timer showing time until next scan.

---

## 🛡️ Security Recommendations

Based on scan results, the tool generates these recommendations:

1. Isolate affected systems immediately upon detection
2. Restore from trusted backup or reinstall affected packages
3. Review authentication logs for unauthorized access
4. Enable real-time monitoring with inotify / auditd
5. Implement mandatory access controls (SELinux / AppArmor)
6. Schedule automated scans every 4-6 hours
7. Store baselines on air-gapped storage
8. Integrate FIM alerts with your SIEM solution

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Backend server, real file system access |
| **hashlib** | SHA-256 and MD5 cryptographic hash computation |
| **Flask 3.1** | REST API framework |
| **Flask-CORS** | Cross-origin resource sharing |
| **React 18+** | Frontend dashboard UI |
| **Vite** | Fast React build tool |
| **JavaScript ES6+** | Frontend application logic |
| **JSON** | File-based data persistence |
| **Inter + JetBrains Mono** | UI typography (Google Fonts) |
| **CSS3** | Custom dark cybersecurity theme |

---

## 🚀 Building for Production

```bash
# Build optimized React frontend
cd frontend
npm run build

# The dist/ folder contains the production build
# Serve it with any static file server
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📋 Future Enhancements

- [ ] Email / Slack alert notifications
- [ ] SQLite / PostgreSQL database backend
- [ ] Multi-host agent-based monitoring
- [ ] SIEM integration (Syslog / CEF export)
- [ ] CSV / PDF report export
- [ ] Windows service mode
- [ ] Real-time file watchdog (inotify)
- [ ] File content diff viewer

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Gaurav Kalsait**

- GitHub: [@gaurav-kalsait](https://github.com/gaurav-kalsait)
- Project: File Integrity Guardian
- Course: Business Impact Analysis / Cybersecurity

---

<div align="center">

**⭐ Star this repo if you found it useful!**

Built with ❤️ using Python + React

</div>
