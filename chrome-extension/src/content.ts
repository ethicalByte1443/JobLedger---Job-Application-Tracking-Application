/**
 * Content Script for Job Application Tracker.
 *
 * Accurately extracts:
 * 1. Company (The actual hiring employer / organization — NEVER the job title or portal name)
 * 2. Source (The site / portal where applied, e.g. LinkedIn, Indeed, Greenhouse, etc.)
 * 3. Role & Email
 */

// ============================================================
// Blocked Domains — never run detection on these sites
// ============================================================
const BLOCKED_DOMAINS = [
  'chatgpt.com',
  'chat.openai.com',
  'openai.com',
  'github.com',
  'gitlab.com',
  'google.com',
  'youtube.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'stackoverflow.com',
  'notion.so',
  'slack.com',
  'discord.com',
  'figma.com',
  'canva.com',
  'medium.com',
  'dev.to',
  'hashnode.com',
  'producthunt.com',
  'dribbble.com',
  'behance.net',
  'trello.com',
  'asana.com',
  'jira.atlassian.com',
  'confluence.atlassian.com',
  'docs.google.com',
  'mail.google.com',
  'calendar.google.com',
  'drive.google.com',
  'outlook.live.com',
  'outlook.office.com',
  'dropbox.com',
  'box.com',
  'netflix.com',
  'amazon.com',
  'flipkart.com',
  'swiggy.com',
  'zomato.com',
  'news.ycombinator.com',
  'wikipedia.org',
  'localhost',
  '127.0.0.1',
];

/**
 * Returns true if the current page hostname is in the blocked list.
 */
function isBlockedDomain(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return BLOCKED_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d));
}

// ============================================================
// Success Indicators
// ============================================================
const SUCCESS_INDICATORS = [
  'application submitted',
  'successfully applied',
  'thanks for applying',
  'thank you for applying',
  'your application has been received',
  'application complete',
  'submitted successfully',
  'your application has been submitted',
  'you have successfully applied',
  'application was submitted',
  'congratulations! your application',
  'application received',
  'we received your application',
  'application is complete',
  'you\'ve applied',
  'applied successfully',
  'application sent',
  'resume submitted',
  'profile submitted',
];

// Known job boards, portals, and ATS systems to exclude from employer name
const KNOWN_PORTALS = [
  'linkedin',
  'indeed',
  'naukri',
  'greenhouse',
  'lever',
  'workday',
  'ashby',
  'internshala',
  'wellfound',
  'angellist',
  'smartrecruiters',
  'glassdoor',
  'ziprecruiter',
  'monster',
  'simplyhired',
  'careerbuilder',
  'dice',
  'hired',
  'otta',
  'ycombinator',
  'workable',
  'jobvite',
  'icims',
  'taleo',
  'bamboohr',
  'recruitee',
  'rippling',
  'dover',
  'applytojob',
];

// Common words that indicate a string is a JOB ROLE, NOT an employer name
const ROLE_KEYWORDS = [
  'engineer',
  'developer',
  'designer',
  'manager',
  'analyst',
  'intern',
  'internship',
  'specialist',
  'director',
  'lead',
  'architect',
  'consultant',
  'associate',
  'scientist',
  'officer',
  'coordinator',
  'administrator',
  'executive',
  'representative',
  'frontend',
  'front-end',
  'backend',
  'back-end',
  'fullstack',
  'full-stack',
  'full stack',
  'data',
  'devops',
  'qa',
  'tester',
  'sre',
  'security',
  'product',
  'marketing',
  'sales',
  'recruiter',
  'support',
  'writer',
  'technician',
  'accountant',
  'lawyer',
  'nurse',
  'assistant',
  'operations',
  'programmer',
  'sde',
  'swe',
  'vp',
  'head of',
  'trainee',
  'fellow',
  'apprentice',
];

let alreadyDetected = false;

// ============================================================
// Data Structure
// ============================================================

interface ExtractedData {
  companyName: string;
  source: string;
  portalName: string;
  jobRole: string;
  applicationLink: string;
  applicantEmail: string;
}

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Checks if a string is a known portal/ATS name
 */
function isPortalName(str: string): boolean {
  if (!str) return true;
  const lower = str.toLowerCase().trim();
  return KNOWN_PORTALS.some((p) => lower === p || lower.includes(p));
}

/**
 * Checks if a string looks like a Job Role/Title rather than an Employer Name
 */
