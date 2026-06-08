'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  backend: '백엔드 & 인프라',
  tools:   '개발 도구',
  ai:      'AI · 모델',
};

const TECH_META = {
  py:   { bg: '#dbeafe', fg: '#1e40af' },
  qt:   { bg: '#dcfce7', fg: '#166534' },
  cv:   { bg: '#ede9fe', fg: '#5b21b6' },
  db:   { bg: '#fef9c3', fg: '#854d0e' },
  ai:   { bg: '#ffedd5', fg: '#9a3412' },
  web:  { bg: '#ccfbf1', fg: '#134e4a' },
  sock: { bg: '#e0e7ff', fg: '#3730a3' },
  dkr:  { bg: '#e0f2fe', fg: '#075985' },
  doc:  { bg: '#f1f5f9', fg: '#334155' },
};

const CONTRIB_META = {
  main:  { label: '핵심', bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  sub:   { label: '기여', bg: '#f9fafb', fg: '#374151', border: '#d1d5db' },
  extra: { label: '추가', bg: '#f9fafb', fg: '#6b7280', border: '#e5e7eb' },
};

const TABLE_ROW_BG = {
  pos: '#f0fdf4',
  neg: '#fff1f2',
  neu: '#fffbeb',
  '': '',
};

// ── State ─────────────────────────────────────────────────────────────────────
let allProjects    = [];
let activeFilter   = 'all';
let currentProject = null;
const mermaidCache = {};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'loose',
    flowchart: { htmlLabels: true, curve: 'basis' },
  });

  try {
    const [about, projects] = await Promise.all([
      fetch('/api/about').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]);
    allProjects = projects;
    renderHero(about);
    renderFilterTabs();
    renderCards();
  } catch (err) {
    console.error('데이터 로드 실패:', err);
  }

  setupModal();
});

// ── Hero ──────────────────────────────────────────────────────────────────────
function renderHero(about) {
  document.title = `${about.name} · 포트폴리오`;
  setText('hero-name', about.name);
  setText('hero-desc', about.description);
  setText('contact-email-text', about.contact.email);
  const emailLink = document.getElementById('contact-email');
  if (emailLink) emailLink.href = `mailto:${about.contact.email}`;
  setText('contact-note', about.contact.note);

  // skill pills
  const skillsEl = document.getElementById('hero-skills');
  if (skillsEl) {
    skillsEl.innerHTML = (about.skills || []).map(s =>
      `<span class="skill-pill">${esc(s)}</span>`
    ).join('');
  }

  // stats
  const statsEl = document.getElementById('stats-grid');
  if (statsEl) {
    statsEl.innerHTML = (about.stats || []).map(s => `
      <div class="stat-item">
        <span class="stat-num">${esc(s.num)}</span>
        <span class="stat-label">${esc(s.label)}</span>
      </div>
    `).join('');
  }
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
function renderFilterTabs() {
  const TABS = [
    { key: 'all',     label: '전체' },
    { key: 'backend', label: '백엔드 & 인프라' },
    { key: 'tools',   label: '개발 도구' },
    { key: 'ai',      label: 'AI · 모델' },
  ];

  const el = document.getElementById('filter-tabs');
  if (!el) return;

  el.innerHTML = TABS.map(t =>
    `<button class="filter-btn${t.key === activeFilter ? ' active' : ''}" data-filter="${t.key}">${t.label}</button>`
  ).join('');

  el.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    el.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === activeFilter)
    );
    renderCards();
  });
}

// ── Project cards ─────────────────────────────────────────────────────────────
function renderCards() {
  const filtered = activeFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.category === activeFilter);

  const grid = document.getElementById('project-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="no-results">해당 카테고리의 프로젝트가 없습니다.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <article class="project-card cat-${p.category}"
             data-id="${p.id}"
             tabindex="0"
             role="button"
             aria-label="${esc(p.title)} 상세보기">
      <div class="card-header">
        <span class="card-num">#${esc(p.num)}</span>
        <span class="card-badge">${esc(p.badge)}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(p.title)}</h3>
        <p class="card-subtitle">${esc(p.subtitle)}</p>
        <p class="card-summary">${esc(p.summary)}</p>
        <div class="card-tags">
          ${(p.tags || []).map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}
        </div>
      </div>
      <div class="card-footer">
        <span class="card-cta">자세히 보기 →</span>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.dataset.id);
      }
    });
  });
}

// ── Modal setup ───────────────────────────────────────────────────────────────
function setupModal() {
  const overlay  = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });
}

