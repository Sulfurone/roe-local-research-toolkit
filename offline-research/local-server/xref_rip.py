"""Find RIP-relative LEA/MOV references to a target RVA in the client image.

xref_string.py only finds absolute pointers, which misses `lea reg,[rip+disp]`.
This scans the handful of 3-byte prefixes that encode a RIP-relative operand.
"""
import argparse, struct
from pathlib import Path

IMAGE = Path(__file__).resolve().parents[1] / 'client-runtime-image.bin'

# REX(+optional) + opcode + modrm with mod=00 rm=101 -> RIP relative
PREFIXES = [
    (bytes([0x48, 0x8d, 0x05]), 'lea rax'),
    (bytes([0x48, 0x8d, 0x0d]), 'lea rcx'),
    (bytes([0x48, 0x8d, 0x15]), 'lea rdx'),
    (bytes([0x48, 0x8d, 0x1d]), 'lea rbx'),
    (bytes([0x48, 0x8d, 0x25]), 'lea rsp'),
    (bytes([0x48, 0x8d, 0x2d]), 'lea rbp'),
    (bytes([0x48, 0x8d, 0x35]), 'lea rsi'),
    (bytes([0x48, 0x8d, 0x3d]), 'lea rdi'),
    (bytes([0x4c, 0x8d, 0x05]), 'lea r8'),
    (bytes([0x4c, 0x8d, 0x0d]), 'lea r9'),
    (bytes([0x4c, 0x8d, 0x15]), 'lea r10'),
    (bytes([0x4c, 0x8d, 0x1d]), 'lea r11'),
    (bytes([0x4c, 0x8d, 0x25]), 'lea r12'),
    (bytes([0x4c, 0x8d, 0x2d]), 'lea r13'),
    (bytes([0x4c, 0x8d, 0x35]), 'lea r14'),
    (bytes([0x4c, 0x8d, 0x3d]), 'lea r15'),
    (bytes([0x48, 0x8b, 0x05]), 'mov rax'),
    (bytes([0x48, 0x8b, 0x0d]), 'mov rcx'),
    (bytes([0x48, 0x8b, 0x15]), 'mov rdx'),
    (bytes([0x4c, 0x8b, 0x05]), 'mov r8'),
    (bytes([0x4c, 0x8b, 0x0d]), 'mov r9'),
]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('rva', type=lambda x: int(x, 0))
    ap.add_argument('--before', type=int, default=40, help='bytes of preceding code to disassemble')
    args = ap.parse_args()
    img = IMAGE.read_bytes()
    hits = []
    for prefix, label in PREFIXES:
        start = 0
        while True:
            p = img.find(prefix, start)
            if p < 0:
                break
            start = p + 1
            disp = struct.unpack_from('<i', img, p + 3)[0]
            target = p + 7 + disp
            if target == args.rva:
                hits.append((p, label))
    if not hits:
        print('no rip-relative reference')
        return
    for p, label in hits:
        print(f'ref @ 0x{p:x}  {label} -> 0x{args.rva:x}')
        lo = max(0, p - args.before)
        print(f'  context bytes: {img[lo:p + 7].hex()}')
        # print surrounding bytes as hex dump lines
        for off in range(lo, p + 7, 16):
            chunk = img[off:off + 16]
            print(f'   {off:08x}  {chunk.hex(" ")}')


if __name__ == '__main__':
    main()