function isJobRoleText(str: string): boolean {
  if (!str) return false;
  const lower = str.toLowerCase().trim();
  return ROLE_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lower);
  });
}

/**
 * Cleans extracted company names
 */
function cleanCompany(str: string): string {
  if (!str) return '';
  let s = str.trim();
  // Remove trailing location or boilerplate like " - San Francisco, CA", " (US)", " | Careers"
  s = s.replace(/\s*[-–|·]\s*(Careers|Jobs|Hiring|Workday|LinkedIn|Indeed|Job).*$/i, '');
  s = s.replace(/\s*\((Remote|Hybrid|On-site|[A-Z]{2}|USA?|India|UK)\)$/i, '');
  s = s.replace(/^Careers\s+at\s+/i, '');
  s = s.replace(/^Jobs\s+at\s+/i, '');
  s = s.replace(/\s+Inc\.?$/i, '');
  s = s.replace(/\s+LLC\.?$/i, '');
  s = s.replace(/\s+Ltd\.?$/i, '');
  return s.trim();
}

/**
 * Cleans extracted job roles
 */
function cleanRole(str: string): string {
  if (!str) return '';
  let s = str.trim();
  s = s.replace(/^Job\s+Application\s+for\s+/i, '');
  s = s.replace(/^Applying\s+for\s+/i, '');
  s = s.replace(/\s*[-–|·]\s*(Careers|Jobs|LinkedIn|Indeed).*$/i, '');
  return s.trim();
}

// ============================================================
// Company Extraction (Strictly Employer Name)
// ============================================================

