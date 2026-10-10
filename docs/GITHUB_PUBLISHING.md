# Publish CivicWorks to GitHub (Windows beginner guide)

This project includes a GitHub Actions workflow that builds and publishes the website to GitHub Pages every time you push to `main`.

## A. Create the repository

1. Sign in at <https://github.com/>.
2. Click **New repository**.
3. Name it `civicworks-hackathon` (or another simple name).
4. Select **Public** so your judges can access the source and GitHub Pages site.
5. Do not add a README, `.gitignore`, or license when creating it; this project already contains them.
6. Create the repository and keep its page open.

## B. Push the code to GitHub

**Beginner option:** after creating the empty repository, double-click `publish_to_github.bat` in the extracted project folder. Paste the HTTPS URL of your empty repository when prompted, then complete the GitHub browser sign-in if asked. The script stages the project, makes a commit, and pushes branch `main`. It does not upload `.env`/`.env.local` because those files are excluded by `.gitignore`.

If you prefer commands, or the script fails, open the extracted project folder in VS Code and choose **Terminal → New Terminal**. Check that Git is available:

```powershell
git --version
```

If PowerShell says Git is not recognized, install **Git for Windows** from <https://git-scm.com/download/win>, close VS Code, reopen it, and try again.

Run these commands from the project folder. Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username. Keep the URL of the repository you created.

```powershell
git init
git branch -M main
git add .
git status
git commit -m "Build CivicWorks CivicTech hackathon project"
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/civicworks-hackathon.git
git push -u origin main
```

If `git remote add origin` says the remote already exists, use this instead:

```powershell
git remote set-url origin https://github.com/YOUR-GITHUB-USERNAME/civicworks-hackathon.git
git push -u origin main
```

GitHub may open a browser window for sign-in. Use the browser/credential prompt; GitHub account passwords are not accepted as HTTPS Git passwords. Never paste a personal access token into this README, source code, or chat.

If Git says your identity is not configured, set the name and email you use on GitHub, then retry the commit:

```powershell
git config --global user.name "Your Name"
git config --global user.email "YOUR-EMAIL-USED-ON-GITHUB"
git commit -m "Build CivicWorks CivicTech hackathon project"
```

## C. Turn on GitHub Pages

1. Open the repository on GitHub.
2. Select **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and watch **Build and deploy CivicWorks to GitHub Pages**.
5. When it succeeds, open **Settings → Pages** or the deployment summary to find the public website URL. It will usually look like `https://YOUR-GITHUB-USERNAME.github.io/civicworks-hackathon/`.
6. Open the link in a phone browser and test the site over HTTPS. Browser location permission should work after the user approves it.

The workflow builds in demo mode by default. If you set up Supabase first, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Secrets and variables → Actions → New repository secret**. These are browser-side values in a Vite application, not private server credentials: only use the Supabase anon/public key and enforce access in Row Level Security. Never add the Supabase `service_role` key to this website or GitHub secrets used for a client-side build.

## D. Check the published project

- Confirm the homepage loads and the map tiles load.
- Press **Use my live location** and approve the browser permission.
- Change the search radius and open at least one project marker.
- Submit a clearly fictional demo report and track its ticket (in demo mode it is stored only in that browser).
- Use the officer demo only to demonstrate the interface. Do not imply it authenticates real officers; that requires a configured Supabase project and officer profiles.
- Check the GitHub Actions run for a green result. If deployment fails, open the failed workflow step and read the error before submitting.
