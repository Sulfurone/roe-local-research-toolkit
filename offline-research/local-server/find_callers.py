"""Find direct call sites of a function in the mapped client image.

Callers of the QSWeapon constructor are the game's own weapon factories, which
is where the correct stItemInfo / mounting order is visible.
"""
import argparse, bisect, struct
from pathlib import Path

IMAGE = Path(__file__).resolve().parents[1] / 'client-runtime-image.bin'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('rva')
    parser.add_argument('--limit', type=int, default=40)
    args = parser.parse_args()
    target = int(args.rva, 0)
    image = IMAGE.read_bytes()
    pe = struct.unpack_from('<I', image, 0x3c)[0]
    directory, size = struct.unpack_from('<II', image, pe + 24 + 112 + 3 * 8)
    functions = [struct.unpack_from('<III', image, off) for off in range(directory, directory + size, 12)]
    starts = [f[0] for f in functions]
    found = 0
    for offset in range(len(image) - 5):
        if image[offset] != 0xE8:
            continue
        relative = struct.unpack_from('<i', image, offset + 1)[0]
        if offset + 5 + relative != target:
            continue
        index = bisect.bisect_right(starts, offset) - 1
        span = functions[index] if index >= 0 and functions[index][0] <= offset < functions[index][1] else None
        owner = f'0x{span[0]:x}..0x{span[1]:x}' if span else 'unknown'
        print(f'call@0x{offset:x} in function {owner}')
        found += 1
        if found >= args.limit:
            break
    print('total', found)


if __name__ == '__main__':
    main()