function extractCompanyName(): string {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname;

  // ── 1. Platform-Specific High Precision Extractors ──

  // LinkedIn
  if (hostname.includes('linkedin.com')) {
    // Look specifically for company links on LinkedIn
    const companyLinks = Array.from(document.querySelectorAll('a[href*="/company/"]'));
    for (const a of companyLinks) {
      const text = a.textContent?.trim() || '';
      if (text && !isPortalName(text) && !isJobRoleText(text) && text.length > 1 && text.length < 60) {
        return cleanCompany(text);
      }
    }

    const linkedInSelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__subtitle-primary-grouping a',
      '[data-test-employer-name]',
      '.jobs-details__company-name',
    ];

    for (const sel of linkedInSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }
  }

  // Greenhouse
  if (hostname.includes('greenhouse.io')) {
    const ghSelectors = [
      '#header .company-name',
      '.company-name',
      'span.company-name',
      'h2.company-name',
    ];
    for (const sel of ghSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }

    // Greenhouse URL is often boards.greenhouse.io/{company}
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !isPortalName(parts[0]) && !isJobRoleText(parts[0])) {
      return cleanCompany(parts[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }

  // Lever
  if (hostname.includes('lever.co')) {
    const logoImg = document.querySelector('.main-header-logo img') as HTMLImageElement;
    if (logoImg?.alt && !isPortalName(logoImg.alt) && !isJobRoleText(logoImg.alt)) {
      return cleanCompany(logoImg.alt);
    }
    const logoLink = document.querySelector('a.main-header-logo');
    if (logoLink?.textContent && !isPortalName(logoLink.textContent) && !isJobRoleText(logoLink.textContent)) {
      return cleanCompany(logoLink.textContent);
    }

    // Lever URL is jobs.lever.co/{company}
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !isPortalName(parts[0]) && !isJobRoleText(parts[0])) {
      return cleanCompany(parts[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }

  // Workday
  if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) {
    const wdSelectors = [
      '[data-automation-id="company"]',
      'header [data-automation-id="logo"] img',
      '.css-h2urz6',
    ];
    for (const sel of wdSelectors) {
      const el = document.querySelector(sel);
      const text = (el as HTMLImageElement)?.alt || el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }

    // Workday subdomain is usually company name: {company}.wd5.myworkdayjobs.com
    const sub = hostname.split('.')[0];
    if (sub && !isPortalName(sub) && sub !== 'www' && !isJobRoleText(sub)) {
      return sub.charAt(0).toUpperCase() + sub.slice(1);
    }
  }

  // Ashby
  if (hostname.includes('ashbyhq.com')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !isPortalName(parts[0]) && !isJobRoleText(parts[0])) {
      return cleanCompany(parts[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }

  // Indeed
  if (hostname.includes('indeed.com')) {
    const cmpLinks = Array.from(document.querySelectorAll('a[href*="/cmp/"]'));
    for (const a of cmpLinks) {
      const text = a.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }

    const indeedSelectors = [
      '[data-company-name="true"]',
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.jobsearch-JobInfoHeader-companyName a',
      '.jobsearch-JobInfoHeader-companyName',
      '.jobsearch-CompanyInfoContainer a',
    ];
    for (const sel of indeedSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }
  }

  // Naukri
  if (hostname.includes('naukri.com')) {
    const naukriSelectors = [
      'a.jd-header-comp-name',
      '.jd-header-comp-name',
      'a[href*="/overview-"]',
    ];
    for (const sel of naukriSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }
  }

  // Internshala
  if (hostname.includes('internshala.com')) {
    const isSelectors = [
      '.link_display_like_text',
      '.company_name a',
      '.company_name',
    ];
    for (const sel of isSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }
  }

  // Wellfound / AngelList
  if (hostname.includes('wellfound.com') || hostname.includes('angel.co')) {
    const wfSelectors = [
      '[data-test="StartupName"]',
      '.styles_startupName__IfBhc',
      'a[href^="/company/"]',
    ];
    for (const sel of wfSelectors) {
      const el = document.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text && !isPortalName(text) && !isJobRoleText(text)) {
        return cleanCompany(text);
      }
    }
  }

  // SmartRecruiters
  if (hostname.includes('smartrecruiters.com')) {
    const el = document.querySelector('.company-name') || document.querySelector('[class*="companyName"]');
    const text = el?.textContent?.trim();
    if (text && !isPortalName(text) && !isJobRoleText(text)) {
      return cleanCompany(text);
    }
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0 && !isPortalName(parts[0]) && !isJobRoleText(parts[0])) {
      return cleanCompany(parts[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }

  // ── 2. JSON-LD Schema (HiringOrganization) ──
  try {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      const data = JSON.parse(script.textContent || '{}');
      const orgName = data.hiringOrganization?.name || data.author?.name || data.publisher?.name;
      if (orgName && !isPortalName(orgName) && !isJobRoleText(orgName)) {
        return cleanCompany(orgName);
      }
    }
  } catch {}

  // ── 3. Smart Document Title Parsing ──
  const title = document.title;
  if (title) {
    // Pattern: "[Role] at [Company]" (e.g. "Software Engineer at Stripe | LinkedIn")
    if (title.includes(' at ')) {
      const afterAt = title.split(' at ')[1] || '';
      const candidate = afterAt.split(/[-–|·]/)[0]?.trim();
      if (candidate && !isPortalName(candidate) && !isJobRoleText(candidate)) {
        return cleanCompany(candidate);
      }
    }

    // Pattern: "[Company] - [Role]" or "[Role] - [Company]"
    const segments = title.split(/[-–|·]/).map((s) => s.trim());
    for (const seg of segments) {
      if (
        seg &&
        !isPortalName(seg) &&
        !isJobRoleText(seg) &&
        !seg.toLowerCase().includes('careers') &&
        !seg.toLowerCase().includes('jobs') &&
        seg.length > 1 &&
        seg.length < 50
      ) {
        return cleanCompany(seg);
      }
    }
  }

  // ── 4. Generic Meta Tags (e.g. og:site_name on company websites) ──
  const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (ogSiteName && !isPortalName(ogSiteName) && !isJobRoleText(ogSiteName)) {
    return cleanCompany(ogSiteName);
  }

  return '';
}

// ============================================================
// Job Role Extraction (Position / Title)
// ============================================================

function extractJobRole(): string {
  const hostname = window.location.hostname.toLowerCase();

  // LinkedIn
  if (hostname.includes('linkedin.com')) {
    const el =
      document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ||
      document.querySelector('.job-details-jobs-unified-top-card__job-title') ||
      document.querySelector('.jobs-unified-top-card__job-title') ||
      document.querySelector('h1.t-24');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Greenhouse
  if (hostname.includes('greenhouse.io')) {
    const el = document.querySelector('.app-title') || document.querySelector('#header .app-title') || document.querySelector('h1');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Lever
  if (hostname.includes('lever.co')) {
    const el = document.querySelector('.posting-headline h2') || document.querySelector('h2');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Workday
  if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) {
    const el =
      document.querySelector('[data-automation-id="jobPostingHeader"]') ||
      document.querySelector('h2[data-automation-id="jobPostingHeader"]') ||
      document.querySelector('h1');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Ashby
  if (hostname.includes('ashbyhq.com')) {
    const el = document.querySelector('h1.ashby-job-posting-brief-title') || document.querySelector('h1');
    if (el?.textContent?.trim()) {
      const full = el.textContent.trim();
      return cleanRole(full.split(' at ')[0]);
    }
  }

  // Indeed
  if (hostname.includes('indeed.com')) {
    const el =
      document.querySelector('h1.jobsearch-JobInfoHeader-title') ||
      document.querySelector('[class*="jobTitle"]') ||
      document.querySelector('h1[class*="title"]') ||
      document.querySelector('.jobsearch-JobInfoHeader-title');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Naukri
  if (hostname.includes('naukri.com')) {
    const el = document.querySelector('.jd-header-title') || document.querySelector('[class*="jobTitle"]');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Internshala
  if (hostname.includes('internshala.com')) {
    const el = document.querySelector('.profile') || document.querySelector('[class*="title"]');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // Wellfound
  if (hostname.includes('wellfound.com') || hostname.includes('angel.co')) {
    const el =
      document.querySelector('[data-test="JobTitle"]') ||
      document.querySelector('.styles_title__xpQDw');
    if (el?.textContent?.trim()) return cleanRole(el.textContent);
  }

  // JSON-LD Schema
  try {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      const data = JSON.parse(script.textContent || '{}');
      if (data.title) return cleanRole(data.title);
    }
  } catch {}

  // Smart Title Parse for Role: "[Role] at [Company]" or "[Role] - [Company]"
  const title = document.title;
  if (title) {
    if (title.includes(' at ')) {
      const beforeAt = title.split(' at ')[0]?.trim();
      if (beforeAt && isJobRoleText(beforeAt)) return cleanRole(beforeAt);
    }
    const segments = title.split(/[-–|·]/).map((s) => s.trim());
    for (const seg of segments) {
      if (seg && isJobRoleText(seg) && !isPortalName(seg)) {
        return cleanRole(seg);
      }
    }
    // Fallback to first segment if not portal name
    if (segments.length > 0 && !isPortalName(segments[0])) {
      return cleanRole(segments[0]);
    }
  }

  const h1 = document.querySelector('h1');
  if (h1?.textContent?.trim()) {
    return cleanRole(h1.textContent.split(' at ')[0]);
  }

  return '';
}

// ============================================================
// Email & Source Extraction
// ============================================================

function extractEmail(): string {
  const selectors = [
    '[data-test-email]',
    '.profile-email',
    '[aria-label="Email"]',
    'input[type="email"][value]',
    '[class*="email"]',
    '[id*="email"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const val = (el as HTMLInputElement).value || el.getAttribute('value') || el.textContent || '';
      if (val.includes('@')) return val.trim();
    }
  }

  return '';
}

function extractSource(): string {
  const hostname = window.location.hostname.toLowerCase();
  const portalMap: Record<string, string> = {
    'linkedin.com': 'LinkedIn',
    'wellfound.com': 'Wellfound',
    'angel.co': 'Wellfound',
    'greenhouse.io': 'Greenhouse',
    'boards.greenhouse.io': 'Greenhouse',
    'lever.co': 'Lever',
    'jobs.lever.co': 'Lever',
    'myworkdayjobs.com': 'Workday',
    'workday.com': 'Workday',
    'ashbyhq.com': 'Ashby',
    'ycombinator.com': 'YC Jobs',
    'careers.google.com': 'Google Careers',
    'careers.microsoft.com': 'Microsoft Careers',
    'amazon.jobs': 'Amazon Careers',
    'indeed.com': 'Indeed',
    'naukri.com': 'Naukri',
    'internshala.com': 'Internshala',
    'workindia.in': 'WorkIndia',
    'smartrecruiters.com': 'SmartRecruiters',
    'icims.com': 'iCIMS',
    'taleo.net': 'Taleo',
    'bamboohr.com': 'BambooHR',
    'recruitee.com': 'Recruitee',
    'jobvite.com': 'Jobvite',
    'applytojob.com': 'ApplyToJob',
    'workable.com': 'Workable',
    'dover.com': 'Dover',
    'rippling.com': 'Rippling',
    'glassdoor.com': 'Glassdoor',
    'ziprecruiter.com': 'ZipRecruiter',
  };

  for (const [domain, name] of Object.entries(portalMap)) {
    if (hostname.includes(domain)) return name;
  }

  const clean = hostname.replace('www.', '').split('.')[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ============================================================
// Toast Notification
// ============================================================

function showToast(message: string, type: 'success' | 'info' | 'warning' = 'success') {
  const existing = document.getElementById('__jat-toast__');
  if (existing) existing.remove();

  const bgColor = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6';

  const toast = document.createElement('div');
  toast.id = '__jat-toast__';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: ${bgColor};
    color: white;
    padding: 12px 18px;
    border-radius: 10px;
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: __jat_slideIn 0.3s ease;
    pointer-events: none;
    max-width: 340px;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes __jat_slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes __jat_slideOut {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(20px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  toast.innerHTML = `<span style="font-size:16px">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = '__jat_slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================
// Confirmation Dialog — shown before saving any application
// ============================================================

function showConfirmationDialog(data: ExtractedData): void {
  // Remove any existing dialog
  document.getElementById('__jat-confirm__')?.remove();
  document.getElementById('__jat-confirm-backdrop__')?.remove();
  document.getElementById('__jat-confirm-styles__')?.remove();

  const backdrop = document.createElement('div');
  backdrop.id = '__jat-confirm-backdrop__';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    animation: __jat_fadeIn 0.2s ease;
  `;

  const dialog = document.createElement('div');
  dialog.id = '__jat-confirm__';
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483647;
    background: #0e1526;
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-radius: 16px;
    padding: 24px;
    width: 380px;
    max-width: calc(100vw - 32px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99,102,241,0.15);
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    color: #f8fafc;
    animation: __jat_slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const styles = document.createElement('style');
  styles.id = '__jat-confirm-styles__';
  styles.textContent = `
    @keyframes __jat_fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes __jat_slideUp {
      from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
      to   { opacity: 1; transform: translate(-50%, -50%); }
    }
    #__jat-confirm__ .jat-field { margin-bottom: 10px; }
    #__jat-confirm__ .jat-field-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: #64748b; margin-bottom: 4px;
      display: flex; align-items: center; gap: 5px;
    }
    #__jat-confirm__ .jat-edit-badge {
      font-size: 9px; font-weight: 600; padding: 1px 5px;
      background: rgba(99,102,241,0.15); color: #818cf8;
      border: 1px solid rgba(99,102,241,0.25); border-radius: 4px;
      text-transform: none; letter-spacing: 0;
    }
    #__jat-confirm__ .jat-input {
      width: 100%; font-size: 13px; font-weight: 500; color: #f1f5f9;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 8px 10px;
      font-family: 'Inter', -apple-system, system-ui, sans-serif;
      outline: none; box-sizing: border-box;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    }
    #__jat-confirm__ .jat-input::placeholder { color: #475569; font-style: italic; }
    #__jat-confirm__ .jat-input:focus {
      border-color: rgba(99,102,241,0.6);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      background: rgba(99,102,241,0.06);
    }
    #__jat-confirm__ .jat-input:hover:not(:focus) {
      border-color: rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.07);
    }
    #__jat-btn-save {
      flex: 1; padding: 10px; border: none; border-radius: 9px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: white; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: opacity 0.15s, transform 0.15s;
      font-family: inherit;
    }
    #__jat-btn-save:hover { opacity: 0.88; transform: translateY(-1px); }
    #__jat-btn-dismiss {
      flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 9px;
      background: rgba(255,255,255,0.05); color: #94a3b8;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background 0.15s, color 0.15s; font-family: inherit;
    }
    #__jat-btn-dismiss:hover { background: rgba(244,63,94,0.15); color: #fda4af; border-color: rgba(244,63,94,0.3); }
  `;
  document.head.appendChild(styles);

  dialog.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
      <div style="
        width:40px;height:40px;border-radius:11px;flex-shrink:0;
        background:linear-gradient(135deg,#4f46e5,#6366f1,#38bdf8);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 14px rgba(99,102,241,0.4);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#f8fafc;line-height:1.2;">Application Detected</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">Review &amp; edit details before saving</div>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px;margin-bottom:16px;">
      <div class="jat-field">
        <div class="jat-field-label">
          Company
          <span class="jat-edit-badge">✏ editable</span>
        </div>
        <input
          id="__jat-input-company"
          class="jat-input"
          type="text"
          placeholder="Enter company name..."
          value="${escapeHtml(data.companyName)}"
        />
      </div>
      <div class="jat-field">
        <div class="jat-field-label">
          Job Role
          <span class="jat-edit-badge">✏ editable</span>
        </div>
        <input
          id="__jat-input-role"
          class="jat-input"
          type="text"
          placeholder="Enter job role / title..."
          value="${escapeHtml(data.jobRole)}"
        />
      </div>
      <div class="jat-field" style="margin-bottom:0">
        <div class="jat-field-label">
          Source
          <span class="jat-edit-badge">✏ editable</span>
        </div>
        <input
          id="__jat-input-source"
          class="jat-input"
          type="text"
          placeholder="e.g. LinkedIn, Indeed, Direct..."
          value="${escapeHtml(data.source)}"
        />
      </div>
    </div>

    <div style="display:flex;gap:10px;">
      <button id="__jat-btn-dismiss">✕ Dismiss</button>
      <button id="__jat-btn-save">💾 Save Application</button>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);

  function closeDialog() {
    backdrop.remove();
    dialog.remove();
    styles.remove();
  }

  // Backdrop click dismisses (but NOT if user is typing in a field)
  backdrop.addEventListener('click', () => {
    closeDialog();
    alreadyDetected = false;
    showToast('Application dismissed.', 'info');
  });

  // Dismiss button
  document.getElementById('__jat-btn-dismiss')?.addEventListener('click', () => {
    closeDialog();
    alreadyDetected = false;
    showToast('Application dismissed.', 'info');
  });

  // Save — read values from inputs so edits are captured
  document.getElementById('__jat-btn-save')?.addEventListener('click', () => {
    const company = (document.getElementById('__jat-input-company') as HTMLInputElement)?.value.trim();
    const role    = (document.getElementById('__jat-input-role')    as HTMLInputElement)?.value.trim();
    const source  = (document.getElementById('__jat-input-source')  as HTMLInputElement)?.value.trim() || data.source;

    const finalData: ExtractedData = {
      ...data,
      companyName: company,
      jobRole: role,
      source: source,
      portalName: source,
    };

    closeDialog();
    showToast('Saving application...', 'info');

    chrome.runtime.sendMessage(
      { action: 'APPLICATION_DETECTED', data: finalData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[JAT] Error sending message:', chrome.runtime.lastError);
          return;
        }

        if (response?.success) {
          const displayComp = finalData.companyName ? finalData.companyName : (finalData.jobRole || 'Application');
          showToast(`Saved: ${displayComp} via ${finalData.source}! 🎉`, 'success');
        } else if (response?.needsInput) {
          showToast('Almost! Open the extension to confirm details.', 'warning');
        }
      }
    );
  });
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// MutationObserver & Detection Handler
// ============================================================

function checkForSuccessMessage(): boolean {
  const pageText = document.body?.innerText?.toLowerCase() || '';
  return SUCCESS_INDICATORS.some((indicator) => pageText.includes(indicator));
}

function onSuccessDetected(): void {
  if (alreadyDetected) return;
  alreadyDetected = true;

  console.log('[JAT] ✅ Job application submission detected!');

  let company = extractCompanyName();
  let role = extractJobRole();
  const source = extractSource();

  // Safety Cross-Validation:
  // If company and role ended up identical, or if company was detected as a role:
  if (company && isJobRoleText(company) && (!role || isJobRoleText(role))) {
    // Company was actually the role
    role = company;
    company = '';
  }

  const extracted: ExtractedData = {
    companyName: company,
    source: source,
    portalName: source,
    jobRole: role,
    applicationLink: window.location.href,
    applicantEmail: extractEmail(),
  };

  console.log('[JAT] Extracted data:', extracted);

  // Show confirmation dialog — user decides whether to save
  showConfirmationDialog(extracted);
}

// ============================================================
// Entry Point — check enabled state before doing anything
// ============================================================

function initDetection() {
  // 1. Check if blocked domain — bail immediately
  if (isBlockedDomain()) {
    console.log('[JAT] Blocked domain — detection disabled for:', window.location.hostname);
    return;
  }

  // 2. Check if extension is globally enabled
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    // Default to enabled if not set
    const isEnabled = result.extensionEnabled !== false;

    if (!isEnabled) {
      console.log('[JAT] Extension is disabled — skipping detection.');
      return;
    }

    // 3. Initial check in case page already has success message
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      if (checkForSuccessMessage()) {
        onSuccessDetected();
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      if (!alreadyDetected && checkForSuccessMessage()) {
        onSuccessDetected();
      }
    });

    // Observe DOM mutations for dynamically-rendered success messages
    const observer = new MutationObserver(() => {
      if (!alreadyDetected && checkForSuccessMessage()) {
        onSuccessDetected();
        observer.disconnect();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      });
    }
  });
}

initDetection();
