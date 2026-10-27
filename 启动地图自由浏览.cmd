@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0offline-research\local-server\start_roaming.ps1"
if errorlevel 1 pause
