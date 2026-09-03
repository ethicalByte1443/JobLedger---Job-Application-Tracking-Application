You are a Senior Staff Software Engineer with 15+ years of experience in building scalable browser extensions, full-stack SaaS applications, and automation tools.

I want you to build a production-grade full-stack project called "Job Application Tracker".

Your task is NOT to build a simple browser extension. I want proper software architecture, scalable folder structure, reusable components, and industry-standard coding practices.

====================================================
PROJECT GOAL
====================================================

Build a Chrome Browser Extension that automatically tracks every job application I submit and stores the information in a database.

Whenever I successfully submit a job application on any website, the extension should automatically save the following details:

- Company Name
- Job Role / Position
- Job Application Link
- Applicant Email Address
- Date
- Time
- Current Status
- Job Portal Name
- Timestamp

By default, the status must always be:

Status = Applied

The system should then save the data into the backend database.

----------------------------------------------------

Example:

Company:
Google

Role:
Software Engineer Intern

Application Link:
https://careers.google.com/jobs/....

Email:
abc@gmail.com

Date:
28 July 2026

Time:
9:43 PM

Portal:
Google Careers

Status:
Applied

----------------------------------------------------

After saving the information, it must be visible inside a frontend dashboard.

====================================================
TECH STACK (MANDATORY)
====================================================

Browser Extension:
- Chrome Extension Manifest V3
- TypeScript
- Content Scripts
- Background Service Worker
- Chrome Storage API

Frontend Dashboard:
- React
- TypeScript
- Tailwind CSS
- Zustand for state management
- React Router

Backend:
- Node.js
- Express.js
- TypeScript

Database:
- PostgreSQL

ORM:
- Prisma

Deployment Ready:
- Docker support
- Environment variables

CSV Export:
- PapaParse

Future Email Integration:
- Gmail API (DO NOT IMPLEMENT NOW)
- IMAP Support (architecture should support future implementation)

====================================================
PROJECT STRUCTURE
====================================================

Create a scalable monorepo structure.

job-application-tracker/

    chrome-extension/
    dashboard/
    backend/
    shared-types/
    docs/

====================================================
BROWSER EXTENSION REQUIREMENTS
====================================================

The extension should work on:

- LinkedIn Jobs
- Wellfound
- Workday
- Lever
- Greenhouse
- Ashby
- YC Jobs
- Google Careers
- Microsoft Careers
- Amazon Careers
- Any custom careers page

The extension should detect when a job application has been submitted successfully.

Examples of success indicators:

- Application Submitted
- Successfully Applied
- Thanks for Applying
- Your application has been received
- Application Complete
- Submitted Successfully

Use:

- MutationObserver
- DOM inspection
- Content Scripts

to detect success messages.

====================================================
DATA EXTRACTION REQUIREMENTS
====================================================

Try to automatically extract:

- Company Name
- Job Title
- Current URL
- Portal Name
- Logged-in Email (if accessible)
- Timestamp

Extraction methods may include:

- URL parsing
- DOM parsing
- Meta tags
- Page title extraction

====================================================
MANUAL FALLBACK SYSTEM
====================================================

If any of the following cannot be extracted:

- Company Name
- Job Role
- Email

The extension should automatically open a popup asking the user to enter the missing information.

For example:

Missing:
- Company Name

Popup:

Enter Company Name:
[Input]

Save


The extension should NEVER fail because of missing information.

====================================================
STATUS SYSTEM
====================================================

By default:

Applied

Future statuses:

- Applied
- Under Review
- OA Received
- Interview Scheduled
- Offer Received
- Accepted
- Rejected
- Ghosted

Do NOT implement email automation now.

Only keep the architecture ready.

====================================================
DATABASE DESIGN
====================================================

Create proper Prisma models.

JobApplication:

- id
- companyName
- jobRole
- applicationLink
- applicantEmail
- portalName
- status
- appliedDate
- appliedTime
- createdAt
- updatedAt

Future Table:

EmailResponses

Fields:

