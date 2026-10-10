# CivicWorks — Public works, made visible
**CivicTech hackathon project · IIITDM Kancheepuram**
CivicWorks is a mobile-friendly web application concept for making public construction and repair work easier for residents to understand, and easier for ward officers to coordinate. It brings public works, disruption information, responsibilities, updates, and resident reports together in one place.

> **Demo-data notice:** records and coordinates bundled with the project are fictional examples clustered near IIITDM Kancheepuram. They are for demonstrating the interface only, not real government records.

## What the app includes

- **Nearby works map:** browser geolocation with permission, a 1–50 km search radius, map markers, locality/project search, and status/category filters.
- **Public project details:** project type, ward and department, contractor, responsible officer, planned and actual dates, expected work hours, progress, estimated cost, reported expenditure, materials, quality notes, source label, updates, delay reasons, resident impact, safety hazards, and traffic/access guidance.
- **Past, ongoing, delayed and planned work:** residents can check what is happening now and what is expected next.
- **Resident issue reporting:** report a hazard, delay or quality concern, optionally attach a photo, receive a ticket code, and look up the status and authority response.
- **Ward officer workspace:** create/update public-work records and review resident reports.
- **Cross-department coordination warning:** flags work from different departments that is within 350 metres and has overlapping date ranges. It is a review prompt, not proof of a conflict; an officer should verify the exact road segment.
- **Supabase backend option:** shared project/report records with Supabase Auth, PostgreSQL Row Level Security, ward-specific officer permissions, and private report-photo storage.
- **Local demo mode:** if Supabase is not configured, the website uses sample data in the current browser's local storage. This makes the prototype easy to run but is not shared storage or real officer authentication.
- **Responsive English interface:** designed for desktop and mobile browsers.

## Start on Windows (PowerShell / VS Code)

1. Install Node.js LTS from <https://nodejs.org/>.
2. Extract this project and open the project folder in VS Code.
3. Select **Terminal → New Terminal**. Confirm Node is installed:

   ```powershell
   node -v
   ```

4. On Windows PowerShell, use `npm.cmd` if PowerShell blocks `npm.ps1` with an execution-policy error:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

5. Open the local URL Vite prints, normally <http://localhost:5173/>. Keep the terminal open while testing.
6. Click **Use my live location** and allow permission. Try opening a marker, changing the search radius, filing a sample report and tracking its ticket, and entering **Try officer demo**.

Stop the development server with `Ctrl+C` in the terminal. For a production-build check, run:

```powershell
npm.cmd run build
```

## GitHub repository and public deployment

This repository includes a GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). After the project is pushed to a **public** GitHub repository on branch `main`, it installs dependencies, builds the site, and deploys the `dist` folder to GitHub Pages. Vite is configured with relative asset paths so the site works at a GitHub Pages project URL.

Follow the complete guide in [`docs/GITHUB_PUBLISHING.md`](docs/GITHUB_PUBLISHING.md). After creating an empty public GitHub repository, you can double-click `publish_to_github.bat` and paste the repository HTTPS URL. The script pushes the source after GitHub sign-in. In short:

1. Create a public GitHub repository without auto-creating files.
2. Push this project folder to branch `main`.
3. In GitHub, select **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open **Actions**, wait for **Build and deploy CivicWorks to GitHub Pages** to succeed, then copy the public website URL from the deployment summary or **Settings → Pages**.
5. Test the public HTTPS website on a phone.

The Pages workflow deploys the sample/demo mode unless Supabase configuration is provided. See the next section before using official records.

## Connect shared data and secure officer accounts (Supabase)

This is optional for the local UI demo but required for multiple residents/officers to share records and for the officer permissions to be enforced by the database.

1. Create a project at <https://supabase.com/>.
2. In **SQL Editor → New query**, paste and run all of [`supabase/schema.sql`](supabase/schema.sql).
3. In **Project Settings → API**, copy the Project URL and **anon/public key**. Never put a `service_role` key into browser code.
4. Copy `.env.example` to `.env.local` in the project root and fill in:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

