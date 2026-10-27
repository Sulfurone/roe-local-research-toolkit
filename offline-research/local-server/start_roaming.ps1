param([ValidateRange(30,3600)][int]$Duration = 3600)
$ErrorActionPreference = 'Stop'
$ExistingClient = Get-Process -Name 'Europa_Client' -ErrorAction SilentlyContinue
if ($ExistingClient) { throw 'A game client is already running. Exit it before starting another local map session.' }
Write-Host 'Local snow-map free camera. Character walking is still under development.'
Write-Host 'Loading can take several minutes. Numpad 5: forward; 1: left; 6: up.'
& (Join-Path $PSScriptRoot 'start_research.ps1') -Duration $Duration -ExperimentalCharacter -MapProbe -FreeBaseProbe