- id
- jobApplicationId
- sender
- subject
- body
- classification
- receivedAt

Do NOT implement EmailResponses functionality.

Only prepare the architecture.

====================================================
BACKEND REQUIREMENTS
====================================================

Build REST APIs.

Required APIs:

GET

/api/applications

GET

/api/application/:id

POST

/api/application

PUT

/api/application/:id

DELETE

/api/application/:id

CSV Export API:

GET

/exports/csv

Create:

- Controllers
- Services
- Repository Layer
- Middlewares
- Validation Layer
- Error Handling Layer

Use:

- Prisma
- Express Router
- TypeScript interfaces

====================================================
DASHBOARD REQUIREMENTS
====================================================

Build a modern dashboard.

Dashboard should include:

- Total Applications
- Search Bar
- Filters
- Sorting
- Pagination

Columns:

- Company Name
- Job Role
- Application Link
- Applicant Email
- Portal Name
- Date
- Time
- Status

====================================================
FILTERS
====================================================

Filters:

Status:
- Applied
- Rejected
- Interview
- Accepted

Date Filter

Portal Filter

Company Filter

====================================================
CSV EXPORT
====================================================

Add:

Export CSV button.

Export:

- Company Name
- Job Role
- Link
- Email
- Status
- Date
- Time
- Portal

CSV should be downloaded directly from the dashboard.

====================================================
UI REQUIREMENTS
====================================================

Build a clean UI using:

- Tailwind CSS

Include:

- Dark Mode
- Responsive Design
- Loading States
- Empty States
- Error States

====================================================
EXTENSION TO BACKEND FLOW
====================================================

Successful Job Submission

↓

Content Script detects success.

↓

Extract information.

↓

Validate information.

↓

Missing fields?

YES
↓

Show popup.

↓

Collect missing fields.

↓

Send data to Background Service Worker.

↓

Send API request.

↓

Backend.

↓

Save in PostgreSQL.

↓

Return success response.

↓

Show:

"Application saved successfully."

====================================================
CSV FLOW
====================================================

Dashboard

↓

Export CSV

↓

Backend API

↓

Generate CSV

↓

Download file

====================================================
FUTURE EMAIL AUTOMATION (DO NOT IMPLEMENT)
====================================================

The architecture must support future implementation.

Future functionality:

1. Connect Gmail API.

2. Monitor incoming emails.

3. Detect emails from companies.

4. Match company name with existing job applications.

5. Classify the email.

Possible classifications:

- Positive Response
- Negative Response
- OA Received
- Interview Invitation
- Offer Letter
- Rejection
- Under Review

6. Automatically update:

JobApplication.status


Example:

Status:
Applied

Email:
"Congratulations! You have been shortlisted."

↓

Status:
OA Received


----------------------------------------------------

Email:
"We regret to inform you..."

↓

Status:
Rejected

----------------------------------------------------

DO NOT IMPLEMENT THIS FEATURE NOW.

Only design the codebase in such a way that it can be easily added later.

====================================================
CODING STANDARDS
====================================================

Requirements:

- TypeScript everywhere.
- Proper interfaces.
- Clean architecture.
- SOLID principles.
- Reusable components.
- Modular design.
- ESLint.
- Prettier.
- Environment variables.
- Docker support.
- Proper README documentation.
- Proper comments.
- API documentation.
- Error handling.
- Validation.
- Production-grade folder structure.

====================================================
BONUS FEATURES
====================================================

If possible, implement:

- Application statistics.
- Portal-wise analytics.
- Status-wise analytics.
- Monthly application statistics.
- Copy application link.
- Open job link button.
- Search and sorting.
- Dark mode.

====================================================
FINAL REQUIREMENT
====================================================

Build this as if it will eventually become a SaaS product used by thousands of job seekers.

Do NOT build a quick prototype.

Think and code like a Senior Software Architect.

Every feature should be scalable, maintainable, and production-ready.

The codebase should be easy to extend in the future for AI-based email classification and automatic status updates.