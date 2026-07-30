"use client";

import { useEffect, useState } from "react";

const CONFIG_KEY = "winnie-cloud-config";
const TOKEN_KEY = "winnie-github-token";
const DATA_PREFIX = "winnie-";

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

function collectWorkbenchData() {
  const records = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(DATA_PREFIX) && key !== CONFIG_KEY) {
      records[key] = localStorage.getItem(key);
    }
  }
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    records
  };
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

export default function CloudSyncPage() {
  const [config, setConfig] = useState({ repository: "", path: "workbench.json", branch: "main" });
  const [token, setToken] = useState("");
  const [remote, setRemote] = useState(null);
  const [status, setStatus] = useState({ kind: "idle", message: "尚未连接" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const savedConfig = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
      if (savedConfig) setConfig(savedConfig);
      setToken(sessionStorage.getItem(TOKEN_KEY) || "");
    } catch {
      localStorage.removeItem(CONFIG_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  function saveCredentials() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  async function connect() {
    setBusy(true);
    setStatus({ kind: "working", message: "正在检查仓库…" });
    try {
      saveCredentials();
      const file = await readRemoteFile(config, token);
      setRemote(file);
      setStatus({
        kind: "success",
        message: file ? "连接成功，已找到云端备份" : "连接成功，云端还没有备份文件"
      });
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
      saveCredentials();
      const latest = await readRemoteFile(config, token);
      if (remote?.sha && latest?.sha !== remote.sha) {
        throw new Error("云端数据已被其他设备修改，请重新连接后再决定是否上传");
      }
      if (!remote?.sha && latest?.sha) {
        setRemote(latest);
        throw new Error("发现已有云端数据，为防止覆盖已停止上传，请重新连接");
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
      const result = await response.json();
      setRemote({ ...latest, sha: result.content.sha });
      setStatus({ kind: "success", message: "本地数据已安全上传" });
    } catch (error) {
      setStatus({ kind: "error", message: error.message });
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
      const snapshot = JSON.parse(decodeBase64(file.content));
      if (snapshot.schemaVersion !== 1 || !snapshot.records) throw new Error("备份文件格式不受支持");
      Object.entries(snapshot.records).forEach(([key, value]) => {
        if (key.startsWith(DATA_PREFIX) && key !== CONFIG_KEY && typeof value === "string") {
          localStorage.setItem(key, value);
        }
      });
      setStatus({ kind: "success", message: "恢复成功，正在重新载入工作台…" });
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
        <div><p className="eyebrow">PRIVATE BACKUP</p><h1>云同步实验</h1><p>将工作台文本数据备份到你自己的 GitHub 私有仓库。</p></div>
      </header>
      <section className="card cloud-sync-card">
        <div className="section-heading">
          <div><span className="section-kicker">GITHUB</span><h2>连接设置</h2></div>
          <span className={`sync-state ${status.kind}`}>{status.message}</span>
        </div>
        <p className="sync-note">Token 只保留到当前浏览器标签会话结束；照片暂不上传。建议使用仅能访问目标仓库 Contents 的 fine-grained token。</p>
        <label className="sync-field"><span>GitHub Token</span><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="github_pat_…" autoComplete="off" /></label>
        <label className="sync-field"><span>仓库（owner/name）</span><input value={config.repository} onChange={(event) => setConfig({ ...config, repository: event.target.value })} placeholder="winnie/my-workbench-data" /></label>
        <div className="sync-grid">
          <label className="sync-field"><span>文件路径</span><input value={config.path} onChange={(event) => setConfig({ ...config, path: event.target.value })} /></label>
          <label className="sync-field"><span>分支</span><input value={config.branch} onChange={(event) => setConfig({ ...config, branch: event.target.value })} /></label>
        </div>
        <button className="sync-primary" onClick={connect} disabled={busy || !token || !config.repository}>连接并检查</button>
        <div className="sync-actions">
          <button onClick={upload} disabled={busy || status.kind === "idle"}>上传本地数据</button>
          <button onClick={restore} disabled={busy || !remote}>从云端恢复</button>
        </div>
      </section>
    </>
  );
}
