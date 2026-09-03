/**
 * Popup script for Job Application Tracker.
 * All data from chrome.storage.local — no backend required.
 */

// ============================================================
// Types
// ============================================================
interface JobApplication {
  id: string;
  companyName: string;
  source?: string;
  jobRole: string;
  applicationLink: string;
  applicantEmail: string;
  portalName: string;
  status: string;
  appliedDate: string;
  appliedTime: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// Storage helpers
// ============================================================
function getApplications(): Promise<JobApplication[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['applications'], (result) => {
      resolve((result.applications as JobApplication[]) || []);
    });
  });
}

function getAppSource(a: JobApplication): string {
  return a.source || a.portalName || 'Direct / Other';
}

const ALL_STATUSES = ['Applied', 'Under Review', 'OA Received', 'Interview Scheduled', 'Offer Received', 'Accepted', 'Rejected', 'Ghosted'];

function getStatusBadge(status: string): string {
  const s = status.toLowerCase();
  if (s === 'rejected' || s === 'ghosted') return 'status-badge badge-rejected';
  if (s === 'accepted' || s === 'offer received') return 'status-badge badge-accepted';
  if (s.includes('interview') || s.includes('oa') || s === 'under review') return 'status-badge badge-interview';
  if (s === 'applied') return 'status-badge badge-applied';
  return 'status-badge badge-default';
}

function renderBadgeHtml(status: string): string {
  return `<span class="${getStatusBadge(status)}"><span class="badge-dot"></span>${esc(status)}</span>`;
}

function getCompanyInitial(name: string): string {
  return (name || '?').trim()[0].toUpperCase();
}

function showBanner(id: string, msg: string, type: 'success' | 'error' | 'warning') {
  const el = document.getElementById(id) as HTMLDivElement;
  if (!el) return;
  el.textContent = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : '⚠️ ') + msg;
  el.className = `status-banner show ${type}`;
  setTimeout(() => { el.classList.remove('show'); }, 3500);
}

