"""Launch the local research session without PowerShell's duplicate-env bug.

PowerShell 5.1's Start-Process fails when the parent environment holds both
"NO_PROXY" and "no_proxy" (DSH injects both). Python's os.environ normalises keys,
so spawning from here is safe. Mirrors start_research.ps1 for a character-roaming
session with the local UI injected.
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
GAME_ROOT = HERE.parent.parent
# Use the interpreter that launched this script. Install the pinned dependencies
# (see requirements.txt) into it, or point PYTHON at a venv before invoking.
PYTHON = Path(sys.executable)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--map-id', type=int, default=10020)
    parser.add_argument('--duration', type=int, default=0, help='Seconds, or 0 to stay active until the game exits')
    parser.add_argument('--run-name', default=time.strftime('run-%Y%m%d-%H%M%S-vehfix'))
    parser.add_argument('--attach-mode', action='store_true')
    parser.add_argument('--vehicle-audio-test', action='store_true', help='Bundle native drive/audio integration fixture')
    parser.add_argument('--vehicle-audio-observe', action='store_true', help='Trace native engine audio entry points in the main session')
    args = parser.parse_args()
    if not 0 <= args.duration <= 3600:
        parser.error('duration must be 0 or between 1 and 3600 seconds')

    run_dir = HERE / 'captures' / args.run_name
    run_dir.mkdir(parents=True, exist_ok=False)

    server_args = [
        str(PYTHON), '-u', str(HERE / 'server.py'),
        '--run-dir', str(run_dir), '--duration', str(args.duration + 10 if args.duration else 0),
        '--allow-local-bridge', '--application-auth', '--world-login', '--simulation-clock',
        '--experimental-character-fields', str(HERE / 'fixtures/experimental-character-world-fields.bin'),
    ]
    server = subprocess.Popen(server_args, stderr=(run_dir / 'server-stderr.txt').open('wb'))

    ready = run_dir / 'ready.json'
    for _ in range(200):
        if server.poll() is not None:
            print('server exited early', file=sys.stderr)
            return 1
        if ready.exists():
            break
        time.sleep(0.1)
    else:
        print('server startup timed out', file=sys.stderr)
        return 1

    bridge_args = [
        str(PYTHON), '-u', str(HERE / 'instrument_client.py'),
        '--launch', str(GAME_ROOT / 'Europa_Client.exe'),
        '--seconds', str(args.duration), '--output', str(run_dir),
        '--script', str(HERE / 'local_transport_bridge.js'),
        '--native-scene-start-probe', '--character-roaming', '--local-ui',
        '--map-id', str(args.map_id),
    ]
    if args.vehicle_audio_test:
        bridge_args.append('--vehicle-audio-test')
    if args.vehicle_audio_observe:
        bridge_args.append('--vehicle-audio-observe')
    if not args.attach_mode:
        bridge = subprocess.Popen(bridge_args, stderr=(run_dir / 'bridge-stderr.txt').open('wb'))
    else:
        # Injecting while the process is still suspended can collide with the
        # Game++ overlay's hooks and overflow the stack. Start the client first
        # and attach to it instead.
        client = subprocess.Popen(
            [str(GAME_ROOT / 'Europa_Client.exe'), '-garena', '-uid=1', '-server=127.0.0.1:8001'],
            cwd=str(GAME_ROOT))
        tail = ['--script', str(HERE / 'local_transport_bridge.js'),
                '--native-scene-start-probe', '--character-roaming', '--local-ui',
                '--map-id', str(args.map_id), '--seconds', str(args.duration),
                '--output', str(run_dir)]
        if args.vehicle_audio_test:
            tail.append('--vehicle-audio-test')
        if args.vehicle_audio_observe:
            tail.append('--vehicle-audio-observe')
        bridge = subprocess.Popen(
            [str(PYTHON), '-u', str(HERE / 'instrument_client.py'), str(client.pid)] + tail,
            stderr=(run_dir / 'bridge-stderr.txt').open('wb'))
        (run_dir / 'client.pid').write_text(str(client.pid), encoding='ascii')

    client_pid_file = run_dir / 'client.pid'
    for _ in range(1200):
        if bridge.poll() is not None:
            print('instrumentation exited early', file=sys.stderr)
            return 1
        if client_pid_file.exists():
            text = client_pid_file.read_text().strip()
            if text.isdigit() and int(text) > 0:
                break
        time.sleep(0.1)
    else:
        print('client startup timed out', file=sys.stderr)
        return 1

    client_pid = int(client_pid_file.read_text().strip())
    (HERE / 'active-run.json').write_text(json.dumps({
        'Server': server.pid, 'Client': client_pid, 'Bridge': bridge.pid, 'RunDir': str(run_dir),
    }, indent=4), encoding='utf8')
    print(json.dumps({'client': client_pid, 'server': server.pid, 'bridge': bridge.pid, 'run': str(run_dir)}))

    deadline = time.time() + args.duration
    import ctypes
    SYNCHRONIZE = 0x00100000
    kernel32 = ctypes.windll.kernel32
    kernel32.OpenProcess.restype = ctypes.c_void_p
    kernel32.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
    kernel32.TerminateProcess.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
    kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
    # Keep a handle to this exact child, so cleanup cannot target a reused PID.
    handle = kernel32.OpenProcess(SYNCHRONIZE | 0x0001, False, client_pid)
    try:
        while handle and (not args.duration or time.time() < deadline):
            if kernel32.WaitForSingleObject(handle, 500) != 258:
                break
            if bridge.poll() is not None or server.poll() is not None:
                break
    finally:
        # A bridge/server failure must not leave an uninstrumented game running.
        if handle:
            if kernel32.WaitForSingleObject(handle, 0) == 258:
                kernel32.TerminateProcess(handle, 0)
            kernel32.CloseHandle(handle)
        for proc in (bridge, server):
            if proc.poll() is None:
                proc.terminate()
    return 0


if __name__ == '__main__':
    sys.exit(main())
