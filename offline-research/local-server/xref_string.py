"""Find absolute pointers to a string literal in the mapped client image.

Useful for SWIG method tables and static name tables that store the address of
a literal rather than referencing it with a RIP-relative instruction.
"""
import argparse, struct, sys
from pathlib import Path

IMAGE = Path(__file__).resolve().parents[1] / 'client-runtime-image.bin'
BASE = 0x140000000


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('text')
    parser.add_argument('--context', type=int, default=3, help='qwords either side')
    args = parser.parse_args()
    image = IMAGE.read_bytes()
    needle = args.text.encode() + b'\0'
    positions = []
    start = 0
    while True:
        offset = image.find(needle, start)
        if offset < 0:
            break
        positions.append(offset)
        start = offset + 1
    if not positions:
        print('string not found')
        return
    for string_rva in positions:
        print(f'--- literal 0x{string_rva:x} ---')
        packed = struct.pack('<Q', BASE + string_rva)
        found = False
        start = 0
        while True:
            ref = image.find(packed, start)
            if ref < 0:
                break
            found = True
            start = ref + 1
            lo = max(0, ref - args.context * 8)
            hi = min(len(image), ref + (args.context + 1) * 8)
            cells = []
            for off in range(lo, hi, 8):
                value = struct.unpack_from('<Q', image, off)[0]
                mark = '<<<' if off == ref else ''
                cells.append(f'{off:#x}:{value:#x}{mark}')
            print('  ref@%#x  %s' % (ref, '  '.join(cells)))
        if not found:
            print('  no pointer references')


if __name__ == '__main__':
    main()
