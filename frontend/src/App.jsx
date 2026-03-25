// ============================================
// FILE INTEGRITY GUARDIAN — App.jsx (Clean)
// Styles are in App.css — no inline styles
// Author: Gaurav Kalsait
// ============================================

import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

// ━━━ STATUS LEVELS ━━━
const STATUS_LEVELS = [
  { id: "secure", label: "SECURE", color: "#00e68a", desc: "All files intact" },
  { id: "monitoring", label: "MONITORING", color: "#00d4ff", desc: "Baseline active, scanning" },
  { id: "warning", label: "WARNING", color: "#ffb020", desc: "Minor changes detected" },
  { id: "critical", label: "CRITICAL", color: "#ff8800", desc: "Integrity violations found" },
  { id: "compromised", label: "COMPROMISED", color: "#ff2244", desc: "Critical files tampered" },
];

const RISK_COLORS = {
  critical: { bg: "#ff4d6a14", text: "#ff4d6a", border: "#ff4d6a30" },
  high: { bg: "#ffb02014", text: "#ffb020", border: "#ffb02030" },
  medium: { bg: "#00d4ff14", text: "#00d4ff", border: "#00d4ff30" },
  low: { bg: "#00e68a14", text: "#00e68a", border: "#00e68a30" },
};

const STAT_COLORS = {
  intact: { bg: "#00e68a14", text: "#00e68a", border: "#00e68a30" },
  modified: { bg: "#ff4d6a14", text: "#ff4d6a", border: "#ff4d6a30" },
  deleted: { bg: "#ffb02014", text: "#ffb020", border: "#ffb02030" },
  added: { bg: "#00d4ff14", text: "#00d4ff", border: "#00d4ff30" },
  pending: { bg: "#4a557014", text: "#8892a8", border: "#4a557030" },
  not_found: { bg: "#4a557014", text: "#8892a8", border: "#4a557030" },
};

