"use client";

import { useEffect, useState } from "react";

const CONFIG_KEY = "winnie-cloud-config";
const TOKEN_KEY = "winnie-github-token";
const SYNC_KEY = "winnie-cloud-state";
const DATA_PREFIX = "winnie-";
const META_KEYS = new Set([CONFIG_KEY, TOKEN_KEY, SYNC_KEY]);
const DEFAULT_CONFIG = {
  repository: "",
  path: "workbench.json",
  branch: "main",
  rememberToken: false,
  autoSync: false
};

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function parseRepository(repository) {
  const match = repository.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) throw new Error("仓库格式应为 owner/name");
  return { owner: match[1], repo: match[2] };
}

function readConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "null") };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function readToken(config = readConfig()) {
  return (config.rememberToken ? localStorage.getItem(TOKEN_KEY) : null)
    || sessionStorage.getItem(TOKEN_KEY)
    || "";
}

function readSyncState() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) || "null") || {
      sha: null,
      dirty: false,
      kind: "idle",
      message: "尚未连接",
      lastSyncedAt: null
    };
  } catch {
    return { sha: null, dirty: false, kind: "idle", message: "尚未连接", lastSyncedAt: null };
  }
}

function saveSyncState(patch) {
  const next = { ...readSyncState(), ...patch };
  localStorage.setItem(SYNC_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("winnie:cloud-status", { detail: next }));
  return next;
}

function saveCredentials(config, token) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  sessionStorage.setItem(TOKEN_KEY, token);
  if (config.rememberToken) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("winnie:cloud-config-change"));
}

function collectWorkbenchData() {
  const records = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(DATA_PREFIX) && !META_KEYS.has(key)) {
      records[key] = localStorage.getItem(key);
    }
  }
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), records };
}

function applySnapshot(snapshot) {
  if (snapshot.schemaVersion !== 1 || !snapshot.records) {
    throw new Error("备份文件格式不受支持");
  }
  const existingKeys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(DATA_PREFIX) && !META_KEYS.has(key)) existingKeys.push(key);
  }
  existingKeys.forEach((key) => localStorage.removeItem(key));
  Object.entries(snapshot.records).forEach(([key, value]) => {
    if (key.startsWith(DATA_PREFIX) && !META_KEYS.has(key) && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  });
}

async function readRemoteFile(config, token) {
  const { owner, repo } = parseRepository(config.repository);
  const path = config.path.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub 读取失败（${response.status}）`);
  return response.json();
}

async function uploadFile(config, token, expectedSha) {
  const latest = await readRemoteFile(config, token);
  if ((expectedSha || null) !== (latest?.sha || null)) {
    const error = new Error("云端数据已被其他设备修改，已停止自动覆盖");
    error.code = "CONFLICT";
    throw error;
  }
  const { owner, repo } = parseRepository(config.repository);
  const path = config.path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
    method: "PUT",
    headers: { ...githubHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Sync workbench ${new Date().toISOString()}`,
      content: encodeBase64(JSON.stringify(collectWorkbenchData(), null, 2)),
      branch: config.branch,
      ...(latest?.sha ? { sha: latest.sha } : {})
    })
  });
  if (!response.ok) throw new Error(`GitHub 上传失败（${response.status}）`);
  return response.json();
}

