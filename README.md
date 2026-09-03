# 💼 Job Application Tracker (Chrome Extension)

A lightweight, beautiful, and 100% privacy-focused Chrome Extension that automatically tracks your job applications across popular portals (LinkedIn, Greenhouse, Lever, Workday, Ashby, Indeed, Naukri, Internshala, and more).

> **🔒 100% Local & Offline**: All your application data is stored privately on your machine in Chrome's local storage. No accounts, no database, and no server required!

---

## ⚡ Quick Start (Install & Share in 3 Steps)

Anyone can use this extension right away with **zero setup**:

1. **Build the extension** (if you're pulling from source):
   ```bash
   npm install
   npm run build:extension
   ```
2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/` in your browser.
   - Toggle **Developer mode** on (top-right corner).
3. **Load the extension**:
   - Click **Load unpacked** (top-left).
   - Select the `chrome-extension/` folder in this project.
   - **Pin the extension** to your Chrome toolbar! 📌

---

## 🚀 Features

### 1. 🤖 Automatic Detection
- **Smart Employer vs. Source Separation**:
  - **Company**: Automatically extracts the actual hiring employer / organization (e.g. Google, Stripe, Microsoft, Amazon), avoiding confusing the platform with the employer.
  - **Source**: Automatically identifies the job board or ATS where the application was submitted (e.g. LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, Naukri, Internshala, Wellfound, SmartRecruiters, etc.).
- **Data Captured**: Company Name, Source, Job Role, Application Link, Date, and Time.
- Shows a non-intrusive toast notification on the page when tracked: `Saved: Google via LinkedIn! 🎉`.

### 2. 🗂️ Mini Popup Dashboard
Click the extension icon in your toolbar to:
- **View Recent Applications**: See your most recent job applications with the employer name and a distinct source badge (e.g. `📍 LinkedIn`).
- **Add Manually**: Form with dedicated fields for Company (Employer) and Source (Site/Portal).
- **Analytics & Stats**: Quick visual breakdown by status and sources used.
- **Export to CSV**: Download all applications as a spreadsheet with `Company` and `Source` columns.
- **Open Full Dashboard**: Jump directly into the full-screen dashboard page.

### 3. 📊 Full-Screen Local Dashboard (`dashboard.html`)
- Built directly into the extension (`chrome-extension://<id>/dashboard.html`).
- **Column Structure**: `Company` ➔ `Source` ➔ `Role` ➔ `Status` ➔ `Date` ➔ `Email` ➔ `Actions`.
- **Interactive Search & Multi-Filters**: Live search by company, source, role, or email, with quick filter pills for each source.
- **Column Sorting**: Sort by Company, Source, Role, Status, or Date.
- **Inline Status Editor**: Update application status directly from the table.
- **Notes & Editing**: Add custom notes or update job details.
- **Paginated Table**: Clean viewing for hundreds of applications.

---

## 📁 Project Structure

```
job-browser-extension/
├── chrome-extension/         # 🌟 The Standalone Chrome Extension (Ready to use & share)
│   ├── manifest.json         # Manifest V3 configuration
│   ├── popup.html            # Extension popup UI
│   ├── dashboard.html        # Full-page local dashboard UI
│   ├── icons/                # Extension icons (16, 32, 48, 128px)
│   ├── src/
│   │   ├── background.ts     # Service worker (local storage CRUD & badges)
│   │   ├── content.ts        # Portal extractors & toast notifications
│   │   ├── popup.ts          # Popup logic & tab system
│   │   └── dashboard.ts      # Dashboard logic, search, filter & export
│   └── dist/                 # Compiled JavaScript files
│
├── dashboard/                # (Optional) Standalone React + Vite web dashboard
├── backend/                  # (Optional) Node.js + Express + Prisma backend
└── shared-types/             # (Optional) Shared TypeScript schemas
```

---

## 🛠️ Development

To make changes to the extension:

```bash
# Watch for TypeScript changes
npm run dev:extension

# Build production bundle
npm run build:extension
```

After modifying the source code, simply click the **Refresh** button on the extension card in `chrome://extensions/`.

---

## 🤝 Sharing With Friends

To share this extension with your friends:
1. Run `npm run build:extension` (to ensure `dist/` is up-to-date).
2. Zip or send them the `chrome-extension/` folder.
3. Tell them to open `chrome://extensions/`, turn on **Developer mode**, and **Load unpacked** on that folder.
4. That's it! It runs entirely in their browser with zero setup or servers required.

---

## 📄 License
ISC