function getSystemStatus(files, initialized, hasScanned) {
  // No baseline yet
  if (!initialized) return STATUS_LEVELS[0]; // SECURE (idle)

  // Baseline created but no scan run yet
  if (!hasScanned || files.length === 0) return STATUS_LEVELS[1]; // MONITORING

  // Scan completed — check results
  const mod = files.filter(f => f.status === "modified");
  const del = files.filter(f => f.status === "deleted");
  const crit = mod.filter(f => f.risk === "critical");

  if (crit.length > 0 || del.length > 0) return STATUS_LEVELS[4]; // COMPROMISED
  if (mod.length >= 2) return STATUS_LEVELS[3];                    // CRITICAL
  if (mod.length === 1) return STATUS_LEVELS[2];                   // WARNING

  // All files intact after scan
  return STATUS_LEVELS[0]; // SECURE ✅
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

// ━━━ COMPONENTS ━━━
function Badge({ children, color }) {
  const c = color || STAT_COLORS.pending;
  return <span className="badge" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{children}</span>;
}

function StatusIndicator({ status }) {
  return (
    <div className="status-pill" style={{ background: status.color + "0a", border: `1px solid ${status.color}25` }}>
      <span className="status-dot" style={{ background: status.color, boxShadow: `0 0 6px ${status.color}, 0 0 12px ${status.color}60` }} />
      <div>
        <div className="status-label" style={{ color: status.color }}>{status.label}</div>
        <div className="status-desc">{status.desc}</div>
      </div>
    </div>
  );
}

// ━━━ MAIN APP ━━━
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [scanResults, setScanResults] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [customResult, setCustomResult] = useState(null);
  const [browseData, setBrowseData] = useState(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [folderResults, setFolderResults] = useState(null);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [report, setReport] = useState(null);
  const [recursive, setRecursive] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  // Auto-scan scheduler state
  const [autoScan, setAutoScan] = useState(false);
  const [scanInterval, setScanInterval] = useState(60);  // minutes
  const [countdown, setCountdown] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(null);
  const autoScanRef = useRef(null);
  const countdownRef = useRef(null);

  const api = useCallback(async (path, method = "GET", body = null) => {
    try {
      const opts = { method, headers: { "Content-Type": "application/json" } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(`${API}${path}`, opts);
      const d = await r.json();
      setError(null);
      return d;
    } catch {
      setError("Cannot connect to Python backend. Is app.py running on port 5000?");
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await api("/status"); if (s) setStatus(s);
      const a = await api("/alerts"); if (a) setAlerts(a);
      const h = await api("/history"); if (h) setScanHistory(h);
    })();
  }, [api]);

  const createBaseline = async () => {
    setCreating(true);
    const d = await api("/baseline/create", "POST", { algorithm: "SHA-256" });
    if (d?.success) {
      setStatus(await api("/status"));
      setAlerts(await api("/alerts") || []);
      setScanResults([]);
    }
    setCreating(false);
  };

  const runScan = async () => {
    setScanning(true);
    const d = await api("/scan", "POST");
    if (d?.results) {
      setScanResults(d.results);
      setAlerts(await api("/alerts") || []);
      setScanHistory(await api("/history") || []);
      setLastScanTime(new Date());
    } else if (d?.error) setError(d.error);
    setScanning(false);
  };

  // Auto-scan timer effect
  useEffect(() => {
    if (autoScan && status?.initialized) {
      // Set countdown
      setCountdown(scanInterval * 60);

      // Countdown ticker — runs every second
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) return scanInterval * 60; // reset after hitting 0
          return prev - 1;
        });
      }, 1000);

      // Actual scan trigger
      autoScanRef.current = setInterval(() => {
        runScan();
      }, scanInterval * 60 * 1000);

      return () => {
        clearInterval(autoScanRef.current);
        clearInterval(countdownRef.current);
      };
    } else {
      clearInterval(autoScanRef.current);
      clearInterval(countdownRef.current);
      setCountdown(0);
    }
  }, [autoScan, scanInterval, status?.initialized]);

  // Format countdown as mm:ss
  const formatCountdown = (seconds) => {
    if (seconds <= 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const hashCustomFile = async (filePath) => {
    const p = filePath || customPath;
    if (!p.trim()) return;
    const d = await api("/custom-files", "POST", { path: p });
    if (d) {
      setCustomResult(d);
      setAlerts(await api("/alerts") || []);
      setScanHistory(await api("/history") || []);
    }
  };

  const browseTo = async (path) => {
    setBrowseLoading(true);
    const d = await api("/browse", "POST", { path: path || "" });
    if (d && !d.error) { setBrowseData(d); setBrowserOpen(true); }
    else if (d?.error) setCustomResult({ error: d.error });
    setBrowseLoading(false);
  };

  const scanFolder = async (folderPath) => {
    setScanningFolder(true);
    const d = await api("/scan-folder", "POST", { path: folderPath, recursive });
    if (d) {
      setFolderResults(d);
      setBrowserOpen(false);
      setAlerts(await api("/alerts") || []);
      setScanHistory(await api("/history") || []);
    }
    setScanningFolder(false);
  };

  useEffect(() => { if (activeTab === "report") api("/report").then(d => d && setReport(d)); }, [activeTab]);

  const intact = scanResults.filter(f => f.status === "intact").length;
  const modified = scanResults.filter(f => f.status === "modified").length;
  const deleted = scanResults.filter(f => f.status === "deleted").length;
  const critical = scanResults.filter(f => f.status === "modified" && f.risk === "critical").length;
  const violations = scanResults.filter(f => f.status !== "intact" && f.status !== "not_found");
  const systemStatus = getSystemStatus(scanResults, status?.initialized, scanResults.length > 0);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "files", label: "Files", icon: "📁" },
    { id: "alerts", label: `Alerts (${alerts.length})`, icon: "🔔" },
    { id: "scan", label: "Custom Scan", icon: "🔍" },
    { id: "history", label: "History", icon: "📜" },
    { id: "report", label: "Report", icon: "📄" },
  ];

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="header-logo">🛡️</div>
        <div className="header-info">
          <div className="header-title">File Integrity Guardian</div>
          <div className="header-subtitle">
            {status ? `${status.system} • ${status.hostname} • Python ${status.python_version}` : "Connecting to backend..."}
          </div>
        </div>
        <StatusIndicator status={systemStatus} />
      </header>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* TABS */}
      <nav className="tab-bar">
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.id); setSelectedFile(null); }}>
            <span className="tab-icon">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </nav>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <div>
          <div className="action-bar">
            <button className="btn btn-primary" onClick={createBaseline} disabled={creating}>
              {creating ? "⏳ Creating..." : "⚡ Initialize Baseline"}
            </button>
            <button className="btn btn-success" onClick={runScan} disabled={!status?.initialized || scanning}>
              {scanning ? "⏳ Scanning..." : "🔍 Run Integrity Scan"}
            </button>
          </div>

          {/* Auto-Scan Scheduler */}
          {status?.initialized && (
            <div className="scheduler">
              <div className="scheduler-bar">
                <div className="scheduler-label">
                  ⏰ Auto-Scan
                </div>
                <label className="scheduler-toggle">
                  <input type="checkbox" checked={autoScan} onChange={e => setAutoScan(e.target.checked)} />
                  <div className="scheduler-track" />
                  <div className="scheduler-thumb" />
                </label>
                <span style={{ fontSize: 12, color: autoScan ? "#00d4ff" : "#4a5570" }}>
                  Every
                </span>
                <select className="scheduler-select" value={scanInterval}
                  onChange={e => { setScanInterval(Number(e.target.value)); if (autoScan) { setAutoScan(false); setTimeout(() => setAutoScan(true), 100); } }}>
                  <option value={1}>1 minute (test)</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={360}>6 hours</option>
                  <option value={720}>12 hours</option>
                  <option value={1440}>24 hours</option>
                </select>

                {autoScan && (
                  <div className="scheduler-status">
                    <span className="scheduler-dot" style={{ background: "#00e68a", boxShadow: "0 0 6px #00e68a" }} />
                    <span>Next scan in</span>
                    <span className="scheduler-countdown">{formatCountdown(countdown)}</span>
                  </div>
                )}
                {!autoScan && (
                  <div className="scheduler-status">
                    <span style={{ color: "#4a5570" }}>Disabled</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="section-label">System Overview</div>
          <div className="metric-grid">
            {[
              { label: "Total Monitored", value: status?.baseline_count || 0, color: "#00d4ff", icon: "📂" },
              { label: "Intact", value: intact, color: "#00e68a", icon: "✅" },
              { label: "Modified", value: modified, color: "#ff4d6a", icon: "⚠️" },
              { label: "Deleted", value: deleted, color: "#ffb020", icon: "🗑️" },
              { label: "Critical", value: critical, color: "#ff2244", icon: "🚨" },
            ].map((m, i) => (
              <div className="metric-card" key={i}>
                <div className="metric-accent" style={{ background: `linear-gradient(90deg, ${m.color}, transparent)` }} />
                <div className="metric-body">
                  <div className="metric-icon" style={{ background: m.color + "12" }}>{m.icon}</div>
                  <div>
                    <div className="metric-value" style={{ color: m.color }}>{m.value}</div>
                    <div className="metric-label">{m.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scan Summary — shows after a scan has been run */}
          {scanResults.length > 0 && (
            <>
              <div className="section-label">Scan Summary</div>
              <div className="scan-summary">
                {/* Left panel — stats */}
                <div className="summary-card">
                  <div className="summary-card-label">Last Scan Info</div>
                  <div className="summary-card-value" style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Time:</span>
                      <span className="mono">{lastScanTime ? lastScanTime.toLocaleTimeString() : "—"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Files scanned:</span>
                      <span className="mono">{scanResults.length}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Intact:</span>
                      <span className="mono" style={{ color: "#00e68a" }}>{intact}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Modified:</span>
                      <span className="mono" style={{ color: modified > 0 ? "#ff4d6a" : "#00e68a" }}>{modified}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Deleted:</span>
                      <span className="mono" style={{ color: deleted > 0 ? "#ffb020" : "#00e68a" }}>{deleted}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Algorithm:</span>
                      <span className="mono" style={{ color: "#00d4ff" }}>SHA-256</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#8892a8" }}>Total scans:</span>
                      <span className="mono">{scanHistory.length}</span>
                    </div>
                  </div>
                </div>

                {/* Right panel — recent file list */}
                <div className="summary-card">
                  <div className="summary-card-label">Scanned Files (top 8)</div>
                  <div className="summary-card-value">
                    {scanResults.slice(0, 8).map((f, i) => (
                      <div className="summary-file-row" key={i}>
                        <span style={{ fontSize: 12 }}>
                          {f.status === "intact" ? "✅" : f.status === "modified" ? "⚠️" : f.status === "deleted" ? "🗑️" : "❓"}
                        </span>
                        <span className="summary-file-path">
                          {f.path.split("\\").pop() || f.path.split("/").pop()}
                        </span>
                        <span className="summary-file-status" style={{
                          color: f.status === "intact" ? "#00e68a" : f.status === "modified" ? "#ff4d6a" : "#ffb020"
                        }}>
                          {f.status}
                        </span>
                      </div>
                    ))}
                    {scanResults.length > 8 && (
                      <div style={{ textAlign: "center", padding: "6px 0", fontSize: 11, color: "#4a5570" }}>
                        + {scanResults.length - 8} more files →
                        <span style={{ color: "#00d4ff", cursor: "pointer", marginLeft: 4 }}
                          onClick={() => setActiveTab("files")}>View all</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Violations list */}
          {violations.length > 0 && (
            <>
              <div className="section-label">Integrity Violations</div>
              <div className="card card-glow">
                {violations.map((f, i) => (
                  <div key={i} className="violation-row" onClick={() => { setSelectedFile(f); setActiveTab("files"); }}>
                    <span className="violation-icon">{f.status === "deleted" ? "🗑️" : "⚠️"}</span>
                    <span className="violation-path">{f.path}</span>
                    <Badge color={RISK_COLORS[f.risk]}>{f.risk}</Badge>
                    <Badge color={STAT_COLORS[f.status]}>{f.status}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Empty state — no baseline yet */}
          {!status?.initialized && scanResults.length === 0 && (
            <div className="card empty-state">
              <div className="empty-icon">🛡️</div>
              <div className="empty-title">Click "Initialize Baseline" to start monitoring</div>
              <div className="empty-desc">This will scan your system files and create a trusted hash database</div>
            </div>
          )}
        </div>
      )}

      {/* FILES */}
      {activeTab === "files" && (
        <div>
          {selectedFile ? (
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFile(null)}>← Back to files</button>
              <div className="card card-glow" style={{ marginTop: 12 }}>
                <div className="file-detail-header">
                  <div className="file-detail-icon">{selectedFile.type === "binary" ? "⚙️" : selectedFile.type === "log" ? "📝" : "🔧"}</div>
                  <div>
                    <div className="file-detail-path">{selectedFile.path}</div>
                    <div className="file-detail-desc">{selectedFile.desc}</div>
                  </div>
                </div>
                <div className="file-props-grid">
                  {[
                    ["Status", <Badge color={STAT_COLORS[selectedFile.status]}>{selectedFile.status}</Badge>],
                    ["Risk", <Badge color={RISK_COLORS[selectedFile.risk]}>{selectedFile.risk}</Badge>],
                    ["Type", selectedFile.type],
                    ["Baseline Size", formatSize(selectedFile.size)],
                    ["Current Size", formatSize(selectedFile.current_size)],
                    ["Permissions", selectedFile.perm_changed ? <span style={{ color: "#ff4d6a" }}>{selectedFile.permissions} → {selectedFile.current_permissions}</span> : selectedFile.permissions],
                  ].map(([label, val], i) => (
                    <div className="file-prop" key={i}>
                      <div className="file-prop-label">{label}</div>
                      <div>{val}</div>
                    </div>
                  ))}
                </div>
                <div className="section-label">Hash Comparison</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div className="hash-label">Baseline SHA-256</div>
                    <div className="hash-box hash-box-ok">{selectedFile.sha256 || "N/A"}</div>
                  </div>
                  <div>
                    <div className="hash-label">Current SHA-256</div>
                    <div className={`hash-box ${selectedFile.hash_match === false ? "hash-box-err" : "hash-box-ok"}`}>
                      {selectedFile.current_sha256 || "Run a scan to see current hash"}
                    </div>
                  </div>
                </div>
                {selectedFile.status === "modified" && (
                  <div className="hash-mismatch-alert">⚠️ Hash mismatch — file modified since baseline</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {scanResults.length === 0 && <div className="card empty-state"><div className="empty-title">Run a scan first to see file results</div></div>}
              {scanResults.length > 0 && (
                <table className="file-table">
                  <thead><tr>
                    {["File Path", "Type", "Risk", "Size", "Status"].map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {scanResults.map((f, i) => (
                      <tr key={i} onClick={() => setSelectedFile(f)}>
                        <td className="td-path">{f.path}</td>
                        <td className="td-dim">{f.type}</td>
                        <td><Badge color={RISK_COLORS[f.risk]}>{f.risk}</Badge></td>
                        <td className="td-dim">{formatSize(f.size)}</td>
                        <td><Badge color={STAT_COLORS[f.status]}>{f.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ALERTS */}
      {activeTab === "alerts" && (
        <div>
          <div className="alerts-header">
            <div className="section-label">{alerts.length} Security Alerts</div>
            <button className="btn btn-ghost btn-sm" onClick={async () => { await api("/alerts/clear", "POST"); setAlerts([]); }}>Clear All</button>
          </div>
          {alerts.length === 0 && <div className="card empty-state"><div className="empty-title">No alerts yet — run a scan</div></div>}
          {[...alerts].reverse().map((a, i) => {
            const ac = a.type === "danger" ? "#ff4d6a" : a.type === "warning" ? "#ffb020" : "#00d4ff";
            return (
              <div className="alert-item" key={i} style={{ borderLeftColor: ac }}>
                <div className="alert-meta">
                  <span className="alert-time">{new Date(a.time).toLocaleString()}</span>
                  <Badge color={a.type === "danger" ? RISK_COLORS.critical : a.type === "warning" ? RISK_COLORS.high : RISK_COLORS.medium}>{a.type}</Badge>
                </div>
                <div className="alert-msg" style={{ color: ac }}>{a.msg}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* CUSTOM SCAN */}
      {activeTab === "scan" && (
        <div>
          <div className="card card-glow">
            <div className="section-label">Scan Any File or Folder</div>
            <div className="scan-input-row">
              <input className="scan-input" value={customPath} onChange={e => setCustomPath(e.target.value)}
                placeholder="Enter file path (e.g., C:\Windows\System32\cmd.exe)"
                onKeyDown={e => e.key === "Enter" && hashCustomFile()} />
              <button className="btn btn-primary" onClick={() => hashCustomFile()}>Hash It</button>
            </div>
            <div className="scan-actions">
              <button className="btn btn-success" onClick={() => browseTo("")}>📂 Browse Files & Folders</button>
            </div>
          </div>

          {customResult && !customResult.error && (
            <div className="card custom-result">
              <div className="custom-result-path">{customResult.path}</div>
              <div className="custom-result-grid">
                <div><span className="td-dim">SHA-256: </span><span className="custom-result-hash" style={{ color: "#00e68a" }}>{customResult.sha256}</span></div>
                <div><span className="td-dim">MD5: </span><span className="custom-result-hash" style={{ color: "#00d4ff" }}>{customResult.md5}</span></div>
                <div className="custom-result-meta">
                  <span>Size: {formatSize(customResult.size)}</span>
                  <span>Perms: {customResult.permissions}</span>
                  <span>Modified: {customResult.last_modified ? new Date(customResult.last_modified).toLocaleString() : "—"}</span>
                </div>
              </div>
            </div>
          )}
          {customResult?.error && <div className="card custom-error"><div style={{ color: "#ff4d6a" }}>{customResult.error}</div></div>}

          {/* Folder scan results */}
          {folderResults && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="folder-header">
                <span className="folder-title">📁 Folder Results</span>
                <Badge color={STAT_COLORS.intact}>{folderResults.scanned} hashed</Badge>
                {folderResults.errors > 0 && <Badge color={RISK_COLORS.high}>{folderResults.errors} errors</Badge>}
                {folderResults.truncated && <Badge color={RISK_COLORS.medium}>Truncated at 100</Badge>}
                <button className="btn btn-default btn-sm" onClick={() => setFolderResults(null)} style={{ marginLeft: "auto" }}>Close</button>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#4a5570", marginBottom: 8 }}>{folderResults.folder}</div>
              <div className="folder-table-wrap">
                <table className="browser-table">
                  <thead><tr>{["File", "SHA-256", "Size"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {folderResults.results.map((f, i) => (
                      <tr key={i} onClick={() => { setCustomPath(f.path); setCustomResult(f); }}>
                        <td className="td-path">{f.name}</td>
                        <td style={{ fontFamily: "var(--font-mono)", color: f.error ? "#ff4d6a" : "#00e68a", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.error || (f.sha256?.substring(0, 24) + "...")}</td>
                        <td className="td-dim">{formatSize(f.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILE BROWSER MODAL — pops up over everything */}
      {browserOpen && browseData && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setBrowserOpen(false); }}>
          <div className="modal-box">
            {/* Header */}
            <div className="modal-header">
              <span style={{ fontSize: 20 }}>📂</span>
              <div className="modal-title">Browse Files & Folders</div>
              <div className="modal-path">{browseData.current_path}</div>
              <button className="modal-close" onClick={() => setBrowserOpen(false)}>✕</button>
            </div>

            {/* Toolbar */}
            <div className="modal-toolbar">
              {browseData.parent && (
                <button className="btn btn-default btn-sm" onClick={() => browseTo(browseData.parent)}>⬆ Parent</button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => scanFolder(browseData.current_path)} disabled={scanningFolder}>
                {scanningFolder ? "⏳ Scanning..." : "🔍 Scan This Folder"}
              </button>

              <label className={`recursive-toggle ${recursive ? "active" : ""}`}>
                <input type="checkbox" checked={recursive} onChange={e => setRecursive(e.target.checked)} />
                Recursive
              </label>

              <div className="modal-info">
                {browseData.total_dirs} folders, {browseData.total_files} files
              </div>
            </div>

            {/* File list */}
            <div className="modal-body">
              {browseLoading ? (
                <div className="empty-state"><div className="empty-title">Loading directory...</div></div>
              ) : (
                <table className="modal-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th style={{ width: 90, textAlign: "right" }}>Size</th>
                      <th style={{ width: 70, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {browseData.items.map((item, i) => (
                      <tr key={i} onClick={() => { if (item.is_dir) browseTo(item.path); }}>
                        <td>
                          <div className="td-name">
                            <span className="td-name-icon">{item.is_dir ? "📁" : "📄"}</span>
                            <span className={`td-name-text ${item.is_dir ? "td-name-folder" : "td-name-file"}`}>
                              {item.name}
                            </span>
                            {item.error && <span className="td-name-error">({item.error})</span>}
                          </div>
                        </td>
                        <td className="td-dim" style={{ textAlign: "right" }}>
                          {item.is_dir ? "—" : formatSize(item.size)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {!item.is_dir && (
                            <span className="td-action td-action-hash" onClick={e => {
                              e.stopPropagation();
                              setCustomPath(item.path);
                              hashCustomFile(item.path);
                              setBrowserOpen(false);
                            }}>Hash</span>
                          )}
                          {item.is_dir && (
                            <span className="td-action td-action-scan" onClick={e => {
                              e.stopPropagation();
                              scanFolder(item.path);
                            }}>Scan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-default btn-sm" onClick={() => setBrowserOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => scanFolder(browseData.current_path)} disabled={scanningFolder}>
                {scanningFolder ? "⏳ Scanning..." : `🔍 Scan Current Folder${recursive ? " (Recursive)" : ""}`}
              </button>
              <div className="modal-footer-info">
                {recursive ? "Will scan all subfolders" : "Current folder only"} • Max 100 files
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <div>
          {scanHistory.length === 0 && <div className="card empty-state"><div className="empty-title">No scans recorded yet</div></div>}
          {[...scanHistory].reverse().map((s, i) => (
            <div className="card history-item" key={i}>
              <span className="history-time">{new Date(s.time).toLocaleString()}</span>
              {s.type === "custom_file" ? (
                <>
                  <Badge color={RISK_COLORS.medium}>custom file</Badge>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#00d4ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{s.path}</span>
                </>
              ) : s.type === "custom_folder" ? (
                <>
                  <Badge color={RISK_COLORS.high}>folder scan</Badge>
                  <span className="history-count">{s.total} files</span>
                  {s.recursive && <Badge color={STAT_COLORS.added}>recursive</Badge>}
                  {s.errors > 0 && <Badge color={RISK_COLORS.critical}>{s.errors} errors</Badge>}
                </>
              ) : (
                <>
                  <Badge color={STAT_COLORS.pending}>integrity scan</Badge>
                  <span className="history-count">{s.total} files</span>
                  <Badge color={STAT_COLORS.intact}>{s.intact} OK</Badge>
                  {s.modified > 0 && <Badge color={STAT_COLORS.modified}>{s.modified} modified</Badge>}
                  {s.deleted > 0 && <Badge color={STAT_COLORS.deleted}>{s.deleted} deleted</Badge>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REPORT */}
      {activeTab === "report" && report && (
        <div className="card card-glow" style={{ padding: 28 }}>
          <div className="report-header">
            <div className="report-icon">🛡️</div>
            <div>
              <div className="report-title">Scan Report</div>
              <div className="report-meta">Generated: {new Date(report.generated_at).toLocaleString()} • {report.system} ({report.hostname})</div>
            </div>
          </div>
          <div className="report-stats">
            {[
              ["Total Monitored", report.total_monitored, "#00d4ff"],
              ["Total Scans", report.total_scans, "#00d4ff"],
              ["Critical Alerts", report.critical_alerts, report.critical_alerts > 0 ? "#ff2244" : "#00e68a"],
            ].map(([label, val, color], i) => (
              <div className="report-stat" key={i}>
                <div className="report-stat-label">{label}</div>
                <div className="report-stat-value" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>
          <div className="section-label">Security Recommendations</div>
          <div className="recommendations">
            {(report.recommendations || []).map((r, i) => (
              <div className="rec-item" key={i}><span className="rec-arrow">→</span> {r}</div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <span>File Integrity Guardian v1.0</span>
        <span>Built by Gaurav Kalsait • Python + React</span>
      </footer>
    </div>
  );
}