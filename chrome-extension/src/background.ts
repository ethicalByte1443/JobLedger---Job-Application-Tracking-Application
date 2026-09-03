/**
 * Background Service Worker for the Job Application Tracker.
 * Stores all data in chrome.storage.local — no backend required.
 * Works 100% offline and locally for every user.
 */

console.log('[JAT] Background service worker initialized.');

// ============================================================
// Types
// ============================================================
export interface JobApplication {
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

async function getApplications(): Promise<JobApplication[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['applications'], (result) => {
      resolve(result.applications || []);
    });
  });
}

async function saveApplications(apps: JobApplication[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ applications: apps }, resolve);
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function addApplication(data: Omit<JobApplication, 'id' | 'createdAt'>): Promise<JobApplication> {
  const apps = await getApplications();

  // Deduplication: Don't add same URL on the same calendar day
  const today = new Date().toDateString();
  const duplicate = apps.find(
    (a) => a.applicationLink === data.applicationLink && new Date(a.createdAt).toDateString() === today
  );
  if (duplicate) {
    console.log('[JAT] Duplicate detected — skipping save.');
    return duplicate;
  }

  const newApp: JobApplication = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...data,
  };

  await saveApplications([newApp, ...apps]);
  return newApp;
}

// ============================================================
// Badge helpers
// ============================================================

function setBadgeSuccess(tabId?: number) {
  const opts = tabId ? { tabId } : {};
  chrome.action.setBadgeText({ text: '✓', ...opts });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981', ...opts });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '', ...opts });
  }, 3000);
}

function setBadgeAlert(tabId?: number) {
  const opts = tabId ? { tabId } : {};
  chrome.action.setBadgeText({ text: '!', ...opts });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', ...opts });
}

function clearBadge(tabId?: number) {
  const opts = tabId ? { tabId } : {};
  chrome.action.setBadgeText({ text: '', ...opts });
}

// ============================================================
// Install / startup
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JAT] Job Application Tracker installed.');
  // Initialize storage if empty
  chrome.storage.local.get(['applications', 'extensionEnabled'], (result) => {
    const updates: Record<string, unknown> = {};
    if (!result.applications) updates.applications = [];
    // Default: extension is enabled
    if (result.extensionEnabled === undefined) updates.extensionEnabled = true;
    if (Object.keys(updates).length > 0) chrome.storage.local.set(updates);
  });
});

// ============================================================
// Message listener
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ── Auto-detected application from content script ──
  if (request.action === 'APPLICATION_DETECTED') {
    const data = request.data;
    console.log('[JAT] Application detected:', data);

    const missingFields: string[] = [];
    if (!data.companyName) missingFields.push('companyName');
    if (!data.jobRole) missingFields.push('jobRole');

    if (missingFields.length > 0) {
      // Store partial data and show badge so user can open popup to fill in gaps
      chrome.storage.local.set({
        pendingApplication: data,
        missingFields: missingFields,
      }, () => {
        if (sender.tab?.id) {
          setBadgeAlert(sender.tab.id);
        }
        sendResponse({ success: false, needsInput: true, missingFields });
      });
    } else {
      // All required fields present — save directly
      const now = new Date();
      const source = data.source || data.portalName || 'Direct / Other';
      const payload = {
        companyName: data.companyName,
        source: source,
        portalName: source,
        jobRole: data.jobRole,
        applicationLink: data.applicationLink || window?.location?.href || '',
        applicantEmail: data.applicantEmail || '',
        status: 'Applied',
        notes: '',
        appliedDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
        appliedTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      };

      addApplication(payload).then((saved) => {
        if (sender.tab?.id) setBadgeSuccess(sender.tab.id);
        sendResponse({ success: true, message: 'Application saved!', app: saved });
      }).catch((err) => {
        sendResponse({ success: false, message: err.message });
      });
    }
    return true;
  }

  // ── Save complete application (from popup form after filling missing fields) ──
  if (request.action === 'SAVE_COMPLETE_APPLICATION') {
    const data = request.data;
    const now = new Date();
    const source = data.source || data.portalName || 'Manual';
    const payload = {
      companyName: data.companyName || '',
      source: source,
      portalName: source,
      jobRole: data.jobRole || '',
      applicationLink: data.applicationLink || '',
      applicantEmail: data.applicantEmail || '',
      status: data.status || 'Applied',
      notes: data.notes || '',
      appliedDate: data.appliedDate || now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      appliedTime: data.appliedTime || now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    addApplication(payload).then((saved) => {
      chrome.storage.local.remove(['pendingApplication', 'missingFields']);
      // Clear badge on all tabs
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => { if (tab.id) clearBadge(tab.id); });
      });
      sendResponse({ success: true, message: 'Application saved!', app: saved });
    }).catch((err) => {
      sendResponse({ success: false, message: err.message });
    });
    return true;
  }

  // ── Delete an application ──
  if (request.action === 'DELETE_APPLICATION') {
    getApplications().then((apps) => {
      const filtered = apps.filter((a) => a.id !== request.id);
      return saveApplications(filtered);
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, message: err.message });
    });
    return true;
  }

  // ── Update an application ──
  if (request.action === 'UPDATE_APPLICATION') {
    getApplications().then((apps) => {
      const updated = apps.map((a) =>
        a.id === request.id ? { ...a, ...request.data } : a
      );
      return saveApplications(updated);
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, message: err.message });
    });
    return true;
  }

  // ── Get all applications ──
  if (request.action === 'GET_APPLICATIONS') {
    getApplications().then((apps) => {
      sendResponse({ success: true, data: apps });
    });
    return true;
  }

  // ── Get extension enabled/disabled state ──
  if (request.action === 'GET_EXTENSION_STATE') {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      const isEnabled = result.extensionEnabled !== false;
      sendResponse({ success: true, enabled: isEnabled });
    });
    return true;
  }

  // ── Set extension enabled/disabled state ──
  if (request.action === 'SET_EXTENSION_STATE') {
    const enabled = request.enabled !== false;
    chrome.storage.local.set({ extensionEnabled: enabled }, () => {
      console.log(`[JAT] Extension ${enabled ? 'enabled' : 'disabled'}.`);
      sendResponse({ success: true, enabled });
    });
    return true;
  }
});