// ── Open / close modal ────────────────────────────────────────────────────────
async function openModal(projectId) {
  try {
    currentProject = await fetch(`/api/projects/${projectId}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  } catch (err) {
    console.error('프로젝트 로드 실패:', err);
    return;
  }

  const p = currentProject;

  // Header
  setText('modal-num', `#${p.num}`);
  setText('modal-title', p.title);
  setText('modal-subtitle', p.subtitle);

  const badge = document.getElementById('modal-badge');
  badge.textContent = p.badge;

  const catPill = document.getElementById('modal-category');
  catPill.textContent = CATEGORY_LABELS[p.category] || p.category;

  document.getElementById('modal-header').className = `modal-header cat-${p.category}`;

  // Render content tabs (except architecture — rendered lazily)
  renderOverviewTab(p);
  renderContributionTab(p);
  renderResultsTab(p);

  // Clear architecture cache flag to force re-render on next open
  const archPane = document.getElementById('tab-architecture');
  archPane.innerHTML = '';
  delete archPane.dataset.rendered;

  // Reset to overview tab
  setActiveTab('overview');

  // Show
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentProject = null;
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function setActiveTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  );
  document.querySelectorAll('.tab-pane').forEach(pane =>
    pane.classList.toggle('active', pane.id === `tab-${tabName}`)
  );

  if (tabName === 'architecture' && currentProject) {
    renderArchitectureTab(currentProject);
  }
}

// ── Tab: 개요 ─────────────────────────────────────────────────────────────────
function renderOverviewTab(p) {
  const el = document.getElementById('tab-overview');
  el.innerHTML = `
    <div class="tab-section">
      <h4 class="section-label">프로젝트 개요</h4>
      <p class="body-text">${esc(p.overview || '')}</p>
    </div>
    ${p.motivation ? `
    <div class="tab-section">
      <h4 class="section-label">개발 배경 · 동기</h4>
      <p class="body-text">${esc(p.motivation)}</p>
    </div>
    ` : ''}
  `;
}

// ── Tab: 구조 (lazy Mermaid) ──────────────────────────────────────────────────
async function renderArchitectureTab(p) {
  const el = document.getElementById('tab-architecture');
  if (el.dataset.rendered === p.id) return;

  let html = '';
  if (p.architecture_desc) {
    html += `
      <div class="tab-section">
        <h4 class="section-label">아키텍처 설명</h4>
        <p class="body-text">${esc(p.architecture_desc)}</p>
      </div>`;
  }
  if (p.architecture_mermaid) {
    html += `
      <div class="tab-section">
        <h4 class="section-label">플로우차트</h4>
        <div class="mermaid-wrap" id="mermaid-container">
          <div class="mermaid-loading">다이어그램 렌더링 중…</div>
        </div>
      </div>`;
  }

  el.innerHTML = html;
  el.dataset.rendered = p.id;

  if (!p.architecture_mermaid) return;

  const container = el.querySelector('#mermaid-container');

  if (mermaidCache[p.id]) {
    container.innerHTML = mermaidCache[p.id];
    return;
  }

  try {
    const uid = `mgraph-${p.id}-${Date.now()}`;
    const { svg } = await mermaid.render(uid, p.architecture_mermaid);
    mermaidCache[p.id] = svg;
    container.innerHTML = svg;
  } catch (err) {
    console.error('Mermaid 렌더링 오류:', err);
    container.innerHTML = '<div class="mermaid-error">다이어그램을 렌더링할 수 없습니다.</div>';
  }
}

// ── Tab: 기여 ─────────────────────────────────────────────────────────────────
function renderContributionTab(p) {
  const el = document.getElementById('tab-contribution');

  const groups = { main: [], sub: [], extra: [] };
  (p.contributions || []).forEach(c => {
    if (groups[c.type]) groups[c.type].push(c.text);
  });

  const GROUP_LABELS = { main: '핵심 기여', sub: '지원 기여', extra: '추가 기여' };

  let html = '';

  for (const [type, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    const meta = CONTRIB_META[type];
    html += `
      <div class="tab-section">
        <h4 class="section-label">${GROUP_LABELS[type]}</h4>
        <ul class="contribution-list">
          ${items.map(text => `
            <li class="contribution-item">
              <span class="contrib-badge"
                    style="background:${meta.bg};color:${meta.fg};border-color:${meta.border}">
                ${meta.label}
              </span>
              <span class="contrib-text">${esc(text)}</span>
            </li>
          `).join('')}
        </ul>
      </div>`;
  }

  // Extra sections (tables etc.)
  (p.extra_sections || []).forEach(section => {
    if (section.type === 'table') html += renderTable(section);
  });

  el.innerHTML = html;
}

function renderTable(section) {
  const rows = (section.rows || []).map(row => {
    const bg = TABLE_ROW_BG[row.style] || '';
    const trStyle = bg ? ` style="background:${bg}"` : '';
    return `<tr${trStyle}>${(row.cells || []).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`;
  }).join('');

  return `
    <div class="tab-section">
      <h4 class="section-label">${esc(section.title)}</h4>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>${(section.headers || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Tab: 성과 & 스택 ──────────────────────────────────────────────────────────
function renderResultsTab(p) {
  const el = document.getElementById('tab-results');
  let html = '';

  if (p.results && p.results.length > 0) {
    html += `
      <div class="tab-section">
        <h4 class="section-label">주요 성과</h4>
        <div class="results-grid">
          ${p.results.map(r => `
            <div class="result-card">
              <div class="result-icon">${r.icon}</div>
              <div class="result-content">
                <strong class="result-title">${esc(r.title)}</strong>
                <p class="result-desc">${esc(r.desc)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  if (p.tech_stack && p.tech_stack.length > 0) {
    html += `
      <div class="tab-section">
        <h4 class="section-label">기술 스택</h4>
        <div class="tech-grid">
          ${p.tech_stack.map(t => {
            const meta = TECH_META[t.type] || { bg: '#f1f5f9', fg: '#475569' };
            const noteHtml = t.note
              ? `<span class="tech-note">${esc(t.note)}</span>`
              : '';
            return `
              <div class="tech-item" style="background:${meta.bg};color:${meta.fg}">
                <span class="tech-name">${esc(t.name)}</span>
                ${noteHtml}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  el.innerHTML = html;
}

// ── Util ──────────────────────────────────────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
