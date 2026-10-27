param([ValidateRange(0,3600)][int]$Duration = 0, [ValidateSet(0,10020,10021,10024,10019,10016)][int]$MapId = 0)
$ErrorActionPreference = 'Stop'
if (Get-Process -Name 'Europa_Client' -ErrorAction SilentlyContinue) { throw 'Exit the running game before starting another session.' }
if ($MapId -eq 0) {
    & (Join-Path $PSScriptRoot 'start_research.ps1') -Duration $Duration -LocalMenu
    return
}
Write-Host 'Local character roaming: snow map, third-person view, native movement and collision.'
Write-Host 'Allow a few minutes to load. Click the game, then use W/A/S/D and the mouse.'
Write-Host 'The local session stays active until you close the game.'
& (Join-Path $PSScriptRoot 'start_research.ps1') -Duration $Duration -CharacterRoaming -MapId $MapId