// ============================================================
// Tab Switching
// ============================================================
function initTabs() {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const panels = document.querySelectorAll<HTMLDivElement>('.tab-panel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab!;
      tabBtns.forEach((b) => b.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(`panel${capitalize(targetTab)}`);
      if (panel) panel.classList.add('active');

      if (targetTab === 'stats') renderStats();
    });
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function switchToTab(tab: string) {
  const btn = document.querySelector<HTMLButtonElement>(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.click();
}

// ============================================================
// Recent Tab
// ============================================================
async function renderRecent() {
  const loadingOverlay = document.getElementById('loadingOverlay')!;
  const statsGrid = document.getElementById('statsGrid')!;
  const recentDivider = document.getElementById('recentDivider')!;
  const recentContent = document.getElementById('recentContent')!;
  const headerSub = document.getElementById('headerSub')!;

  loadingOverlay.style.display = 'flex';
  statsGrid.style.display = 'none';
  recentDivider.style.display = 'none';
  recentContent.innerHTML = '';

  const apps = await getApplications();
  loadingOverlay.style.display = 'none';

  // Update header subtitle
  headerSub.textContent = `${apps.length} application${apps.length !== 1 ? 's' : ''} tracked`;

  // Mini stats
  statsGrid.style.display = 'grid';
  (document.getElementById('statTotal') as HTMLElement).textContent = String(apps.length);
  (document.getElementById('statAccepted') as HTMLElement).textContent = String(
    apps.filter((a) => a.status === 'Accepted' || a.status === 'Offer Received').length
  );
  (document.getElementById('statInProgress') as HTMLElement).textContent = String(
    apps.filter((a) => ['Under Review', 'OA Received', 'Interview Scheduled'].includes(a.status)).length
  );
  (document.getElementById('statRejected') as HTMLElement).textContent = String(
    apps.filter((a) => a.status === 'Rejected' || a.status === 'Ghosted').length
  );

  if (apps.length === 0) {
    recentContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚀</div>
        <div class="empty-title">No applications tracked yet</div>
        <div class="empty-sub">Apply on job portals and the extension will auto-capture them.<br/>Or use the ➕ Add tab to log manually.</div>
      </div>`;
    return;
  }

  recentDivider.style.display = 'block';

  const recent = apps.slice(0, 7);
  const sectionEl = document.createElement('div');
  sectionEl.innerHTML = `
    <div class="section-header">
      <span class="section-title">Recent Applications</span>
      <button class="section-action" id="viewAllBtn">View all (${apps.length})</button>
    </div>
  `;
  recentContent.appendChild(sectionEl);

  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  const listEl = document.createElement('div');
  listEl.className = 'app-list';

  recent.forEach((app) => {
    const item = document.createElement('div');
    item.className = 'app-item';
    const sourceName = getAppSource(app);
    item.innerHTML = `
      <div class="app-company-avatar">${getCompanyInitial(app.companyName)}</div>
      <div class="app-info">
        <div class="app-company">${esc(app.companyName)}</div>
        <div class="app-role">${esc(app.jobRole)}</div>
        <div class="app-meta">
          <span class="source-pill">${esc(sourceName)}</span>
          ${renderBadgeHtml(app.status)}
        </div>
      </div>
      <div class="app-actions">
        ${app.applicationLink ? `<button class="icon-btn open-link-btn" title="Open job link" data-url="${esc(app.applicationLink)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
        </button>` : ''}
        <button class="icon-btn delete delete-btn" title="Delete application" data-id="${app.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    listEl.appendChild(item);
  });

  recentContent.appendChild(listEl);

  // Bind actions
  recentContent.querySelectorAll<HTMLButtonElement>('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this application?')) return;
      chrome.runtime.sendMessage({ action: 'DELETE_APPLICATION', id: btn.dataset.id }, () => {
        renderRecent();
      });
    });
  });

  recentContent.querySelectorAll<HTMLButtonElement>('.open-link-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

// ============================================================
// Stats Tab
// ============================================================
async function renderStats() {
  const statsContent = document.getElementById('statsContent')!;
  statsContent.innerHTML = '<div class="loading-overlay" style="height:200px"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';

  const apps = await getApplications();

  if (apps.length === 0) {
    statsContent.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No data yet</div><div class="empty-sub">Start tracking applications to see your stats here.</div></div>`;
    return;
  }

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  const portalCounts: Record<string, number> = {};
  apps.forEach((app) => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    const src = getAppSource(app);
    if (src) portalCounts[src] = (portalCounts[src] || 0) + 1;
  });

  const successRate = apps.length > 0
    ? Math.round(((statusCounts['Accepted'] || 0) / apps.length) * 100)
    : 0;

  statsContent.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:12px">Status Breakdown</div>
      ${ALL_STATUSES.filter((s) => statusCounts[s]).map((s) => `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span class="${getStatusBadge(s)}">${s}</span>
          <div style="flex:1;margin:0 12px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
            <div style="height:100%;background:var(--accent);border-radius:3px;width:${Math.round((statusCounts[s] / apps.length) * 100)}%"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--text)">${statusCounts[s]}</span>
        </div>
      `).join('')}
    </div>

    ${Object.keys(portalCounts).length > 0 ? `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:12px">Sources Used</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${Object.entries(portalCounts).sort(([, a], [, b]) => b - a).map(([portal, count]) => `
          <div style="display:flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border2);border-radius:7px;padding:5px 10px">
            <span style="font-size:12px;font-weight:600;color:var(--text)">${esc(portal)}</span>
            <span style="font-size:11px;font-weight:700;color:var(--accent)">${count}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center">
      <div>
        <div style="font-size:28px;font-weight:800;color:var(--green)">${successRate}%</div>
        <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;margin-top:2px">Success Rate</div>
      </div>
      <div>
        <div style="font-size:28px;font-weight:800;color:var(--accent)">${Object.keys(portalCounts).length}</div>
        <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;margin-top:2px">Sources Used</div>
      </div>
    </div>
  `;
}

// ============================================================
// Add Form
// ============================================================
async function initAddForm() {
  // Check for pending application
  chrome.storage.local.get(['pendingApplication', 'missingFields'], (result) => {
    if (result.pendingApplication && result.missingFields?.length > 0) {
      const pending = result.pendingApplication;
      const missing: string[] = result.missingFields;

      // Show the pending alert in the Recent tab
      const pendingAlert = document.getElementById('pendingAlert')!;
      const pendingAlertSub = document.getElementById('pendingAlertSub')!;
      pendingAlert.classList.add('show');
      pendingAlertSub.textContent = `Missing: ${missing.join(', ')}. Open Add tab to complete.`;

      document.getElementById('fillMissingBtn')?.addEventListener('click', () => {
        switchToTab('add');
      });

      // Pre-fill the form in the Add tab
      const pendingFormSection = document.getElementById('pendingFormSection')!;
      const pendingFormDesc = document.getElementById('pendingFormDesc')!;
      pendingFormSection.style.display = 'block';
      pendingFormDesc.textContent = `Missing: ${missing.join(', ')}`;

      // Fill existing data
      if (pending.companyName) (document.getElementById('fCompany') as HTMLInputElement).value = pending.companyName;
      if (pending.jobRole) (document.getElementById('fRole') as HTMLInputElement).value = pending.jobRole;
      if (pending.applicationLink) (document.getElementById('fLink') as HTMLInputElement).value = pending.applicationLink;
      if (pending.applicantEmail) (document.getElementById('fEmail') as HTMLInputElement).value = pending.applicantEmail;
      if (pending.source || pending.portalName) (document.getElementById('fPortal') as HTMLInputElement).value = pending.source || pending.portalName;
    }
  });

  const form = document.getElementById('addForm') as HTMLFormElement;
  const addBtn = document.getElementById('addBtn') as HTMLButtonElement;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const company = (document.getElementById('fCompany') as HTMLInputElement).value.trim();
    const role = (document.getElementById('fRole') as HTMLInputElement).value.trim();

    if (!company || !role) {
      showBanner('addBanner', 'Company name and job role are required.', 'error');
      return;
    }

    addBtn.disabled = true;
    addBtn.innerHTML = '<span class="spinner"></span> Saving...';

    const now = new Date();
    const sourceVal = (document.getElementById('fPortal') as HTMLInputElement).value.trim() || 'Manual';
    const data = {
      companyName: company,
      jobRole: role,
      source: sourceVal,
      portalName: sourceVal,
      applicationLink: (document.getElementById('fLink') as HTMLInputElement).value.trim(),
      applicantEmail: (document.getElementById('fEmail') as HTMLInputElement).value.trim(),
      status: (document.getElementById('fStatus') as HTMLSelectElement).value,
      notes: (document.getElementById('fNotes') as HTMLInputElement).value.trim(),
      appliedDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      appliedTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    chrome.runtime.sendMessage({ action: 'SAVE_COMPLETE_APPLICATION', data }, (response) => {
      addBtn.disabled = false;
      addBtn.innerHTML = 'Save Application';

      if (response?.success) {
        showBanner('addBanner', 'Application saved successfully!', 'success');
        form.reset();
        const pendingFormSection = document.getElementById('pendingFormSection')!;
        pendingFormSection.style.display = 'none';
        document.getElementById('pendingAlert')?.classList.remove('show');
        // Switch to recent and refresh
        setTimeout(() => {
          switchToTab('recent');
          renderRecent();
        }, 800);
      } else {
        showBanner('addBanner', response?.message || 'Failed to save.', 'error');
      }
    });
  });
}

// ============================================================
// Export CSV
// ============================================================
function initExportCsv() {
  document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
    const apps = await getApplications();
    if (apps.length === 0) {
      alert('No applications to export.');
      return;
    }

    const headers = ['Company', 'Source', 'Role', 'Status', 'Date', 'Time', 'Email', 'Link', 'Notes'];
    const rows = apps.map((a) => [
      a.companyName, getAppSource(a), a.jobRole, a.status, a.appliedDate, a.appliedTime,
      a.applicantEmail, a.applicationLink, a.notes || '',
    ].map((v) => `"${(v || '').replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job_applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ============================================================
// Extension Toggle
// ============================================================
function initToggle() {
  const toggle = document.getElementById('extensionToggle') as HTMLInputElement;
  const pill = document.getElementById('toggleStatusPill')!;
  const labelText = document.getElementById('toggleLabelText')!;
  const disabledOverlay = document.getElementById('disabledOverlay')!;

  function applyState(enabled: boolean) {
    toggle.checked = enabled;

    if (enabled) {
      pill.textContent = 'Active';
      pill.className = 'toggle-status-pill on';
      labelText.classList.add('active');
      disabledOverlay.classList.remove('show');
    } else {
      pill.textContent = 'Off';
      pill.className = 'toggle-status-pill off';
      labelText.classList.remove('active');
      disabledOverlay.classList.add('show');
    }
  }

  // Load current state
  chrome.runtime.sendMessage({ action: 'GET_EXTENSION_STATE' }, (response) => {
    applyState(response?.enabled !== false);
  });

  // Listen for changes
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.runtime.sendMessage({ action: 'SET_EXTENSION_STATE', enabled }, (response) => {
      applyState(response?.enabled !== false);
    });
  });
}

// ============================================================
// Dashboard button
// ============================================================
function initDashboardBtn() {
  document.getElementById('openDashboardBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });
}

// ============================================================
// HTML Escape
// ============================================================
function esc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initToggle();
  initTabs();
  renderRecent();
  initAddForm();
  initExportCsv();
  initDashboardBtn();
});
