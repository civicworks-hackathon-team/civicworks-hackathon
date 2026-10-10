@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==============================================
echo   CivicWorks - publish this folder to GitHub
echo ==============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found.
  echo Install Git for Windows from https://git-scm.com/download/win
  echo Then reopen this file.
  echo.
  pause
  exit /b 1
)

set "REPO_URL="
set /p "REPO_URL=Paste the HTTPS URL of your EMPTY public GitHub repo (ending in .git): "
if not defined REPO_URL (
  echo No repository URL entered. Nothing was pushed.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  git init
  if errorlevel 1 goto :failed
)
git branch -M main
if errorlevel 1 goto :failed

git add .
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
  for /f "delims=" %%N in ('git config user.name 2^>nul') do set "GIT_USER_NAME=%%N"
  for /f "delims=" %%E in ('git config user.email 2^>nul') do set "GIT_USER_EMAIL=%%E"
  if not defined GIT_USER_NAME (
    set /p "GIT_USER_NAME=Enter the name to show on your Git commits: "
    call git config user.name "%%GIT_USER_NAME%%"
  )
  if not defined GIT_USER_EMAIL (
    set /p "GIT_USER_EMAIL=Enter the email associated with your GitHub account: "
    call git config user.email "%%GIT_USER_EMAIL%%"
  )
  git commit -m "Prepare CivicWorks hackathon submission"
  if errorlevel 1 goto :failed
) else (
  echo No new file changes to commit.
)

set "HAS_ORIGIN="
for /f "delims=" %%R in ('git remote') do if /I "%%R"=="origin" set "HAS_ORIGIN=1"
if defined HAS_ORIGIN (
  git remote set-url origin "%REPO_URL%"
) else (
  git remote add origin "%REPO_URL%"
)
if errorlevel 1 goto :failed

echo.
echo Pushing branch main. Git may open a browser for GitHub sign-in.
echo.
git push -u origin main
if errorlevel 1 goto :failed

echo.
echo Success: CivicWorks source is now pushed to GitHub.
echo Next: open Settings - Pages and set Source to GitHub Actions.
echo Then open Actions to watch the site build and deployment.
echo.
pause
exit /b 0

:failed
echo.
echo The Git command failed, so publishing may be incomplete.
echo Read the error above. Ensure the repo is empty and your GitHub sign-in worked.
echo See docs\GITHUB_PUBLISHING.md for troubleshooting.
echo.
pause
exit /b 1
