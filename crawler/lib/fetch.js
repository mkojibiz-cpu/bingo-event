import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT, REQUEST_DELAY_MS } from "../config.js";

const CACHE_DIR = fileURLToPath(new URL("../.cache/", import.meta.url));
let lastRequestAt = 0;

async function politeDelay() {
  const wait = REQUEST_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function cachePath(url) {
  const key = Buffer.from(url).toString("base64url").slice(0, 120);
  return path.join(CACHE_DIR, key + ".json");
}

/**
 * 1日1回・低速・条件付きリクエストで HTML を取得する。
 * ETag / Last-Modified をキャッシュし、304 のときは前回本文を返す。
 */
export async function fetchText(url, { timeoutMs = 15000, retries = 2 } = {}) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cp = cachePath(url);
  let cached = null;
  try {
    cached = JSON.parse(fs.readFileSync(cp, "utf8"));
  } catch {
    /* キャッシュ無し */
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
    await politeDelay();

    const headers = { "User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.8" };
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, redirect: "follow", signal: ctrl.signal });
      clearTimeout(timer);

      if (res.status === 304 && cached) return cached.body;
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body = await res.text();
      try {
        fs.writeFileSync(
          cp,
          JSON.stringify({
            body,
            etag: res.headers.get("etag") || null,
            lastModified: res.headers.get("last-modified") || null,
            fetchedAt: new Date().toISOString(),
          })
        );
      } catch {
        /* キャッシュ書き込み失敗は無視 */
      }
      return body;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
  }
  throw lastErr || new Error(`fetch failed: ${url}`);
}