export function CloudAutoSync() {
  useEffect(() => {
    let uploadTimer;
    let checking = false;

    const scheduleUpload = () => {
      const config = readConfig();
      if (!config.autoSync || !readToken(config)) return;
      saveSyncState({
        dirty: true,
        kind: navigator.onLine ? "working" : "offline",
        message: navigator.onLine ? "有修改，等待自动同步…" : "当前离线，联网后自动同步"
      });
      window.clearTimeout(uploadTimer);
      uploadTimer = window.setTimeout(runUpload, 15000);
    };

    const runUpload = async () => {
      const config = readConfig();
      const token = readToken(config);
      const state = readSyncState();
      if (!config.autoSync || !token || !state.dirty || checking) return;
      if (!navigator.onLine) {
        saveSyncState({ kind: "offline", message: "当前离线，联网后自动同步" });
        return;
      }
      if (!state.sha) {
        saveSyncState({ kind: "conflict", message: "请先手动上传或恢复一次，再开启自动同步" });
        return;
      }
      checking = true;
      saveSyncState({ kind: "working", message: "正在自动同步…" });
      try {
        const result = await uploadFile(config, token, state.sha);
        saveSyncState({
          sha: result.content.sha,
          dirty: false,
          kind: "success",
          message: "已自动同步",
          lastSyncedAt: new Date().toISOString()
        });
      } catch (error) {
        saveSyncState({
          kind: error.code === "CONFLICT" ? "conflict" : "error",
          message: error.message
        });
      } finally {
        checking = false;
      }
    };

    const checkRemote = async () => {
      const config = readConfig();
      const token = readToken(config);
      const state = readSyncState();
      if (!config.autoSync || !token || !navigator.onLine || checking) return;
      checking = true;
      try {
        const file = await readRemoteFile(config, token);
        if (!file || file.sha === state.sha) {
          if (state.dirty) window.clearTimeout(uploadTimer), uploadTimer = window.setTimeout(runUpload, 1000);
          else if (file) saveSyncState({ kind: "success", message: "云端已是最新" });
          return;
        }
        if (!state.sha) {
          saveSyncState({ kind: "conflict", message: "发现云端备份，请先手动恢复" });
          return;
        }
        if (state.dirty) {
          saveSyncState({ kind: "conflict", message: "两台设备都有修改，请手动选择上传或恢复" });
          return;
        }
        const snapshot = JSON.parse(decodeBase64(file.content));
        applySnapshot(snapshot);
        saveSyncState({
          sha: file.sha,
          dirty: false,
          kind: "success",
          message: "已自动获取云端更新",
          lastSyncedAt: new Date().toISOString()
        });
        window.setTimeout(() => window.location.reload(), 400);
      } catch (error) {
        saveSyncState({ kind: "error", message: error.message });
      } finally {
        checking = false;
      }
    };

    const handleFocus = () => checkRemote();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkRemote();
    };
    const handleOnline = () => {
      saveSyncState({ kind: "working", message: "网络已恢复，正在检查…" });
      checkRemote();
    };

    window.addEventListener("winnie:data-change", scheduleUpload);
    window.addEventListener("winnie:cloud-config-change", checkRemote);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(checkRemote, 60000);
    checkRemote();

    return () => {
      window.clearTimeout(uploadTimer);
      window.clearInterval(interval);
      window.removeEventListener("winnie:data-change", scheduleUpload);
      window.removeEventListener("winnie:cloud-config-change", checkRemote);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  return null;
}

export default function CloudSyncPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [token, setToken] = useState("");
  const [remote, setRemote] = useState(null);
  const [status, setStatus] = useState({ kind: "idle", message: "尚未连接" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const savedConfig = readConfig();
    setConfig(savedConfig);
    setToken(readToken(savedConfig));
    setStatus(readSyncState());
    const handleStatus = (event) => setStatus(event.detail);
    window.addEventListener("winnie:cloud-status", handleStatus);
    return () => window.removeEventListener("winnie:cloud-status", handleStatus);
  }, []);

  async function connect() {
    setBusy(true);
    setStatus({ kind: "working", message: "正在检查仓库…" });
    try {
      saveCredentials(config, token);
      const file = await readRemoteFile(config, token);
      setRemote(file);
      const nextStatus = {
        kind: "success",
        message: file ? "连接成功，已找到云端备份" : "连接成功，云端还没有备份文件"
      };
      setStatus(nextStatus);
      saveSyncState(nextStatus);
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    setBusy(true);
    setStatus({ kind: "working", message: "正在上传本地数据…" });
    try {
      saveCredentials(config, token);
      const expectedSha = remote?.sha || readSyncState().sha || null;
      const result = await uploadFile(config, token, expectedSha);
      setRemote({ sha: result.content.sha });
      const nextStatus = {
        sha: result.content.sha,
        dirty: false,
        kind: "success",
        message: "本地数据已安全上传",
        lastSyncedAt: new Date().toISOString()
      };
      setStatus(nextStatus);
      saveSyncState(nextStatus);
    } catch (error) {
      setStatus({ kind: error.code === "CONFLICT" ? "conflict" : "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!window.confirm("云端数据将替换这台设备上的工作台数据，确定继续吗？")) return;
    setBusy(true);
    setStatus({ kind: "working", message: "正在恢复云端数据…" });
    try {
      const file = await readRemoteFile(config, token);
      if (!file?.content) throw new Error("云端还没有可恢复的备份");
      applySnapshot(JSON.parse(decodeBase64(file.content)));
      saveSyncState({
        sha: file.sha,
        dirty: false,
        kind: "success",
        message: "恢复成功，正在重新载入工作台…",
        lastSyncedAt: new Date().toISOString()
      });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
      setBusy(false);
    }
  }

  return (
    <>
      <header className="feature-hero">
        <span className="feature-icon">☁</span>
        <div><p className="eyebrow">PRIVATE BACKUP</p><h1>云同步</h1><p>电脑和手机安全共享同一份工作台数据。</p></div>
      </header>
      <section className="card cloud-sync-card">
        <div className="section-heading">
          <div><span className="section-kicker">GITHUB</span><h2>连接设置</h2></div>
          <span className={`sync-state ${status.kind}`}>{status.message}</span>
        </div>
        <p className="sync-note">修改会先保存在本机；开启自动同步后，停止操作 15 秒自动上传，并在重新打开或切回页面时检查云端。照片暂不上传。</p>
        <label className="sync-field"><span>GitHub Token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_…" autoComplete="off" /></label>
        <label className="sync-toggle"><input type="checkbox" checked={config.rememberToken} onChange={(event) => setConfig({ ...config, rememberToken: event.target.checked })} /><span><b>记住此设备</b><small>仅在自己的电脑或手机上开启</small></span></label>
        <label className="sync-field"><span>仓库（owner/name）</span><input value={config.repository} onChange={(event) => setConfig({ ...config, repository: event.target.value })} placeholder="winnie/my-workbench-data" /></label>
        <div className="sync-grid">
          <label className="sync-field"><span>文件路径</span><input value={config.path} onChange={(event) => setConfig({ ...config, path: event.target.value })} /></label>
          <label className="sync-field"><span>分支</span><input value={config.branch} onChange={(event) => setConfig({ ...config, branch: event.target.value })} /></label>
        </div>
        <label className="sync-toggle"><input type="checkbox" checked={config.autoSync} onChange={(event) => setConfig({ ...config, autoSync: event.target.checked })} /><span><b>开启自动同步</b><small>保留冲突保护，不会静默覆盖另一台设备</small></span></label>
        <button className="sync-primary" onClick={connect} disabled={busy || !token || !config.repository}>保存设置并检查</button>
        <div className="sync-actions">
          <button onClick={upload} disabled={busy || status.kind === "idle"}>立即上传</button>
          <button onClick={restore} disabled={busy || !remote}>从云端恢复</button>
        </div>
      </section>
    </>
  );
}