5. Restart the development server. If both values exist, the app uses Supabase rather than local demo storage.
6. In Supabase **Authentication → Users**, create/invite the official's individual account. Then assign the official's role and exact ward in **SQL Editor**, replacing the example values:

   ```sql
   update public.profiles
   set role = 'officer', full_name = 'Ward Officer Name', ward = 'Ward 12'
   where id = (
     select id from auth.users
     where email = 'officer@example.gov.in'
   );
   ```

   Use `role = 'admin'` only for a trusted administrator. Residents should not receive officer credentials. Use the same ward label in profiles and project records. Database row-level security limits an officer to their assigned ward.

7. To configure the GitHub Pages build, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repository **Actions secrets**. The public anon key is included in the browser bundle by design; security comes from RLS policies, not from hiding the anon key. Never add the Supabase `service_role` key to a Vite variable or client-side secret.
8. Add the deployed GitHub Pages URL to Supabase Auth's allowed site/redirect URLs.

### Before using real resident or government data

- Replace every sample project with verified records and exact work-site coordinates.
- Confirm authority approval for contractor, cost, spending, officer and other published details. Do not guess missing information; mark it as not disclosed/not recorded.
- Review the SQL, privacy notice, retention policy and public ticket lookup with the relevant authority. Add rate limits, abuse controls, backups, audit/export procedures and a safe process for revoking officials' access.
- Public geolocation is opt-in. The app uses coordinates in browser memory to filter map results and does not save the user's live location to the project database.
- The drawn radius is a distance filter, not an official ward/geofence polygon. Use verified ward boundary GIS data before using this for administrative boundary decisions.
- The demo officer mode is intentionally not authentication. Never present it as real, secure government login.

## Hackathon submission checklist

The supplied problem statement asks for a GitHub repository, a 2–5 minute demo video in that repository, a README with the problem/solution/setup, disclosed open-source libraries/APIs, and an accessible deployment.

- [x] Problem statement and solution documented below.
- [x] Source repository structure and setup instructions included.
- [x] Open-source libraries and external services disclosed in **Tech stack and API disclosures**.
- [x] GitHub Pages build/deploy workflow included.
- [x] Push repository to GitHub: <https://github.com/yasovardhan26-dotcom/civicworks-hackathon>.
- [x] Enable GitHub Pages and deploy the public website: <https://yasovardhan26-dotcom.github.io/civicworks-hackathon/>. The production build and deploy workflow completed successfully.
- [ ] Record a real 2–5 minute demonstration and commit it as `demo/civicworks-demo.mp4`. Use [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md). The placeholder folder contains instructions only; it is not a fake video.
- [ ] Test the deployed website on a phone and add/view the demo video after recording.

### Problem statement

**Improving Transparency and Coordination in Public Works Projects.** Residents often cannot tell what work is happening nearby, who is responsible, how long disruption will last, why a schedule slipped, or how to follow up on a hazard. Departments may also schedule work on the same road without being aware of one another's plans.

### Proposed solution

CivicWorks is a single map-and-timeline experience for planned, ongoing, delayed and completed public works. Residents can see work dates, status, progress, cost/material disclosures, responsible departments, expected disruption and safety information, and can file trackable reports. Ward officers can update records and respond to residents. A cross-department warning helps officials identify nearby projects with overlapping date ranges for further review.

## Tech stack and API disclosures

- **React** and **React DOM** — interface and client rendering.
- **Vite** and **@vitejs/plugin-react** — development server and production build.
- **Leaflet** and **React Leaflet** — interactive map and map layers.
- **OpenStreetMap tiles/data** — map display; attribution is required and the tile usage policy applies.
- **Lucide React** — interface icons.
- **Supabase JavaScript client** and optional **Supabase Auth, PostgreSQL, Row Level Security and Storage** — shared data and officer authentication when configured.
- **Browser Geolocation API** — asks the resident's browser for opt-in live location; coordinates are used to centre/filter the map.
- **Node.js/npm** — development/build tooling.

No connection to a real municipal/government system is included. The default sample records are fictional. The MIT license is included in [`LICENSE`](LICENSE).

Map attribution and policy: <https://www.openstreetmap.org/copyright> and <https://operations.osmfoundation.org/policies/tiles/>.

## Demo video

Record and include the real app demonstration in the repository. Use [`docs/DEMO_VIDEO_SCRIPT.md`](docs/DEMO_VIDEO_SCRIPT.md) for a 3-minute storyboard and save the video as `demo/civicworks-demo.mp4`. Do not claim that the demo mode is secure officer authentication or that fictional records are real government works.
