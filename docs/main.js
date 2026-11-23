// Pulls the latest releases from GitHub so the site updates itself on every new release.
(function () {
  var REPO = "AFawzy07/sahm-downloader";
  var API = "https://api.github.com/repos/" + REPO + "/releases?per_page=5";
  var RELEASES_PAGE = "https://github.com/" + REPO + "/releases";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  var arabicDate = function (iso) {
    try {
      return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    } catch (e) { return iso.slice(0, 10); }
  };

  var formatSize = function (bytes) {
    var mb = bytes / (1024 * 1024);
    return (mb >= 100 ? Math.round(mb) : mb.toFixed(1)) + " ميجا";
  };

  // Prefer a Windows installer asset, then anything downloadable.
  var pickAsset = function (assets) {
    var order = [/\.exe$/i, /\.msi$/i, /\.zip$/i];
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < assets.length; j++) {
        if (order[i].test(assets[j].name)) return assets[j];
      }
    }
    return assets[0] || null;
  };

  // Strip the most common markdown so notes read as plain text.
  var plainNotes = function (body) {
    if (!body) return "مفيش ملاحظات للإصدار ده.";
    var text = body
      .replace(/\r/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*[-*]\s+/gm, "• ")
      .trim();
    return text.length > 600 ? text.slice(0, 600) + "…" : text;
  };

  var renderReleases = function (list) {
    var box = $("[data-releases]");
    if (!box) return;
    box.textContent = "";
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "لسه مفيش إصدارات منشورة. تابعنا على GitHub.";
      box.appendChild(empty);
      return;
    }
    list.slice(0, 3).forEach(function (r) {
      var row = document.createElement("article");
      row.className = "release";

      var head = document.createElement("div");
      head.className = "release-head";
      var tag = document.createElement("a");
      tag.className = "release-tag";
      tag.href = r.html_url;
      tag.textContent = r.name || r.tag_name;
      var date = document.createElement("span");
      date.className = "release-date";
      date.textContent = arabicDate(r.published_at || r.created_at);
      head.appendChild(tag);
      head.appendChild(date);

      // One element per line with dir="auto", so Arabic and English notes each read the right way.
      var notes = document.createElement("div");
      notes.className = "release-notes";
      plainNotes(r.body).split("\n").forEach(function (line) {
        var el = document.createElement("p");
        el.dir = "auto";
        el.textContent = line || " ";
        notes.appendChild(el);
      });

      row.appendChild(head);
      row.appendChild(notes);
      box.appendChild(row);
    });
  };

  var applyLatest = function (latest) {
    var version = latest.tag_name;
    $$("[data-version]").forEach(function (el) { el.textContent = version; });
    var pill = $("[data-version-pill]");
    if (pill) pill.hidden = false;

    var asset = pickAsset(latest.assets || []);
    var href = asset ? asset.browser_download_url : latest.html_url;
    $$("[data-download-link]").forEach(function (a) { a.href = href; });

    if (asset) {
      var size = $("[data-size]");
      var sep = $("[data-size-sep]");
      if (size) size.textContent = formatSize(asset.size);
      if (sep) sep.hidden = false;
    }

    var meta = $("[data-cta-meta]");
    if (meta) meta.textContent = "الإصدار " + version + " · " + arabicDate(latest.published_at || latest.created_at);
  };

  var fallback = function () {
    $$("[data-download-link]").forEach(function (a) { a.href = RELEASES_PAGE + "/latest"; });
    var box = $("[data-releases]");
    if (box) {
      box.textContent = "";
      var p = document.createElement("p");
      p.className = "muted";
      p.textContent = "مقدرناش نجيب الإصدارات دلوقتي. شوفها على GitHub من اللينك تحت.";
      box.appendChild(p);
    }
  };

  // Until the API answers, send download clicks to the releases page.
  $$("[data-download-link]").forEach(function (a) { a.href = RELEASES_PAGE + "/latest"; });

  fetch(API, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (all) {
      var published = all.filter(function (r) { return !r.draft && !r.prerelease; });
      renderReleases(published);
      if (published.length) applyLatest(published[0]);
    })
    .catch(fallback);
})();
