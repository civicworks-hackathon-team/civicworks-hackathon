# CivicWorks 3-minute demo video script

**Submission requirement:** record a real 2–5 minute screen recording of the running app and commit it to this repository. The script below is a guide, not a substitute for a recording. Save the final MP4 as `demo/civicworks-demo.mp4` and update the README link after recording.

Use sample records only unless the team has verified public records and permission to show them. Narrate that sample data is fictional. Record the deployed HTTPS URL if available, not only a local development screen.

## Suggested run time: 3 minutes 20 seconds

### 0:00–0:20 — Problem and solution

**Show:** CivicWorks homepage and title.

**Say:** “Residents often see roads dug up, drains repaired, and streetlights replaced without an easy way to know the timeline, the responsible department, or the reason for delays. CivicWorks brings public-work information together in one mobile-friendly map.”

### 0:20–0:55 — Find works near me

**Show:** click **Use my live location**, approve the browser prompt, change the radius, and choose a marker or project card.

**Say:** “Residents can opt in to share their live location with the browser. The map filters projects to a selected radius. The circle is a search radius, not an official ward boundary, and location coordinates are not saved by this app.”

### 0:55–1:35 — Project transparency

**Show:** project details with planned/actual dates, status/progress, department, contractor, cost disclosure, material/quality notes, resident impact and safety notes. Scroll to delay reason or update history if populated.

**Say:** “Each work record makes dates, progress, responsibility, costs where disclosed, materials, safety risks, disruptions, and delay explanations easier to find. Unknown or undisclosed information should be labelled honestly rather than invented.”

### 1:35–2:00 — Coordination

**Show:** coordination alert/list, preferably with two nearby sample projects from different departments with overlapping dates.

**Say:** “CivicWorks flags nearby work by different departments when date ranges overlap. This is a review warning, not proof that a conflict exists; officials should verify the actual road segment before changing plans.”

### 2:00–2:35 — Resident report and ticket tracking

**Show:** submit a sample safety/quality report, display the generated ticket, then use ticket lookup to show status/response.

**Say:** “Residents can report a hazard, delay, or quality concern and track its ticket. In the local demo, this stays in the current browser; in connected mode, reports are shared through the configured database and ward permissions.”

### 2:35–3:05 — Officer workspace and permission model

**Show:** enter the officer demo, update a sample record or review a report, then point out the Supabase sign-in flow.

**Say:** “The officer workspace demonstrates how ward staff maintain project records and respond to reports. The demo mode is not real authentication. With Supabase configured, the database uses row-level security so ward officers manage only their assigned ward, while admins have broader access.”

### 3:05–3:20 — Close

**Show:** return to map, briefly show the GitHub repository and public deployment URL.

**Say:** “CivicWorks improves visibility for residents and provides a shared starting point for coordinating public works. The prototype is designed to grow from clearly labelled sample records into verified ward data.”

## Recording and repository checklist

- [ ] Duration is between 2 and 5 minutes.
- [ ] Narration is clear and the text is readable on screen.
- [ ] The website used in the recording actually loads and its key interactions work.
- [ ] The video does not reveal passwords, access tokens, private contact details, or unapproved real government data.
- [ ] Export to MP4/H.264 at 720p or 1080p; keep the file under GitHub's 100 MB individual-file limit.
- [ ] Save as `demo/civicworks-demo.mp4` and commit it to the repository.
- [ ] Add a link to the video in the project's README.
