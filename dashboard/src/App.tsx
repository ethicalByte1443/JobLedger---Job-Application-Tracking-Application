import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from './store';
import type { ApplicationFromAPI } from './api';
import { deleteApplication, updateApplication, getCSVExportUrl } from './api';

// ============================================================
// Status Configuration
// ============================================================
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

function getStatusBadge(status: string): string {
  const s = status.toLowerCase();
  if (s === 'rejected' || s === 'ghosted') return 'badge badge-rejected';
  if (s === 'accepted' || s === 'offer received') return 'badge badge-accepted';
  if (s.includes('interview') || s.includes('oa') || s === 'under review')
    return 'badge badge-interview';
  if (s === 'applied') return 'badge badge-applied';
  return 'badge badge-default';
}

// ============================================================
// Icons
// ============================================================
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
);
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
);

const ITEMS_PER_PAGE = 10;

type SortField = 'companyName' | 'jobRole' | 'appliedDate' | 'status' | 'portalName';
type SortDir = 'asc' | 'desc';

function App() {
  const { applications, loading, error, darkMode, loadApplications, removeApplication, updateApplicationInStore, toggleDarkMode } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [portalFilter, setPortalFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('appliedDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const uniquePortals = useMemo(
    () => Array.from(new Set(applications.map((a: ApplicationFromAPI) => a.portalName))).sort(),
    [applications]
  );

  const filtered = useMemo(() => {
    return applications.filter((app: ApplicationFromAPI) => {
      const matchesSearch =
        (app.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.jobRole || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.applicantEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      const matchesPortal = portalFilter === 'All' || app.portalName === portalFilter;
      return matchesSearch && matchesStatus && matchesPortal;
    });
  }, [applications, searchTerm, statusFilter, portalFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: ApplicationFromAPI, b: ApplicationFromAPI) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginatedApps = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, portalFilter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const statusCounts: Record<string, number> = {};
    const portalCounts: Record<string, number> = {};

    applications.forEach((app: ApplicationFromAPI) => {
      if (app.status) {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      }
      if (app.portalName) {
        portalCounts[app.portalName] = (portalCounts[app.portalName] || 0) + 1;
      }
    });

    return { total, statusCounts, portalCounts };
  }, [applications]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleStatusChange = async (app: ApplicationFromAPI, newStatus: string) => {
    try {
      const updated = await updateApplication(app.id, { status: newStatus });
      updateApplicationInStore(updated);
    } catch {
      alert('Failed to update status');
    }
    setEditingStatus(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this application?')) return;
    try {
      await deleteApplication(id);
      removeApplication(id);
    } catch {
      alert('Failed to delete application');
    }
  };

  const handleCopyLink = (app: ApplicationFromAPI) => {
    navigator.clipboard.writeText(app.applicationLink);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-5 py-4 font-semibold cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (sortDir === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />)}
      </span>
    </th>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              📋 Job Application Tracker
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {stats.total} total application{stats.total !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="btn-ghost" title="Toggle Dark Mode">
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            <a href={getCSVExportUrl()} className="btn-primary" download>
              <DownloadIcon /> Export CSV
            </a>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="stat-card">
            <span className="text-2xl font-extrabold text-blue-600">{stats.total}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl font-extrabold text-emerald-600">{stats.statusCounts['Accepted'] || 0}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accepted</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl font-extrabold text-amber-600">{(stats.statusCounts['Interview Scheduled'] || 0) + (stats.statusCounts['OA Received'] || 0)}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">In Progress</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl font-extrabold text-red-500">{stats.statusCounts['Rejected'] || 0}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rejected</span>
          </div>
        </div>

        {Object.keys(stats.portalCounts).length > 0 && (
          <div className="card p-5 mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Portal-wise Breakdown</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.portalCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([portal, count]) => (
                  <div key={portal} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{portal}</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search company, role, or email..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="select-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="select-field" value={portalFilter} onChange={(e) => setPortalFilter(e.target.value)}>
            <option value="All">All Portals</option>
            {uniquePortals.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="card overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <p className="text-lg font-semibold">⚠️ {error}</p>
              <button onClick={loadApplications} className="mt-4 btn-primary">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <p className="text-6xl mb-4">🚀</p>
              <p className="text-lg font-semibold">No applications tracked yet</p>
              <p className="text-sm mt-1">Start applying on job portals — the extension will capture them automatically!</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    <tr>
                      <SortHeader field="companyName" label="Company" />
                      <SortHeader field="portalName" label="Source" />
                      <SortHeader field="jobRole" label="Role" />
                      <SortHeader field="status" label="Status" />
                      <SortHeader field="appliedDate" label="Date & Time" />
                      <th className="px-5 py-4 font-semibold">Email</th>
                      <th className="px-5 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {paginatedApps.map((app: ApplicationFromAPI) => (
                      <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {app.companyName}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="badge badge-applied" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.2)' }}>
                            {app.portalName || 'Direct'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">{app.jobRole}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {editingStatus === app.id ? (
                            <select
                              autoFocus
                              className="select-field text-xs py-1 px-2"
                              defaultValue={app.status}
                              onChange={(e) => handleStatusChange(app, e.target.value)}
                              onBlur={() => setEditingStatus(null)}
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`${getStatusBadge(app.status)} cursor-pointer`}
                              onClick={() => setEditingStatus(app.id)}
                              title="Click to change status"
                            >
                              {app.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {app.appliedDate}<br />
                          <span className="text-xs">{app.appliedTime}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                          {app.applicantEmail}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {app.portalName}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleCopyLink(app)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                              title={copiedId === app.id ? 'Copied!' : 'Copy link'}
                            >
                              {copiedId === app.id ? '✓' : <CopyIcon />}
                            </button>
                            <a
                              href={app.applicationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
                              title="Open job link"
                            >
                              <ExternalLinkIcon />
                            </a>
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-slate-400 hover:text-red-500"
                              title="Delete"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
                  </p>
                  <div className="flex gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && applications.length > 0 && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <p className="text-lg font-semibold">No matching applications</p>
              <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
