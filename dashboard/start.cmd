@echo off
rem Double-click to start the agent-notify dashboard (or just open it if already running).
node "%~dp0..\tools\concurrency\notify.mjs" dashboard --open
if errorlevel 1 start "" http://localhost:7878
