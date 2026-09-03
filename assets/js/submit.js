/* イベント投稿フォーム。
 * 既定はメール（mailto:）＋コピー。バックエンド不要。
 * 送信先メールは MAIL_TO を書き換える。
 * フォーム送信サービス（Formspree / Web3Forms 等）を使う場合は
 * window.FORM_ENDPOINT に POST 先URLを入れると JSON も送る。
 */
(function () {
  "use strict";
  var MAIL_TO = "info@bingo-event.com";

  var form = document.getElementById("submitForm");
  if (!form) return;
  var statusEl = document.getElementById("status");
  var val = function (id) { return (document.getElementById(id).value || "").trim(); };

  function collect() {
    return {
      name: val("f_name"),
      date: val("f_date"),
      area: val("f_area"),
      venue: val("f_venue"),
      url: val("f_url"),
      note: val("f_note"),
      contact: val("f_contact"),
    };
  }

  function asText(d) {
    return (
      "【イベント名】" + d.name + "\n" +
      "【開催日】" + d.date + "\n" +
      "【エリア】" + d.area + "\n" +
      "【会場】" + (d.venue || "（未記入）") + "\n" +
      "【公式・参考URL】" + d.url + "\n" +
      "【ひとこと・補足】" + (d.note || "（なし）") + "\n" +
      "【連絡先】" + (d.contact || "（なし）") + "\n" +
      "----\nびんごイベントナビ 投稿フォームより"
    );
  }

  function missing(d) {
    if (!d.name) return "イベント名";
    if (!d.date) return "開催日";
    if (!d.area) return "エリア";
    if (!d.url) return "公式・参考URL";
    return null;
  }

  function setStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = "form__status " + (ok ? "is-ok" : "is-err");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (val("company")) return; // ハニーポット
    var d = collect();
    var miss = missing(d);
    if (miss) { setStatus("「" + miss + "」を入力してください。", false); return; }

    if (window.FORM_ENDPOINT) {
      fetch(window.FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(d),
      })
        .then(function (r) {
          if (r.ok) { setStatus("送信しました。ありがとうございます。", true); form.reset(); }
          else throw new Error("bad response");
        })
        .catch(function () { openMail(d); });
    } else {
      openMail(d);
    }
  });

  function openMail(d) {
    var subject = "【イベント掲載依頼】" + d.name;
    window.location.href =
      "mailto:" + MAIL_TO +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(asText(d));
    setStatus("メールソフトが開かない場合は「内容をコピー」して送ってください。", true);
  }

  document.getElementById("copyBtn").addEventListener("click", function () {
    var d = collect();
    var text = asText(d);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { setStatus("コピーしました。" + MAIL_TO + " に貼り付けてください。", true); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); setStatus("コピーしました。", true); }
    catch (e) { setStatus("コピーできませんでした。手動で選択してください。", false); }
    document.body.removeChild(ta);
  }
})();
