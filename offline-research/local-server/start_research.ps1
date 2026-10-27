param(
    [ValidateRange(0, 3600)][int]$Duration = 360,
    [switch]$SceneProbe,
    [switch]$ProbeOutbox,
    [switch]$LoginDiagnostic,
    [switch]$ExperimentalCharacter,
    [switch]$MapProbe,
    [switch]$FreeCameraProbe,
    [switch]$FreeBaseProbe,
    [switch]$ActorSceneProbe,
    [switch]$ActorRebuildProbe,
    [switch]$NativeSceneStartProbe,
    [switch]$VehicleTrace,
    [switch]$CharacterRoaming,
    [switch]$LocalMenu,
    [ValidateSet(10020,10021,10024,10019,10016)][int]$MapId = 10020,
    [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$RunName = ('run-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
)
$ErrorActionPreference = 'Stop'
if ($LocalMenu) { $CharacterRoaming = $true }
if ($CharacterRoaming) { $ExperimentalCharacter = $true; $NativeSceneStartProbe = $true }
$ResearchRoot = $PSScriptRoot
$GameRoot = [IO.Path]::GetFullPath((Join-Path $ResearchRoot '..\..'))
# Resolve the Python interpreter: honour $env:ROAM_PYTHON when set, otherwise any
# python.exe on PATH. Install requirements.txt into that interpreter first (see README).
if ($env:ROAM_PYTHON) { $PythonExe = $env:ROAM_PYTHON }
else { $PythonExe = (Get-Command python.exe -ErrorAction SilentlyContinue).Source }
if (!$PythonExe -or !(Test-Path -LiteralPath $PythonExe)) {
    throw 'No Python interpreter found. Set $env:ROAM_PYTHON to a Python path, or put python.exe on PATH (see README).'
}
foreach ($Build in (Get-Content -LiteralPath (Join-Path $ResearchRoot 'supported-build.json') | ConvertFrom-Json)) {
    $BuildPath = Join-Path $GameRoot ([IO.Path]::GetFileName($Build.Path))
    $BuildStream = [IO.File]::OpenRead($BuildPath)
    $BuildHasher = [Security.Cryptography.SHA256]::Create()
    try { $BuildDigest = [BitConverter]::ToString($BuildHasher.ComputeHash($BuildStream)).Replace('-', '') }
    finally { $BuildHasher.Dispose(); $BuildStream.Dispose() }
    if ($BuildDigest -ne $Build.Hash) {
        throw "Unsupported client build: $BuildPath"
    }
}
$RunDir = Join-Path $ResearchRoot ('captures\' + $RunName)
if (Test-Path -LiteralPath $RunDir) { throw "Capture directory already exists: $RunDir" }
New-Item -ItemType Directory -Path $RunDir | Out-Null
$ServerProcess = $null
$BridgeProcess = $null
$ClientProcess = $null
try {
    $ServerDuration = if ($Duration -eq 0) { 0 } else { $Duration + 10 }
    $ServerArgs = @('-u', ('"' + (Join-Path $ResearchRoot 'server.py') + '"'), '--run-dir', ('"' + $RunDir + '"'), '--duration', $ServerDuration, '--allow-local-bridge', '--application-auth', '--world-login')
    if ($ProbeOutbox) { $ServerArgs += '--probe-outbox' }
    if ($CharacterRoaming) { $ServerArgs += '--simulation-clock' }
    if ($ExperimentalCharacter) { $ServerArgs += @('--experimental-character-fields', ('"' + (Join-Path $ResearchRoot 'fixtures\experimental-character-world-fields.bin') + '"')) }
    $ServerProcess = Start-Process -FilePath $PythonExe -ArgumentList $ServerArgs -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $RunDir 'server-stderr.txt')
    for ($Attempt = 0; $Attempt -lt 100; $Attempt++) {
        if ($ServerProcess.HasExited) { throw 'Local server failed; see server-stderr.txt.' }
        if (Test-Path -LiteralPath (Join-Path $RunDir 'ready.json')) { break }
        Start-Sleep -Milliseconds 100
    }
    if (!(Test-Path -LiteralPath (Join-Path $RunDir 'ready.json'))) { throw 'Local server startup timed out.' }
    $BridgeArgs = @('-u', ('"' + (Join-Path $ResearchRoot 'instrument_client.py') + '"'), '--launch', ('"' + (Join-Path $GameRoot 'Europa_Client.exe') + '"'), '--seconds', $Duration, '--output', ('"' + $RunDir + '"'), '--script', ('"' + (Join-Path $ResearchRoot 'local_transport_bridge.js') + '"'))
    if ($SceneProbe) { $BridgeArgs += '--scene-probe' }
    if ($LoginDiagnostic) { $BridgeArgs += '--login-diagnostic' }
    if ($MapProbe) { $BridgeArgs += '--map-probe' }
    if ($FreeCameraProbe) { $BridgeArgs += '--free-camera-probe' }
    if ($FreeBaseProbe) { $BridgeArgs += '--free-base-probe' }
    if ($ActorSceneProbe) { $BridgeArgs += '--actor-scene-probe' }
    if ($ActorRebuildProbe) { $BridgeArgs += '--actor-rebuild-probe' }
    if ($NativeSceneStartProbe) { $BridgeArgs += '--native-scene-start-probe' }
    if ($VehicleTrace) { $BridgeArgs += '--vehicle-trace' }
    if ($CharacterRoaming) { $BridgeArgs += '--character-roaming' }
    if ($LocalMenu) { $BridgeArgs += '--local-menu' }
    # The local UI script also carries LocalRoamUI, the Lua HUD takeover and the
    # loadout restore that character roaming depends on, so it must be injected
    # for every roaming session. --local-ui injects it without enabling the
    # lobby map picker, which would otherwise block a direct -MapId launch.
    elseif ($CharacterRoaming) { $BridgeArgs += '--local-ui' }
    $BridgeArgs += @('--map-id', $MapId)
    $BridgeProcess = Start-Process -FilePath $PythonExe -ArgumentList $BridgeArgs -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $RunDir 'bridge-stderr.txt')
    for ($Attempt = 0; $Attempt -lt 100; $Attempt++) {
        if ($BridgeProcess.HasExited) { throw 'Instrumentation failed; see bridge-stderr.txt.' }
        if (Test-Path -LiteralPath (Join-Path $RunDir 'client.pid')) {
            $ClientIdText = Get-Content -LiteralPath (Join-Path $RunDir 'client.pid') -Raw
            if ($ClientIdText -match '^\d+$' -and [int]$ClientIdText -gt 0) { break }
        }
        Start-Sleep -Milliseconds 100
    }
    $ClientId = [int](Get-Content -LiteralPath (Join-Path $RunDir 'client.pid'))
    if ($ClientId -le 0) { throw 'Invalid client process identifier.' }
    $ClientProcess = Get-Process -Id $ClientId
    @{Server = $ServerProcess.Id; Client = $ClientId; Bridge = $BridgeProcess.Id; RunDir = $RunDir} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $ResearchRoot 'active-run.json')
    Write-Output "Experimental localhost session. Character roaming enabled: $CharacterRoaming. Logs: $RunDir"
    $Deadline = (Get-Date).AddSeconds($Duration)
    while (!$ClientProcess.HasExited -and !$BridgeProcess.HasExited -and ($Duration -eq 0 -or (Get-Date) -lt $Deadline)) {
        Start-Sleep -Milliseconds 500
    }
} finally {
    foreach ($OwnedProcess in @($ClientProcess, $BridgeProcess, $ServerProcess)) {
        if ($null -ne $OwnedProcess -and !$OwnedProcess.HasExited) { Stop-Process -InputObject $OwnedProcess -Force -ErrorAction SilentlyContinue }
    }
}
