const data = window.PHD_JOB_DATA;

const byId = items => Object.fromEntries(items.map(i => [i.id, i]));
const sourcesById = byId(data.sources);
const clustersById = byId(data.roleClusters);

let activeClusterId = data.roleClusters[0].id;

const SIGNAL = {
  5: { label: "Very strong", cls: "s5" },
  4: { label: "Strong",      cls: "s4" },
  3: { label: "Moderate",    cls: "s3" },
  2: { label: "Weak",        cls: "s2" },
  1: { label: "Sparse",      cls: "s1" }
};

function getEntry(clusterId, companyId) {
  const e = data.matrix[clusterId]?.[companyId];
  return { score: e?.score ?? 1, note: e?.note ?? null };
}

function renderMeta() {
  const parts = [
    `更新于 ${data.meta.collectedAt}`,
    `${data.companies.length} 家公司`,
    `${data.roleClusters.length} 个岗位类别`
  ];
  document.querySelector("#meta-row").innerHTML =
    parts.map(t => `<span>${t}</span>`).join('<span class="dot">·</span>');
}

function renderTabs() {
  const nav = document.querySelector("#role-tabs");
  nav.innerHTML = data.roleClusters.map(c => `
    <button class="role-tab${c.id === activeClusterId ? " active" : ""}"
      data-id="${c.id}" type="button">${c.name}</button>
  `).join("");
  nav.querySelectorAll(".role-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeClusterId = btn.dataset.id;
      renderTabs();
      renderRoleView();
    });
  });
}

function renderRoleView() {
  const cluster = clustersById[activeClusterId];

  document.querySelector("#role-header").innerHTML = `
    <div class="role-card">
      <div class="role-top">
        <div class="role-main">
          <h2>${cluster.name}</h2>
          <p class="role-problem">${cluster.problem}</p>
        </div>
        <p class="role-fit">${cluster.fit}</p>
      </div>
      <div class="chips-row">
        <div class="chips-group">
          <span class="mini-label">PhD 核心信号</span>
          <div class="chips">${cluster.phdSignals.map(s =>
            `<span class="chip">${s}</span>`).join("")}</div>
        </div>
        <div class="chips-group">
          <span class="mini-label">JD 关键词</span>
          <div class="chips">${cluster.keywords.map(k =>
            `<span class="chip chip-keyword">${k}</span>`).join("")}</div>
        </div>
      </div>
    </div>
  `;

  renderRoadmap();

  const sorted = [...data.companies].sort((a, b) =>
    getEntry(activeClusterId, b.id).score - getEntry(activeClusterId, a.id).score
  );

  const n = sorted.length;
  const strong = sorted.filter(c => getEntry(activeClusterId, c.id).score >= 4).length;
  document.querySelector("#grid-label").textContent =
    `${n} 家公司 · ${strong} 家 strong+ · 按需求强度排序`;

  document.querySelector("#company-grid").innerHTML = sorted.map(company => {
    const { score, note } = getEntry(activeClusterId, company.id);
    const sig = SIGNAL[score];
    const sources = company.sourceIds.map(id => sourcesById[id]).filter(Boolean);
    const description = note || company.summary;
    return `
      <article class="company-card">
        <div class="card-head">
          <h3>${company.name}</h3>
          <span class="sig-badge ${sig.cls}">${score} · ${sig.label}</span>
        </div>
        <p class="company-desc">${description}</p>
        <div>
          <span class="mini-label">常见 title</span>
          <div class="chips">${company.roles.map(r =>
            `<span class="chip">${r}</span>`).join("")}</div>
        </div>
        <div>
          <span class="mini-label">来源</span>
          <div class="chips">${sources.map(s =>
            `<a class="chip chip-link" href="${s.url}" target="_blank" rel="noreferrer">${s.evidenceLevel}</a>`
          ).join("")}</div>
        </div>
      </article>
    `;
  }).join("");
}

function renderRoadmap() {
  const phases = data.roadmaps?.[activeClusterId];
  const el = document.querySelector("#role-roadmap");
  if (!phases) { el.innerHTML = ""; return; }

  const PHASE_ICONS = ["①", "②", "③"];
  const PHASE_COLORS = ["rm-p1", "rm-p2", "rm-p3"];

  el.innerHTML = `
    <div class="roadmap-card">
      <div class="roadmap-header">
        <span class="roadmap-title">如何培养自己？</span>
        <span class="roadmap-sub">从 PhD 到拿到该岗位 Offer 的路径</span>
      </div>
      <div class="roadmap-grid">
        ${phases.map((p, i) => `
          <div class="roadmap-phase ${PHASE_COLORS[i]}">
            <div class="phase-head">
              <span class="phase-icon">${PHASE_ICONS[i]}</span>
              <div>
                <div class="phase-name">${p.phase}</div>
                <div class="phase-timing">${p.timing}</div>
              </div>
            </div>
            <ul class="phase-items">
              ${p.items.map(item => `<li class="phase-item">${item}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderStats() {
  const n = data.companies.length;
  document.querySelector("#stats-desc").textContent =
    `各岗位在 ${n} 家公司的平均需求强度（1–5分），点击跳转`;

  const stats = data.roleClusters.map(cluster => {
    const scores = data.companies.map(c => getEntry(cluster.id, c.id).score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const strong = scores.filter(s => s >= 4).length;
    return { cluster, avg, strong };
  }).sort((a, b) => b.avg - a.avg);

  document.querySelector("#stats-bars").innerHTML = stats.map(({ cluster, avg, strong }) => `
    <div class="stat-row${cluster.id === activeClusterId ? " stat-active" : ""}"
      role="button" tabindex="0" data-id="${cluster.id}">
      <div class="stat-info">
        <span class="stat-name">${cluster.name}</span>
        <span class="stat-sub">${strong}/${n} 家 ≥4</span>
      </div>
      <div class="stat-track">
        <div class="stat-fill" style="width:${((avg / 5) * 100).toFixed(1)}%"></div>
      </div>
      <span class="stat-val">${avg.toFixed(1)}</span>
    </div>
  `).join("");

  document.querySelectorAll(".stat-row").forEach(row => {
    const go = () => {
      activeClusterId = row.dataset.id;
      renderTabs();
      renderRoleView();
      renderStats();
      document.querySelector(".tabs-wrap").scrollIntoView({ behavior: "smooth" });
    };
    row.addEventListener("click", go);
    row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") go(); });
  });
}

function init() {
  renderMeta();
  renderTabs();
  renderRoleView();
  renderStats();
}

init();
