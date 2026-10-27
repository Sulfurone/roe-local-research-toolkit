@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0offline-research\local-server\start_character_roaming.ps1" -MapId 10019
if errorlevel 1 pause
