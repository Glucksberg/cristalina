export function renderPortalHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cristalina Live Portal</title>
    <style>
      :root {
        --bg: #f6f2ea;
        --bg-deep: #efe6d8;
        --panel: rgba(255, 251, 244, 0.82);
        --panel-strong: rgba(255, 248, 238, 0.96);
        --text: #1d231f;
        --muted: #5f675f;
        --line: rgba(32, 51, 42, 0.12);
        --accent: #146356;
        --accent-soft: rgba(20, 99, 86, 0.12);
        --warn: #b65c1a;
        --error: #b3261e;
        --ok: #2b6e43;
        --shadow: 0 24px 64px rgba(37, 48, 37, 0.10);
        --radius: 24px;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(20, 99, 86, 0.18), transparent 32%),
          radial-gradient(circle at top right, rgba(182, 92, 26, 0.12), transparent 28%),
          linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
        color: var(--text);
        font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
      }

      .shell {
        width: min(1380px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 48px;
      }

      .hero {
        position: relative;
        overflow: hidden;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: calc(var(--radius) + 6px);
        background: linear-gradient(145deg, rgba(255,255,255,0.66), rgba(255,247,238,0.88));
        box-shadow: var(--shadow);
      }

      .hero::after {
        content: "";
        position: absolute;
        inset: auto -10% -35% auto;
        width: 320px;
        height: 320px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(20, 99, 86, 0.18), transparent 70%);
      }

      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 14px;
      }

      h1, h2, h3 {
        margin: 0;
        font-family: "Space Grotesk", "Avenir Next Condensed", sans-serif;
        letter-spacing: -0.03em;
      }

      h1 {
        font-size: clamp(32px, 5vw, 58px);
        line-height: 0.96;
        max-width: 760px;
      }

      .hero-copy {
        max-width: 760px;
        color: var(--muted);
        margin-top: 14px;
        line-height: 1.55;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .hero-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255, 252, 246, 0.88);
        color: var(--text);
        text-decoration: none;
        font-weight: 700;
        box-shadow: 0 10px 28px rgba(37, 48, 37, 0.08);
      }

      .hero-link.primary {
        background: linear-gradient(135deg, rgba(20, 99, 86, 0.95), rgba(27, 123, 108, 0.88));
        color: #f6fffb;
      }

      .meta-row,
      .domain-grid,
      .dual-grid,
      .activity-grid,
      .reasoning-grid {
        display: grid;
        gap: 16px;
      }

      .meta-row {
        margin-top: 22px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      }

      .meta-pill,
      .panel,
      .flow-card,
      .process-card,
      .reasoning-card,
      .summary-card,
      .projection-card,
      .activity-card {
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--panel);
        backdrop-filter: blur(14px);
      }

      .meta-pill {
        padding: 14px 16px;
      }

      .meta-pill strong {
        display: block;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }

      .meta-pill span {
        font-size: 20px;
        font-weight: 700;
      }

      .connection {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--warn);
        box-shadow: 0 0 0 8px rgba(182, 92, 26, 0.10);
        transition: background 150ms ease, box-shadow 150ms ease;
      }

      .dot.ok {
        background: var(--ok);
        box-shadow: 0 0 0 8px rgba(43, 110, 67, 0.10);
      }

      .section {
        margin-top: 22px;
      }

      .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .section-head p {
        margin: 0;
        color: var(--muted);
        font-size: 14px;
      }

      .domain-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .flow-card {
        padding: 18px;
      }

      .flow-card strong {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--muted);
        margin-bottom: 8px;
      }

      .flow-card .count {
        font-size: 36px;
        line-height: 1;
        margin-bottom: 8px;
      }

      .flow-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.45;
      }

      .summary-card {
        padding: 18px 20px;
        background: linear-gradient(135deg, rgba(20, 99, 86, 0.12), rgba(255, 248, 238, 0.92));
        margin-bottom: 16px;
      }

      .summary-card strong {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--accent);
      }

      .summary-card p {
        margin: 0;
        line-height: 1.55;
      }

      .process-strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }

      .process-card,
      .reasoning-card {
        padding: 18px;
      }

      .process-card header,
      .reasoning-card header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .process-index {
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      .process-card p,
      .reasoning-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .process-card ul,
      .reasoning-card ul {
        margin-top: 10px;
      }

      .reasoning-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        margin-top: 16px;
      }

      .dual-grid {
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      }

      .panel {
        padding: 18px;
      }

      .atlas-list,
      .projection-list,
      .activity-list,
      .diagnostic-list,
      .live-list {
        display: grid;
        gap: 12px;
      }

      .atlas-card,
      .projection-card,
      .activity-card,
      .diagnostic-card,
      .live-card {
        padding: 16px;
        border-radius: 20px;
        background: var(--panel-strong);
        border: 1px solid var(--line);
      }

      .atlas-card header,
      .projection-card header,
      .activity-card header,
      .diagnostic-card header,
      .live-card header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .atlas-card h3,
      .projection-card h3,
      .activity-card h3 {
        font-size: 20px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .chip.warn {
        background: rgba(182, 92, 26, 0.12);
        color: var(--warn);
      }

      .chip.error {
        background: rgba(179, 38, 30, 0.12);
        color: var(--error);
      }

      .path {
        margin: 0 0 10px;
        color: var(--muted);
        font-size: 13px;
      }

      .description {
        margin: 0 0 12px;
        line-height: 1.5;
        color: var(--muted);
      }

      ul {
        margin: 0;
        padding-left: 18px;
      }

      li {
        margin: 6px 0;
        line-height: 1.45;
      }

      .projection-card pre {
        margin: 0;
        padding: 14px;
        border-radius: 18px;
        background: rgba(18, 36, 30, 0.92);
        color: #eff5ef;
        white-space: pre-wrap;
        font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
        font-size: 13px;
        line-height: 1.5;
      }

      .activity-grid {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }

      .empty {
        color: var(--muted);
        font-style: italic;
      }

      .footnote {
        margin-top: 18px;
        color: var(--muted);
        font-size: 13px;
      }

      @media (max-width: 980px) {
        .dual-grid {
          grid-template-columns: 1fr;
        }

        .shell {
          width: min(100vw - 20px, 1380px);
          padding-top: 18px;
        }

        .hero {
          padding: 22px;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <div class="eyebrow">Cristalina Live Portal</div>
        <h1 id="title">Loading store…</h1>
        <p class="hero-copy" id="subtitle">Inspecting canonical memory, policies, projections, and live drift.</p>
        <div class="hero-actions">
          <a class="hero-link primary" href="#runtimeMap">View Runtime Process Map</a>
          <a class="hero-link" href="#projectionRuntime">Jump to Runtime Projection</a>
        </div>
        <div class="meta-row">
          <div class="meta-pill">
            <strong>Health</strong>
            <span id="health">-</span>
          </div>
          <div class="meta-pill">
            <strong>Protocol</strong>
            <span id="protocol">-</span>
          </div>
          <div class="meta-pill">
            <strong>Projection</strong>
            <span id="projection">-</span>
          </div>
          <div class="meta-pill">
            <strong>Connection</strong>
            <span class="connection"><span id="connectionDot" class="dot"></span><span id="connectionText">connecting</span></span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Memory Flow</h2>
          <p>What the store is holding right now, separated by protocol domain.</p>
        </div>
        <div class="domain-grid" id="domains"></div>
      </section>

      <section class="section" id="runtimeMap">
        <div class="section-head">
          <h2>Runtime Process Map</h2>
          <p>The whole path from raw observation to governed memory, plus the areas that require the most model judgment.</p>
        </div>
        <article class="summary-card">
          <strong>Runtime Attention</strong>
          <p id="runtimeSummary">Loading runtime attention guidance…</p>
        </article>
        <div class="process-strip" id="processMap"></div>
        <div class="reasoning-grid" id="reasoningMap"></div>
      </section>

      <section class="section dual-grid" id="projectionRuntime">
        <div class="panel">
          <div class="section-head">
            <h2>File Atlas</h2>
            <p>The main files that define what this memory is and how it behaves.</p>
          </div>
          <div class="atlas-list" id="atlas"></div>
        </div>
        <div class="panel">
          <div class="section-head">
            <h2>Runtime Projection</h2>
            <p>Live SOUL, VALUE, USER and MEMORY views generated from the canonical store.</p>
          </div>
          <div class="projection-list" id="projections"></div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Recent Activity</h2>
          <p>Fresh events, pending proposals and recently confirmed canonical memory.</p>
        </div>
        <div class="activity-grid" id="activity"></div>
      </section>

      <section class="section dual-grid">
        <div class="panel">
          <div class="section-head">
            <h2>Validation Radar</h2>
            <p>Current lint output across schema, policy, privacy and structural rules.</p>
          </div>
          <div class="diagnostic-list" id="diagnostics"></div>
        </div>
        <div class="panel">
          <div class="section-head">
            <h2>Live Feed</h2>
            <p>Filesystem-triggered updates from the store, streamed over WebSocket.</p>
          </div>
          <div class="live-list" id="liveFeed"></div>
          <p class="footnote">This portal is observational. It explains the store and the runtime projection without making canonical edits.</p>
        </div>
      </section>
    </div>

    <script>
      const state = {
        liveFeed: [],
      };

      const dom = {
        title: document.getElementById("title"),
        subtitle: document.getElementById("subtitle"),
        health: document.getElementById("health"),
        protocol: document.getElementById("protocol"),
        projection: document.getElementById("projection"),
        connectionDot: document.getElementById("connectionDot"),
        connectionText: document.getElementById("connectionText"),
        domains: document.getElementById("domains"),
        atlas: document.getElementById("atlas"),
        projections: document.getElementById("projections"),
        activity: document.getElementById("activity"),
        diagnostics: document.getElementById("diagnostics"),
        liveFeed: document.getElementById("liveFeed"),
        runtimeSummary: document.getElementById("runtimeSummary"),
        processMap: document.getElementById("processMap"),
        reasoningMap: document.getElementById("reasoningMap"),
      };

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }

      function severityChip(severity) {
        if (severity === "error") return "chip error";
        if (severity === "warning") return "chip warn";
        return "chip";
      }

      function renderList(items) {
        if (!items || items.length === 0) return '<p class="empty">No signal yet.</p>';
        return '<ul>' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>';
      }

      function healthLabel(health) {
        if (health.status === "error") return "Errors present";
        if (health.status === "warning") return "Warnings present";
        return "Healthy";
      }

      function renderSnapshot(snapshot) {
        dom.title.textContent = snapshot.manifest.displayName;
        dom.subtitle.textContent = snapshot.storePath + " • " + snapshot.counts.files + " tracked files • " + new Date(snapshot.generatedAt).toLocaleString();
        dom.health.textContent = healthLabel(snapshot.health) + " (" + snapshot.health.errorCount + "/" + snapshot.health.warningCount + "/" + snapshot.health.infoCount + ")";
        dom.protocol.textContent = snapshot.manifest.protocolVersion + " • " + snapshot.manifest.repositoryVersion;
        dom.projection.textContent = snapshot.audience + " • " + snapshot.profile;
        dom.runtimeSummary.textContent = snapshot.runtimeMap.summary;

        dom.domains.innerHTML = snapshot.domains.map((domain) => \`
          <article class="flow-card">
            <strong>\${escapeHtml(domain.title)}</strong>
            <div class="count">\${escapeHtml(domain.count)}</div>
            <p>\${escapeHtml(domain.description)}</p>
          </article>
        \`).join("");

        dom.processMap.innerHTML = snapshot.runtimeMap.stages.map((stage, index) => \`
          <article class="process-card">
            <header>
              <div>
                <h3>\${escapeHtml(stage.title)}</h3>
              </div>
              <span class="process-index">\${escapeHtml(index + 1)}</span>
            </header>
            <p>\${escapeHtml(stage.summary)}</p>
            \${renderList(stage.details)}
          </article>
        \`).join("");

        dom.reasoningMap.innerHTML = snapshot.runtimeMap.reasoningHotspots.map((hotspot) => \`
          <article class="reasoning-card">
            <header>
              <div>
                <h3>\${escapeHtml(hotspot.title)}</h3>
              </div>
              <span class="chip warn">Model judgment</span>
            </header>
            <p>\${escapeHtml(hotspot.summary)}</p>
            <ul><li>\${escapeHtml(hotspot.whyItMatters)}</li></ul>
          </article>
        \`).join("");

        dom.atlas.innerHTML = snapshot.fileAtlas.map((file) => \`
          <article class="atlas-card">
            <header>
              <div>
                <h3>\${escapeHtml(file.title)}</h3>
              </div>
              <span class="chip">\${escapeHtml(file.category)}</span>
            </header>
            <p class="path">\${escapeHtml(file.path)} • \${file.present ? "present" : "missing"} • \${escapeHtml(file.objectCount)} objects</p>
            <p class="description">\${escapeHtml(file.description)}</p>
            \${renderList(file.excerpts)}
          </article>
        \`).join("");

        dom.projections.innerHTML = snapshot.projections.map((projection) => \`
          <article class="projection-card">
            <header>
              <div>
                <h3>\${escapeHtml(projection.title)}</h3>
              </div>
              <span class="chip">\${escapeHtml(projection.lineCount)} lines</span>
            </header>
            <p class="description">\${escapeHtml(projection.description)}</p>
            <pre>\${escapeHtml(projection.excerpt.join("\\n"))}</pre>
          </article>
        \`).join("");

        dom.activity.innerHTML = [
          { title: "Events", items: snapshot.recent.events },
          { title: "Proposals", items: snapshot.recent.proposals },
          { title: "Canonical", items: snapshot.recent.canonical }
        ].map((group) => \`
          <article class="activity-card">
            <header><h3>\${escapeHtml(group.title)}</h3></header>
            \${group.items.length === 0 ? '<p class="empty">No items.</p>' : '<ul>' + group.items.map((item) => '<li><strong>' + escapeHtml(item.kind) + '</strong>: ' + escapeHtml(item.statement) + '</li>').join("") + '</ul>'}
          </article>
        \`).join("");

        dom.diagnostics.innerHTML = snapshot.diagnostics.length === 0
          ? '<article class="diagnostic-card"><p class="empty">No diagnostics. The store is clean.</p></article>'
          : snapshot.diagnostics.map((diagnostic) => \`
            <article class="diagnostic-card">
              <header>
                <div>
                  <h3>\${escapeHtml(diagnostic.code)}</h3>
                </div>
                <span class="\${severityChip(diagnostic.severity)}">\${escapeHtml(diagnostic.severity)}</span>
              </header>
              <p class="description">\${escapeHtml(diagnostic.message)}</p>
              <p class="path">\${escapeHtml(diagnostic.file || "store")} \${diagnostic.objectId ? "• " + escapeHtml(diagnostic.objectId) : ""}</p>
            </article>
          \`).join("");

        renderLiveFeed();
      }

      function renderLiveFeed() {
        dom.liveFeed.innerHTML = state.liveFeed.length === 0
          ? '<article class="live-card"><p class="empty">Waiting for store activity.</p></article>'
          : state.liveFeed.map((entry) => \`
            <article class="live-card">
              <header>
                <div>
                  <h3>\${escapeHtml(entry.title)}</h3>
                </div>
                <span class="chip">\${escapeHtml(entry.at)}</span>
              </header>
              <p class="description">\${escapeHtml(entry.summary)}</p>
              \${renderList(entry.paths)}
            </article>
          \`).join("");
      }

      function pushLive(entry) {
        state.liveFeed = [entry, ...state.liveFeed].slice(0, 8);
        renderLiveFeed();
      }

      async function loadInitialSnapshot() {
        const response = await fetch("/api/snapshot");
        if (!response.ok) throw new Error("Failed to load snapshot");
        const snapshot = await response.json();
        renderSnapshot(snapshot);
      }

      function setConnection(ok, label) {
        dom.connectionDot.classList.toggle("ok", ok);
        dom.connectionText.textContent = label;
      }

      function connect() {
        const protocol = location.protocol === "https:" ? "wss" : "ws";
        const socket = new WebSocket(protocol + "://" + location.host + "/ws");

        socket.addEventListener("open", () => {
          setConnection(true, "live");
        });

        socket.addEventListener("close", () => {
          setConnection(false, "reconnecting");
          window.setTimeout(connect, 1000);
        });

        socket.addEventListener("error", () => {
          setConnection(false, "error");
        });

        socket.addEventListener("message", (event) => {
          const message = JSON.parse(event.data);
          if (message.type !== "snapshot") return;
          renderSnapshot(message.snapshot);
          if (message.changedPaths && message.changedPaths.length > 0) {
            pushLive({
              title: "Store update",
              at: new Date(message.snapshot.generatedAt).toLocaleTimeString(),
              summary: message.changedPaths.length + " path(s) triggered a new snapshot.",
              paths: message.changedPaths,
            });
          } else {
            pushLive({
              title: "Initial snapshot",
              at: new Date(message.snapshot.generatedAt).toLocaleTimeString(),
              summary: "Portal connected and received the current memory state.",
              paths: [],
            });
          }
        });
      }

      loadInitialSnapshot()
        .then(() => connect())
        .catch((error) => {
          setConnection(false, "load failed");
          pushLive({
            title: "Snapshot load failed",
            at: new Date().toLocaleTimeString(),
            summary: error.message,
            paths: [],
          });
        });
    </script>
  </body>
</html>`;
}
