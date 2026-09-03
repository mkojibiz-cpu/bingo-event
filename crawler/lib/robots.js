import robotsParser from "robots-parser";
import { fetchText } from "./fetch.js";
import { USER_AGENT } from "../config.js";

const cache = new Map();

/**
 * 対象 URL がその原点の robots.txt で許可されているか。
 * robots.txt が取得できない / ルールが無い場合は許可扱い（true）。
 */
export async function isAllowed(url) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }
  const robotsUrl = `${origin}/robots.txt`;

  if (!cache.has(robotsUrl)) {
    let txt = "";
    try {
      txt = await fetchText(robotsUrl);
    } catch {
      txt = ""; // robots.txt 無し = 制限なし
    }
    cache.set(robotsUrl, robotsParser(robotsUrl, txt));
  }

  const verdict = cache.get(robotsUrl).isAllowed(url, USER_AGENT);
  return verdict !== false; // undefined（該当ルール無し）は許可
}
