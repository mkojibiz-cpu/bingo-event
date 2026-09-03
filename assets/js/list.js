/* ============================================================
   イベント一覧ページの描画（デザイン：潮見表）
   - 月バー（これからのイベントを海図の目盛に配置）
   - 新着イベント（電光掲示板 3セル）
   - エリアフィルタ（時刻表タブ）
   - 3列コンパクト時刻表 + ページャ
   データは data/events.js が定義する window.EVENTS を使用。
   ============================================================ */
(function () {
  "use strict";

  var PER_PAGE = 20;
  var FEATURE_COUNT = 3;
  var events = Array.isArray(window.EVENTS) ? window.EVENTS.slice() : [];

  /* ---------- 小さなユーティリティ ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hashHue(str) {
    var h = 0;
    for (var i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) >>> 0;
    return h % 360;
  }
  // 短い日付（例: 5/16、範囲なら 5/16〜）
  function shortDate(ev) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ev.date || "");
    var base = m ? parseInt(m[2], 10) + "/" + parseInt(m[3], 10) : (ev.date || "");
    var ranged = (ev.endDate && ev.endDate !== ev.date) || /[〜～]/.test(ev.dateText || "");
    return ranged ? base + "〜" : base;
  }
  // 一覧行の「写真プレート」（写真＋時刻スタンプ）
  function plateHtml(ev) {
    var hue = hashHue(ev.id || ev.name);
    var stamp = '<span class="tt-row__stamp">' + esc(shortDate(ev)) + "</span>";
    var img = ev.image ? '<img src="' + esc(ev.image) + '" alt="" loading="lazy">' : "";
    return '<div class="tt-row__plate" style="--h:' + hue + '">' + img + stamp + "</div>";
  }

  // 今日の日付（閲覧者のローカル日付）を YYYY-MM-DD で
  function todayStr() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  var TODAY = todayStr();

  /* ---------- 並び替え ---------- */
  // 新着: featured 優先 → crawledAt 降順 → date 昇順
  function byNewest(a, b) {
    if (!!b.featured !== !!a.featured) return a.featured ? -1 : 1;
    if (a.crawledAt !== b.crawledAt) return a.crawledAt < b.crawledAt ? 1 : -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  }
  // グリッド: これから開催されるものを開催日の近い順に先頭へ。
  //           終了済み（今日より前）は末尾に、新しく終わったものから。
  //           複数日イベントは endDate があればそちらで開催中/終了を判定。
  function endOf(ev) { return ev.endDate || ev.date; }
  function byUpcoming(a, b) {
    var aPast = endOf(a) < TODAY, bPast = endOf(b) < TODAY;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (a.date === b.date) return 0;
    if (aPast) return a.date < b.date ? 1 : -1;   // 過去は降順
    return a.date < b.date ? -1 : 1;              // 未来は昇順
  }

  var featured = events.slice().sort(byNewest).slice(0, FEATURE_COUNT);
  var featuredIds = {};
  featured.forEach(function (ev) { featuredIds[ev.id] = true; });
  // グリッドは「新着で出した3件を除いた全件」
  var gridAll = events.filter(function (ev) { return !featuredIds[ev.id]; }).sort(byUpcoming);

  /* ---------- 新着イベント（電光掲示板） ---------- */
  function renderFeatured() {
    var box = document.getElementById("featured");
    if (!box) return;
    box.innerHTML = featured.map(function (ev) {
      return '<a class="tt-board__row" href="detail.html?id=' + encodeURIComponent(ev.id) + '">' +
        '<span class="tt-flag">NEW</span>' +
        '<span class="tt-board__date">' + esc(shortDate(ev)) + "</span>" +
        '<span class="tt-board__name">' + esc(ev.name) + "</span>" +
        "</a>";
    }).join("");
  }

  /* ---------- 月バー（これからのイベントを目盛に配置） ---------- */
  function renderMonthbar() {
    var bar = document.getElementById("monthbar");
    if (!bar) return;
    var WINDOW_DAYS = 60;
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var cap = document.getElementById("monthbarCaption");
    if (cap) {
      var m1 = now.getMonth() + 1;
      var m2 = ((now.getMonth() + 2 - 1) % 12) + 1;
      cap.textContent = m1 + "月〜" + m2 + "月";
    }
    events
      .filter(function (ev) { return endOf(ev) >= TODAY; })
      .sort(byUpcoming)
      .slice(0, 8)
      .forEach(function (ev) {
        var d = new Date((ev.date || "") + "T00:00:00");
        if (isNaN(d)) return;
        var days = Math.round((d - start) / 86400000);
        if (days < 0 || days > WINDOW_DAYS) return;
        var mark = document.createElement("span");
        mark.className = "tt-monthbar__mark";
        mark.style.left = ((days / WINDOW_DAYS) * 100).toFixed(1) + "%";
        mark.textContent = shortDate(ev);
        bar.appendChild(mark);
      });
  }

  /* ---------- エリアフィルタ ---------- */
  var currentArea = "すべて";
  var currentPage = 1;

  function renderFilter() {
    var box = document.getElementById("filter");
    if (!box) return;
    var areas = ["すべて"];
    events.forEach(function (ev) {
      if (ev.area && areas.indexOf(ev.area) === -1) areas.push(ev.area);
    });
    box.innerHTML = areas.map(function (area) {
      var active = area === currentArea ? " is-active" : "";
      return '<button type="button" class="filter__btn' + active + '" data-area="' + esc(area) + '">' +
        esc(area) + "</button>";
    }).join("");
    box.querySelectorAll(".filter__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentArea = btn.getAttribute("data-area");
        currentPage = 1;
        renderFilter();
        renderGrid();
      });
    });
  }

  function filteredGrid() {
    if (currentArea === "すべて") return gridAll;
    return gridAll.filter(function (ev) { return ev.area === currentArea; });
  }

  /* ---------- グリッド + ページャ描画 ---------- */
  function renderGrid() {
    var grid = document.getElementById("grid");
    var pager = document.getElementById("pager");
    if (!grid) return;

    var list = filteredGrid();
    var total = list.length;
    var pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
    if (currentPage > pageCount) currentPage = pageCount;

    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = list.slice(start, start + PER_PAGE);

    if (total === 0) {
      grid.innerHTML = '<p class="empty">該当するイベントがありません。</p>';
    } else {
      grid.innerHTML = pageItems.map(function (ev) {
        return '<a class="tt-row" href="detail.html?id=' + encodeURIComponent(ev.id) + '">' +
          plateHtml(ev) +
          '<div class="tt-row__body">' +
          '<span class="tt-row__area">' + esc(ev.area) + "</span>" +
          '<h3 class="tt-row__name">' + esc(ev.name) + "</h3>" +
          "</div></a>";
      }).join("");
    }

    if (pager) renderPager(pager, total, pageCount, start, pageItems.length);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderPager(pager, total, pageCount, start, shown) {
    var parts = [];
    parts.push('<button type="button" class="pager__btn" data-page="' + (currentPage - 1) +
      '"' + (currentPage <= 1 ? " disabled" : "") + ">前へ</button>");

    for (var p = 1; p <= pageCount; p++) {
      // ページ数が多いときは現在ページ周辺と両端だけ表示
      if (pageCount > 7 && p !== 1 && p !== pageCount && Math.abs(p - currentPage) > 1) {
        if (p === 2 || p === pageCount - 1) parts.push('<span class="pager__btn" style="border:0;background:none;cursor:default">…</span>');
        continue;
      }
      parts.push('<button type="button" class="pager__btn' + (p === currentPage ? " is-current" : "") +
        '" data-page="' + p + '">' + p + "</button>");
    }

    parts.push('<button type="button" class="pager__btn" data-page="' + (currentPage + 1) +
      '"' + (currentPage >= pageCount ? " disabled" : "") + ">次へ</button>");

    var status = total === 0
      ? "0件"
      : "全" + total + "件中 " + (start + 1) + "〜" + (start + shown) + "件を表示（" +
        currentPage + " / " + pageCount + "ページ）";
    parts.push('<p class="pager__status">' + status + "</p>");

    pager.innerHTML = parts.join("");
    pager.querySelectorAll("button.pager__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = parseInt(btn.getAttribute("data-page"), 10);
        if (!isNaN(p) && p >= 1 && p <= pageCount && p !== currentPage) {
          currentPage = p;
          renderGrid();
        }
      });
    });
  }

  /* ---------- 初期化 ---------- */
  function init() {
    if (events.length === 0) {
      var main = document.querySelector("main");
      if (main) main.insertAdjacentHTML("afterbegin",
        '<p class="empty">イベントデータを読み込めませんでした（data/events.js を確認してください）。</p>');
      return;
    }
    renderHeroCount();
    renderMonthbar();
    renderFeatured();
    renderFilter();
    renderGrid();
  }

  // ヒーローに「開催予定◯件」を表示（要素が無ければ何もしない）
  function renderHeroCount() {
    var el = document.getElementById("heroCount");
    if (!el) return;
    var upcoming = events.filter(function (ev) { return endOf(ev) >= TODAY; }).length;
    if (upcoming > 0) el.textContent = "　／　開催予定 " + upcoming + "件";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
