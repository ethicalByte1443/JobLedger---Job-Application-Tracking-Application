/**
 * Dashboard script for the Job Application Tracker Chrome Extension.
 * Interacts directly with chrome.storage.local for 100% offline, local job tracking.
 */

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

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────
  let allApps: JobApplication[] = [];
  let sortField: keyof JobApplication = 'createdAt';
  let sortDir: 'asc' | 'desc' = 'desc';
  let searchTerm = '';
  let statusFilter = 'All';
  let portalFilter = 'All';
  let currentPage = 1;
  const PER_PAGE = 15;
  let editingId: string | null = null;
  const ALL_STATUSES = [
    'Applied',
    'Under Review',
    'OA Received',
    'Interview Scheduled',
    'Offer Received',
    'Accepted',
    'Rejected',
    'Ghosted',
  ];

  // ── Storage ────────────────────────────────────────────────────────
  function getApps(): Promise<JobApplication[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['applications'], (r) =>
        resolve((r.applications as JobApplication[]) || [])
      );
    });
  }

  function saveApps(apps: JobApplication[]): Promise<void> {
    return new Promise((resolve) =>
      chrome.storage.local.set({ applications: apps }, resolve)
    );
  }

  function genId(): string {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  // ── Utils ──────────────────────────────────────────────────────────
  function esc(s: string | undefined | null): string {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Toast ──────────────────────────────────────────────────────────
  let toastTimer: number | undefined;
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    window.clearTimeout(toastTimer);
    el.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
    el.className = `toast ${type} show`;
    toastTimer = window.setTimeout(() => {
      el.classList.remove('show');
    }, 3000);
  }

  // ── Load & Render ──────────────────────────────────────────────────
  async function load() {
    const tableState = document.getElementById('tableState');
    const pagination = document.getElementById('pagination');
    if (tableState) {
      tableState.innerHTML = `
        <div class="state-box"><div class="spinner-ring"></div><div class="state-sub">Loading your applications...</div></div>`;
    }
    if (pagination) pagination.style.display = 'none';

    allApps = await getApps();
    render();
  }

  function getAppSource(a: JobApplication): string {
    return a.source || a.portalName || 'Direct / Other';
  }

  function filtered(): JobApplication[] {
    return allApps.filter((a) => {
      const q = searchTerm.toLowerCase();
      const src = getAppSource(a).toLowerCase();
      const matchSearch =
        !q ||
        (a.companyName || '').toLowerCase().includes(q) ||
        src.includes(q) ||
        (a.jobRole || '').toLowerCase().includes(q) ||
        (a.applicantEmail || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
      const matchPortal = portalFilter === 'All' || getAppSource(a) === portalFilter;
      return matchSearch && matchStatus && matchPortal;
    });
  }

  function sorted(apps: JobApplication[]): JobApplication[] {
    return [...apps].sort((a, b) => {
      const av = (a[sortField] || (sortField === 'source' ? getAppSource(a) : '') || '').toLowerCase();
      const bv = (b[sortField] || (sortField === 'source' ? getAppSource(b) : '') || '').toLowerCase();
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function render() {
    // Stats
    const total = allApps.length;
    const sTotal = document.getElementById('sTotal');
    const sAccepted = document.getElementById('sAccepted');
    const sActive = document.getElementById('sActive');
    const sRejected = document.getElementById('sRejected');

    if (sTotal) sTotal.textContent = String(total);
    if (sAccepted) {
      sAccepted.textContent = String(
        allApps.filter((a) => a.status === 'Accepted' || a.status === 'Offer Received').length
      );
    }
    if (sActive) {
      sActive.textContent = String(
        allApps.filter((a) =>
          ['Under Review', 'OA Received', 'Interview Scheduled'].includes(a.status)
        ).length
      );
    }
    if (sRejected) {
      sRejected.textContent = String(
        allApps.filter((a) => a.status === 'Rejected' || a.status === 'Ghosted').length
      );
    }

    // Source breakdown
    const portalCounts: Record<string, number> = {};
    allApps.forEach((a) => {
      const src = getAppSource(a);
      if (src) portalCounts[src] = (portalCounts[src] || 0) + 1;
    });
    const portalsSection = document.getElementById('portalsSection');
    const portalsGrid = document.getElementById('portalsGrid');

    if (portalsSection && portalsGrid) {
      if (Object.keys(portalCounts).length > 0) {
        portalsSection.style.display = 'block';
        portalsGrid.innerHTML = Object.entries(portalCounts)
          .sort(([, a], [, b]) => b - a)
          .map(
            ([name, count]) => `
              <div class="portal-pill ${portalFilter === name ? 'active' : ''}" data-portal="${esc(name)}">
                <span class="portal-name">${esc(name)}</span>
                <span class="portal-count">${count}</span>
              </div>
            `
          )
          .join('');

        portalsGrid.querySelectorAll<HTMLElement>('.portal-pill').forEach((pill) => {
          pill.addEventListener('click', () => {
            const p = pill.dataset.portal || 'All';
            portalFilter = portalFilter === p ? 'All' : p;
            const pf = document.getElementById('portalFilter') as HTMLSelectElement;
            if (pf) pf.value = portalFilter;
            currentPage = 1;
            render();
          });
        });
      } else {
        portalsSection.style.display = 'none';
      }
    }

    // Portal filter dropdown options
    const portalSel = document.getElementById('portalFilter') as HTMLSelectElement;
    if (portalSel) {
      const currentPortalVal = portalFilter;
      const uniquePortals = Array.from(new Set(allApps.map((a) => getAppSource(a)).filter(Boolean))).sort();
      portalSel.innerHTML =
        '<option value="All">All Sources</option>' +
        uniquePortals
          .map((p) => `<option ${p === currentPortalVal ? 'selected' : ''}>${esc(p)}</option>`)
          .join('');
      portalSel.value = currentPortalVal;
    }

    // Filter + sort
    const vis = sorted(filtered());
    const totalPages = Math.max(1, Math.ceil(vis.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;
    const page = vis.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    // Table body
    const tbody = document.getElementById('tableBody');
    const stateBox = document.getElementById('tableState');
    const pagination = document.getElementById('pagination');

    if (!tbody || !stateBox || !pagination) return;

    if (allApps.length === 0) {
      tbody.innerHTML = '';
      stateBox.innerHTML = `<div class="state-box"><div class="state-icon">🚀</div><div class="state-title">No applications tracked yet</div><div class="state-sub">Apply on job portals — the extension will auto-capture them.<br/>Or click "Add Application" to log one manually.</div></div>`;
      pagination.style.display = 'none';
      return;
    }

    if (vis.length === 0) {
      tbody.innerHTML = '';
      stateBox.innerHTML = `<div class="state-box"><div class="state-icon">🔍</div><div class="state-title">No matching applications</div><div class="state-sub">Try adjusting your search or filters.</div></div>`;
      pagination.style.display = 'none';
      return;
    }

    stateBox.innerHTML = '';
    tbody.innerHTML = page
      .map(
        (app) => `
        <tr data-id="${app.id}">
          <td class="td-company">${esc(app.companyName)}</td>
          <td>
            <span class="badge badge-source">
              ${esc(getAppSource(app))}
            </span>
          </td>
          <td class="td-role" title="${esc(app.jobRole)}">${esc(app.jobRole)}</td>
          <td>
            <select class="status-select" data-id="${app.id}">
              ${ALL_STATUSES.map(
                (s) => `<option ${s === app.status ? 'selected' : ''} value="${s}">${s}</option>`
              ).join('')}
            </select>
          </td>
          <td class="td-date">
            <span style="font-weight:600;color:var(--text);">${esc(app.appliedDate)}</span><br/>
            <span class="td-time">${esc(app.appliedTime || '')}</span>
          </td>
          <td class="td-email" title="${esc(app.applicantEmail)}">${esc(app.applicantEmail || '—')}</td>
          <td class="td-actions">
            ${
              app.applicationLink
                ? `<button class="action-btn open-btn" title="Open job posting in new tab" data-url="${esc(
                    app.applicationLink
                  )}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg></button>`
                : ''
            }
            <button class="action-btn copy-btn" title="Copy job URL" data-url="${esc(
              app.applicationLink || ''
            )}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>
            <button class="action-btn edit-btn" title="Edit details" data-id="${app.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
            <button class="action-btn del del-btn" title="Delete application" data-id="${app.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
          </td>
        </tr>
      `
      )
      .join('');

    // Bind row actions
    tbody.querySelectorAll<HTMLSelectElement>('.status-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        const idx = allApps.findIndex((a) => a.id === id);
        if (idx >= 0) {
          allApps[idx].status = sel.value;
          allApps[idx].updatedAt = new Date().toISOString();
          await saveApps(allApps);
          showToast('Status updated!');
          render();
        }
      });
    });

    tbody.querySelectorAll<HTMLButtonElement>('.open-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.url) chrome.tabs.create({ url: btn.dataset.url });
      });
    });

    tbody.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.url) {
          navigator.clipboard.writeText(btn.dataset.url);
          btn.textContent = '✓';
          setTimeout(() => {
            btn.textContent = '📋';
          }, 1500);
        }
      });
    });

    tbody.querySelectorAll<HTMLButtonElement>('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.id) openEditModal(btn.dataset.id);
      });
    });

    tbody.querySelectorAll<HTMLButtonElement>('.del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this application?')) return;
        allApps = allApps.filter((a) => a.id !== btn.dataset.id);
        await saveApps(allApps);
        showToast('Application deleted.', 'error');
        render();
      });
    });

    // Pagination
    if (totalPages > 1) {
      pagination.style.display = 'flex';
      const pageInfo = document.getElementById('pageInfo');
      if (pageInfo) {
        pageInfo.textContent = `Showing ${(currentPage - 1) * PER_PAGE + 1}–${Math.min(
          currentPage * PER_PAGE,
          vis.length
        )} of ${vis.length}`;
      }
      const btns = document.getElementById('pageBtns');
      if (btns) {
        const pages: string[] = [];
        if (currentPage > 1) pages.push('<button class="page-btn" data-p="prev">‹</button>');
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        if (start > 1) pages.push('<button class="page-btn" data-p="1">1</button>');
        if (start > 2) pages.push('<span style="color:var(--text3);padding:0 4px">…</span>');
        for (let i = start; i <= end; i++) {
          pages.push(
            `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-p="${i}">${i}</button>`
          );
        }
        if (end < totalPages - 1) pages.push('<span style="color:var(--text3);padding:0 4px">…</span>');
        if (end < totalPages)
          pages.push(`<button class="page-btn" data-p="${totalPages}">${totalPages}</button>`);
        if (currentPage < totalPages) pages.push('<button class="page-btn" data-p="next">›</button>');
        btns.innerHTML = pages.join('');
        btns.querySelectorAll<HTMLButtonElement>('.page-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const p = btn.dataset.p;
            if (p === 'prev') currentPage--;
            else if (p === 'next') currentPage++;
            else if (p) currentPage = parseInt(p, 10);
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        });
      }
    } else {
      pagination.style.display = 'none';
    }
  }

  // ── Sort Headers ───────────────────────────────────────────────────
  document.querySelectorAll<HTMLElement>('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const f = th.dataset.sort as keyof JobApplication;
      if (sortField === f) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = f;
        sortDir = 'asc';
      }
      document.querySelectorAll<HTMLElement>('th[data-sort]').forEach((t) => {
        const fieldName = t.dataset.sort || '';
        const spanId = 'sort' + fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        const span = document.getElementById(spanId);
        if (span) {
          span.textContent = t.dataset.sort === sortField ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
        }
        t.classList.toggle('sorted', t.dataset.sort === sortField);
      });
      render();
    });
  });

  // ── Search & Filters ───────────────────────────────────────────────
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = (e.target as HTMLInputElement).value;
      currentPage = 1;
      render();
    });
  }

  const statusFilterEl = document.getElementById('statusFilter') as HTMLSelectElement;
  if (statusFilterEl) {
    statusFilterEl.addEventListener('change', (e) => {
      statusFilter = (e.target as HTMLSelectElement).value;
      currentPage = 1;
      render();
    });
  }

  const portalFilterEl = document.getElementById('portalFilter') as HTMLSelectElement;
  if (portalFilterEl) {
    portalFilterEl.addEventListener('change', (e) => {
      portalFilter = (e.target as HTMLSelectElement).value;
      currentPage = 1;
      render();
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────
  function openAddModal() {
    editingId = null;
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('modalForm') as HTMLFormElement;
    const overlay = document.getElementById('modalOverlay');
    const compInput = document.getElementById('mCompany') as HTMLInputElement;
    if (title) title.textContent = 'Add Application';
    if (form) form.reset();
    if (overlay) overlay.classList.add('open');
    if (compInput) compInput.focus();
  }

  function openEditModal(id: string) {
    const app = allApps.find((a) => a.id === id);
    if (!app) return;
    editingId = id;
    const title = document.getElementById('modalTitle');
    const comp = document.getElementById('mCompany') as HTMLInputElement;
    const role = document.getElementById('mRole') as HTMLInputElement;
    const link = document.getElementById('mLink') as HTMLInputElement;
    const email = document.getElementById('mEmail') as HTMLInputElement;
    const status = document.getElementById('mStatus') as HTMLSelectElement;
    const portal = document.getElementById('mPortal') as HTMLInputElement;
    const notes = document.getElementById('mNotes') as HTMLInputElement;
    const overlay = document.getElementById('modalOverlay');

    if (title) title.textContent = 'Edit Application';
    if (comp) comp.value = app.companyName || '';
    if (role) role.value = app.jobRole || '';
    if (link) link.value = app.applicationLink || '';
    if (email) email.value = app.applicantEmail || '';
    if (status) status.value = app.status || 'Applied';
    if (portal) portal.value = app.portalName || '';
    if (notes) notes.value = app.notes || '';
    if (overlay) overlay.classList.add('open');
    if (comp) comp.focus();
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('open');
    editingId = null;
  }

  document.getElementById('addBtn')?.addEventListener('click', openAddModal);
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  const modalForm = document.getElementById('modalForm') as HTMLFormElement;
  if (modalForm) {
    modalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const comp = (document.getElementById('mCompany') as HTMLInputElement).value.trim();
      const role = (document.getElementById('mRole') as HTMLInputElement).value.trim();
      if (!comp || !role) {
        showToast('Company and role are required.', 'error');
        return;
      }

      const btn = document.getElementById('modalSaveBtn') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
      }

      const now = new Date();
      const sourceVal = (document.getElementById('mPortal') as HTMLInputElement).value.trim() || 'Manual';
      if (editingId) {
        const idx = allApps.findIndex((a) => a.id === editingId);
        if (idx >= 0) {
          allApps[idx] = {
            ...allApps[idx],
            companyName: comp,
            source: sourceVal || allApps[idx].source || allApps[idx].portalName,
            portalName: sourceVal || allApps[idx].portalName || 'Manual',
            jobRole: role,
            applicationLink: (document.getElementById('mLink') as HTMLInputElement).value.trim(),
            applicantEmail: (document.getElementById('mEmail') as HTMLInputElement).value.trim(),
            status: (document.getElementById('mStatus') as HTMLSelectElement).value,
            notes: (document.getElementById('mNotes') as HTMLInputElement).value.trim(),
            updatedAt: now.toISOString(),
          };
        }
        await saveApps(allApps);
        showToast('Application updated!');
      } else {
        const newApp: JobApplication = {
          id: genId(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          companyName: comp,
          source: sourceVal,
          portalName: sourceVal,
          jobRole: role,
          applicationLink: (document.getElementById('mLink') as HTMLInputElement).value.trim(),
          applicantEmail: (document.getElementById('mEmail') as HTMLInputElement).value.trim(),
          status: (document.getElementById('mStatus') as HTMLSelectElement).value,
          notes: (document.getElementById('mNotes') as HTMLInputElement).value.trim(),
          appliedDate: now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          appliedTime: now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        };
        allApps.unshift(newApp);
        await saveApps(allApps);
        showToast('Application saved!');
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save';
      }
      closeModal();
      render();
    });
  }

  // ── Export CSV ─────────────────────────────────────────────────────
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    if (!allApps.length) {
      showToast('No applications to export.', 'error');
      return;
    }
    const headers = ['Company', 'Source', 'Role', 'Status', 'Date', 'Time', 'Email', 'Link', 'Notes'];
    const rows = allApps.map((a) =>
      [
        a.companyName,
        getAppSource(a),
        a.jobRole,
        a.status,
        a.appliedDate,
        a.appliedTime,
        a.applicantEmail,
        a.applicationLink,
        a.notes || '',
      ].map((v) => `"${(v || '').replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job_applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
  });

  // ── Storage change listener (for real-time updates) ────────────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.applications) {
      allApps = (changes.applications.newValue as JobApplication[]) || [];
      render();
    }
  });

  // ── Init ───────────────────────────────────────────────────────────
  load();
})();
