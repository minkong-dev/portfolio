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

const TABLE_ROW_BG = { pos: '#f0fdf4', neg: '#fff1f2', neu: '#fffbeb', '': '' };

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
    flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: true },
  });

  try {
    const [about, projects] = await Promise.all([
      fetch('/api/about').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]);
    allProjects = projects;
    renderHero(about);
    renderCareer(about);
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

  setText('hero-tagline', about.tagline || '');
  setText('hero-name', about.name);

  // Intro paragraphs
  const introEl = document.getElementById('hero-intro');
  if (introEl && Array.isArray(about.intro)) {
    introEl.innerHTML = about.intro.map(p => `<p>${esc(p)}</p>`).join('');
  }

  // Contact links
  const emailLink = document.getElementById('contact-email');
  const emailText = document.getElementById('contact-email-text');
  if (emailLink && about.contact?.email) {
    emailLink.href = `mailto:${about.contact.email}`;
    if (emailText) emailText.textContent = about.contact.email;
  }

  const githubLink = document.getElementById('contact-github');
  if (githubLink && about.contact?.github) {
    githubLink.href = about.contact.github;
  }

  // Skills
  const skillsEl = document.getElementById('hero-skills');
  if (skillsEl) {
    skillsEl.innerHTML = (about.skills || []).map(s =>
      `<span class="skill-pill">${esc(s)}</span>`
    ).join('');
  }

  // Note
  setText('contact-note', about.contact?.note || '');

  // Personal info under photo
  const personalEl = document.getElementById('hero-personal');
  if (personalEl && about.personal) {
    const items = [about.personal.birth, about.personal.military].filter(Boolean);
    personalEl.innerHTML = items.map(t =>
      `<span class="personal-item">${esc(t)}</span>`
    ).join('');
  }
}

// ── Career ────────────────────────────────────────────────────────────────────
function renderCareer(about) {
  const listEl = document.getElementById('career-list');
  if (listEl && Array.isArray(about.career)) {
    listEl.innerHTML = about.career.map(c => `
      <div class="career-item">
        <div class="career-left">
          <span class="career-type-badge badge-${esc(c.type)}">${esc(c.type)}</span>
          <div class="career-period">${esc(c.period)}</div>
          <div class="career-duration">${esc(c.duration)}</div>
        </div>
        <div class="career-right">
          <div class="career-company">${esc(c.company)}</div>
          <div class="career-role">${esc(c.role)} · ${esc(c.field)}</div>
          <ul class="career-tasks">
            ${(c.tasks || []).map(t => `<li class="career-task">${esc(t)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');
  }

  const eduEl = document.getElementById('education-block');
  if (eduEl && about.education) {
    const e = about.education;
    eduEl.innerHTML = `
      <span class="edu-label">학력</span>
      <span class="edu-info">${esc(e.school)} · ${esc(e.major)}</span>
      <span class="edu-sub">${esc(e.period)} (${esc(e.status)})</span>
    `;
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
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card.dataset.id); }
    });
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function setupModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab))
  );
}

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

  setText('modal-num', `#${p.num}`);
  setText('modal-title', p.title);
  setText('modal-subtitle', p.subtitle);
  document.getElementById('modal-badge').textContent = p.badge;
  document.getElementById('modal-category').textContent = CATEGORY_LABELS[p.category] || p.category;
  document.getElementById('modal-header').className = `modal-header cat-${p.category}`;

  renderOverviewTab(p);
  renderContributionTab(p);
  renderResultsTab(p);

  const archPane = document.getElementById('tab-architecture');
  archPane.innerHTML = '';
  delete archPane.dataset.rendered;

  setActiveTab('overview');

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal-overlay').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentProject = null;
}

function setActiveTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  );
  document.querySelectorAll('.tab-pane').forEach(pane =>
    pane.classList.toggle('active', pane.id === `tab-${tabName}`)
  );
  if (tabName === 'architecture' && currentProject) renderArchitectureTab(currentProject);
}

// ── Tab: 개요 ─────────────────────────────────────────────────────────────────
function renderOverviewTab(p) {
  document.getElementById('tab-overview').innerHTML = `
    <div class="tab-section">
      <h4 class="section-label">프로젝트 개요</h4>
      <p class="body-text">${esc(p.overview || '')}</p>
    </div>
    ${p.motivation ? `
    <div class="tab-section">
      <h4 class="section-label">개발 배경 · 동기</h4>
      <p class="body-text">${esc(p.motivation)}</p>
    </div>` : ''}
  `;
}

// ── Tab: 구조 ─────────────────────────────────────────────────────────────────
async function renderArchitectureTab(p) {
  const el = document.getElementById('tab-architecture');
  if (el.dataset.rendered === p.id) return;

  let html = '';
  if (p.architecture_desc) {
    html += `<div class="tab-section">
      <h4 class="section-label">아키텍처 설명</h4>
      <p class="body-text">${esc(p.architecture_desc)}</p>
    </div>`;
  }
  if (p.architecture_mermaid) {
    html += `<div class="tab-section">
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
  (p.contributions || []).forEach(c => { if (groups[c.type]) groups[c.type].push(c.text); });

  const GROUP_LABELS = { main: '핵심 기여', sub: '지원 기여', extra: '추가 기여' };
  let html = '';

  for (const [type, items] of Object.entries(groups)) {
    if (!items.length) continue;
    const meta = CONTRIB_META[type];
    html += `<div class="tab-section">
      <h4 class="section-label">${GROUP_LABELS[type]}</h4>
      <ul class="contribution-list">
        ${items.map(text => `
          <li class="contribution-item">
            <span class="contrib-badge"
                  style="background:${meta.bg};color:${meta.fg};border-color:${meta.border}">
              ${meta.label}
            </span>
            <span class="contrib-text">${esc(text)}</span>
          </li>`).join('')}
      </ul>
    </div>`;
  }

  (p.extra_sections || []).forEach(s => { if (s.type === 'table') html += renderTable(s); });
  el.innerHTML = html;
}

function renderTable(section) {
  const rows = (section.rows || []).map(row => {
    const bg = TABLE_ROW_BG[row.style] || '';
    return `<tr${bg ? ` style="background:${bg}"` : ''}>${(row.cells || []).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`;
  }).join('');

  return `<div class="tab-section">
    <h4 class="section-label">${esc(section.title)}</h4>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>${(section.headers || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

// ── Tab: 성과 & 스택 ──────────────────────────────────────────────────────────
function renderResultsTab(p) {
  const el = document.getElementById('tab-results');
  let html = '';

  if (p.results?.length) {
    html += `<div class="tab-section">
      <h4 class="section-label">주요 성과</h4>
      <div class="results-grid">
        ${p.results.map(r => `
          <div class="result-card">
            <div class="result-icon">${r.icon}</div>
            <div class="result-content">
              <strong class="result-title">${esc(r.title)}</strong>
              <p class="result-desc">${esc(r.desc)}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  if (p.tech_stack?.length) {
    html += `<div class="tab-section">
      <h4 class="section-label">기술 스택</h4>
      <div class="tech-grid">
        ${p.tech_stack.map(t => {
          const meta = TECH_META[t.type] || { bg: '#f1f5f9', fg: '#475569' };
          return `<div class="tech-item" style="background:${meta.bg};color:${meta.fg}">
            <span class="tech-name">${esc(t.name)}</span>
            ${t.note ? `<span class="tech-note">${esc(t.note)}</span>` : ''}
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
