/* ============================================================
   イベント詳細ページの描画
   URL の ?id=<id> から該当イベントを探して表示。
   見つからない場合はフォールバック表示。
   データは data/events.js が定義する window.EVENTS を使用。
   ============================================================ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hashHue(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function areaGradient(seed) {
    var h = hashHue(seed || "x");
    // 潮見表デザインに合わせて青緑〜紺の範囲でわずかに振る
    return "linear-gradient(160deg, hsl(" + (188 + (h % 26)) + " 36% 44%), hsl(" + (200 + (h % 34)) + " 42% 26%))";
  }
  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }
  function row(label, value) {
    if (!value) return "";
    return "<tr><th>" + esc(label) + "</th><td>" + esc(value) + "</td></tr>";
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return url; }
  }

  function renderNotFound(root) {
    document.title = "イベントが見つかりません｜備後・福山イベント";
    root.innerHTML =
      '<a class="back-link" href="index.html">← イベント一覧に戻る</a>' +
      '<div class="empty">' +
      "<p>指定されたイベントが見つかりませんでした。</p>" +
      '<p><a href="index.html">イベント一覧へ</a></p>' +
      "</div>";
  }

  function renderEvent(root, ev) {
    document.title = ev.name + "｜備後・福山イベント";

    var heroStyle = ev.image
      ? 'style="background-image:url(\'' + esc(ev.image) + "')\""
      : 'style="background:' + areaGradient(ev.id || ev.name) + '"';

    var cta = ev.sourceUrl
      ? '<a class="detail__cta" href="' + esc(ev.sourceUrl) + '" target="_blank" rel="noopener">' +
        "公式・詳細ページを見る（" + esc(hostOf(ev.sourceUrl)) + "）→</a>"
      : "";

    var meta = [];
    if (ev.sourceUrl) {
      meta.push('情報元: <a href="' + esc(ev.sourceUrl) + '" target="_blank" rel="noopener">' +
        esc(ev.sourceUrl) + "</a>");
    }
    if (ev.crawledAt) meta.push("最終確認日: " + esc(ev.crawledAt));

    // 紹介文は手入力（data/manual.json）があるときだけ表示。クロール由来は空。
    var descHtml = "";
    if (ev.description && ev.description.trim()) {
      descHtml = '<div class="detail__desc">' +
        String(ev.description).split(/\n{2,}|\n/)
          .filter(function (p) { return p.trim(); })
          .map(function (p) { return "<p>" + esc(p.trim()) + "</p>"; })
          .join("") +
        "</div>";
    }

    root.innerHTML =
      '<a class="back-link" href="index.html">← イベント一覧に戻る</a>' +
      '<div class="detail__hero" ' + heroStyle + ">" +
      '<span class="area-badge">' + esc(ev.area) + "</span>" +
      "</div>" +
      '<div class="detail__head">' +
      "<h1>" + esc(ev.name) + "</h1>" +
      '<p class="detail__date">📅 ' + esc(ev.dateText) + "</p>" +
      "</div>" +
      "<table class=\"detail__table\">" +
      row("日時", ev.time) +
      row("会場", ev.venue) +
      row("住所", ev.address) +
      row("料金", ev.fee) +
      row("主催", ev.organizer) +
      "</table>" +
      descHtml +
      cta +
      '<p class="detail__notice">このページは各主催者・自治体などが公開している' +
      "日時・会場などの事実情報をまとめたものです。内容は変更される場合があります。" +
      "詳しい紹介や最新情報は必ずリンク先の公式ページでご確認ください。</p>" +
      (meta.length ? '<div class="detail__meta">' + meta.join("<br>") + "</div>" : "");
  }

  function init() {
    var root = document.getElementById("detail");
    if (!root) return;

    var events = Array.isArray(window.EVENTS) ? window.EVENTS : [];
    var id = getParam("id");
    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === id) { ev = events[i]; break; }
    }

    if (!ev) renderNotFound(root);
    else renderEvent(root, ev);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
