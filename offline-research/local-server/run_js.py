"""Run a saved Frida script against a live client and print its messages."""
import argparse, json, sys, threading, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'vendor'))
import frida


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pid', type=int)
    parser.add_argument('script', type=Path)
    parser.add_argument('--wait', type=float, default=8.0, help='Seconds, or 0 until the target exits')
    parser.add_argument('--output', type=Path, help='Optional JSONL message capture')
    parser.add_argument('--stop-file', type=Path, help='Detach normally when this file appears')
    args = parser.parse_args()
    source = args.script.read_text(encoding='utf-8-sig')
    session = frida.attach(args.pid)
    detached = threading.Event()
    session.on('detached', lambda *args: detached.set())
    try:
        script = session.create_script(source)

        def on_message(message, data):
            print(json.dumps(message, ensure_ascii=False), flush=True)
            if args.output:
                with args.output.open('a', encoding='utf8') as capture:
                    capture.write(json.dumps(message, ensure_ascii=False) + '\n')

        script.on('message', on_message)
        script.load()
        # Keep the script attached for the whole window: a hook that only lives
        # for the first message would miss later events.
        deadline = time.time() + args.wait
        while not detached.is_set() and (args.wait == 0 or time.time() < deadline):
            if args.stop_file and args.stop_file.exists():
                break
            detached.wait(0.2)
    finally:
        if not detached.is_set():
            session.detach()


if __name__ == '__main__':
    main()
