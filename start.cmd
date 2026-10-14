@echo off
rem Double-click to start the agent-notify dashboard (or just open it if already running).
cd /d "%~dp0"
node notify.mjs dashboard --open
if errorlevel 1 start "" http://localhost:7878
