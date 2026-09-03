/* data/manual.json をブラウザ上で編集して書き出す内部ツール。
 * サーバ保存はしない。ダウンロードしたファイルをリポジトリに commit して使う。
 */
(function () {
  "use strict";

  var EMPTY = {
    _readme: "人手の調整ファイル。crawler/run.js が data/events.js を生成する最後に適用する。",
    exclude: [],
    _exclude_help: "この id のイベントを一覧から消す（削除依頼への対応など）。id は data/events.js を参照。",
    pins: [],
    _pins_help: "この id を『新着イベント』枠に固定表示する（featured=true）。",
    overrides: {},
    _overrides_help: '{ "<id>": { "summary": "…" } } の形で個別に上書き。',
    additional: [],
    _additional_help: "クロールで拾えないイベントを手動追加。data/events.js と同じスキーマの完全な1件（id 必須）。",
  };

  var model = JSON.parse(JSON.stringify(EMPTY));
  var $ = function (id) { return document.getElementById(id); };
  var v = function (id) { return ($(id).value || "").trim(); };

  // crawler/lib/slug.js と同じ id 生成: YYYYMMDD-<sha1(area|date|name) 先頭10hex>
  async function eventId(area, date, name) {
    var key = (area + "|" + date + "|" + name).normalize("NFKC").trim();
    var buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(key));
    var hex = Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
    return (date || "0000-00-00").replace(/-/g, "") + "-" + hex.slice(0, 10);
  }

  function jpDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? +m[1] + "年" + +m[2] + "月" + +m[3] + "日" : iso;
  }

  function render() {
    // additional
    var al = $("addList");
    al.innerHTML = model.additional.length
      ? ""
      : '<p class="form__hint">まだありません。</p>';
    model.additional.forEach(function (ev, i) {
      var d = document.createElement("div");
      d.className = "adm-item";
      d.innerHTML =
        '<span class="adm-item__date">' + esc(ev.dateText || ev.date || "") + "</span>" +
        '<span class="adm-item__area">' + esc(ev.area || "?") + "</span>" +
        '<span class="adm-item__name">' + esc(ev.name || "") + "</span>" +
        '<button class="adm-item__rm" data-i="' + i + '">削除</button>';
      al.appendChild(d);
    });
    al.querySelectorAll(".adm-item__rm").forEach(function (b) {
      b.addEventListener("click", function () {
        model.additional.splice(+b.getAttribute("data-i"), 1);
        render();
      });
    });

    // exclude
    var el = $("exList");
    el.innerHTML = model.exclude.length ? "" : '<p class="form__hint">なし。</p>';
    model.exclude.forEach(function (id, i) {
      var d = document.createElement("div");
      d.className = "adm-item";
      d.innerHTML =
        '<span class="adm-item__date" style="font-size:.8rem">' + esc(id) + "</span>" +
        '<button class="adm-item__rm" data-i="' + i + '">戻す</button>';
      el.appendChild(d);
    });
    el.querySelectorAll(".adm-item__rm").forEach(function (b) {
      b.addEventListener("click", function () {
        model.exclude.splice(+b.getAttribute("data-i"), 1);
        render();
      });
    });

    $("preview").textContent = JSON.stringify(model, null, 2);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 読み込み（デプロイ先では ../data/manual.json が同一オリジンで読める）
  fetch("../data/manual.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (j && typeof j === "object") {
        model = Object.assign(JSON.parse(JSON.stringify(EMPTY)), j);
        model.additional = j.additional || [];
        model.exclude = j.exclude || [];
        model.pins = j.pins || [];
        model.overrides = j.overrides || {};
        $("loadStatus").textContent = "現在の manual.json を読み込みました（追加 " +
          model.additional.length + " 件）。";
        $("loadStatus").className = "form__status is-ok";
      } else {
        $("loadStatus").textContent = "manual.json を読めなかったので空から始めます。";
        $("loadStatus").className = "form__status";
      }
      render();
    })
    .catch(function () {
      $("loadStatus").textContent = "manual.json を読めなかったので空から始めます（ローカルファイルは制限あり）。";
      $("loadStatus").className = "form__status";
      render();
    });

  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = v("a_name"), date = v("a_date"), area = v("a_area"), url = v("a_url");
    if (!name || !date || !area || !url) {
      $("addStatus").textContent = "* の項目（名称・開始日・エリア・出典URL）は必須です。";
      $("addStatus").className = "form__status is-err";
      return;
    }
    var end = v("a_end");
    var ev = {
      name: name,
      area: area,
      date: date,
      dateText: v("a_datetext") || jpDate(date),
      image: "",
      summary: v("a_summary"),
      description: v("a_summary"),
      sourceUrl: url,
      crawledAt: new Date().toISOString().slice(0, 10),
      featured: $("a_featured").checked,
    };
    if (end && end !== date) ev.endDate = end;
    ["venue:a_venue", "address:a_address", "time:a_time", "fee:a_fee", "organizer:a_org"].forEach(function (p) {
      var kv = p.split(":");
      var val = v(kv[1]);
      if (val) ev[kv[0]] = val;
    });

    eventId(area, date, name).then(function (id) {
      ev.id = id;
      // 同じ id があれば置き換え
      var idx = model.additional.findIndex(function (x) { return x.id === id; });
      if (idx >= 0) model.additional[idx] = ev;
      else model.additional.push(ev);
      model.additional.sort(function (a, b) { return (a.date || "") < (b.date || "") ? -1 : 1; });
      $("addForm").reset();
      $("addStatus").textContent = "追加しました（id: " + id + "）。";
      $("addStatus").className = "form__status is-ok";
      render();
    });
  });

  $("exAdd").addEventListener("click", function () {
    var id = v("exId");
    if (id && model.exclude.indexOf(id) < 0) model.exclude.push(id);
    $("exId").value = "";
    render();
  });

  function currentJson() { return JSON.stringify(model, null, 2) + "\n"; }

  $("dl").addEventListener("click", function () {
    var blob = new Blob([currentJson()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "manual.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    $("outStatus").textContent = "ダウンロードしました。data/manual.json を差し替えて commit してください。";
    $("outStatus").className = "form__status is-ok";
  });

  $("cp").addEventListener("click", function () {
    var text = currentJson();
    (navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject()
    ).then(
      function () { $("outStatus").textContent = "コピーしました。"; $("outStatus").className = "form__status is-ok"; },
      function () { $("outStatus").textContent = "コピーできませんでした。下のテキストを選択してください。"; $("outStatus").className = "form__status is-err"; }
    );
  });
})();
