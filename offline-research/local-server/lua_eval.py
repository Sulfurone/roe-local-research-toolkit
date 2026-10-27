"""Evaluate Lua inside the running client and print the result."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'vendor'))
import frida


def main():
    active = json.loads((HERE / 'active-run.json').read_text(encoding='utf-8-sig'))
    session = frida.attach(active['Client'])
    script = session.create_script((HERE / 'lua_eval.js').read_text(encoding='utf-8'))
    script.on('message', lambda m, d: None)
    script.load()
    api = script.exports_sync
    try:
        if len(sys.argv) > 1 and sys.argv[1] == '--file':
            print(api.file(str(Path(sys.argv[2]).resolve())))
        else:
            print(api.lua(sys.argv[1]))
    finally:
        session.detach()


if __name__ == '__main__':
    main()
