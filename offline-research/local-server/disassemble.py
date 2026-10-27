"""Read-only disassembler for the saved mapped protocol library."""
import argparse,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vendor'))
import capstone
p=argparse.ArgumentParser();p.add_argument('rva',type=lambda x:int(x,0));p.add_argument('size',type=lambda x:int(x,0));p.add_argument('--image',type=Path);p.add_argument('--strings',action='store_true');a=p.parse_args()
b=(a.image or Path(__file__).with_name('protocol-runtime-image.bin')).read_bytes()
md=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_64)
md.detail=a.strings
for i in md.disasm(b[a.rva:a.rva+a.size],a.rva):
 note=''
 if a.strings:
  for op in i.operands:
   if op.type==capstone.CS_OP_MEM and op.mem.base==capstone.x86.X86_REG_RIP:
    target=i.address+i.size+op.mem.disp
    if 0<=target<len(b):
     raw=b[target:target+160].split(bytes([0]))[0]
     if len(raw)>=4 and all(32<=x<127 for x in raw):note+=' ; '+repr(raw.decode('ascii'))
 print(f'{i.address:08x} {i.mnemonic} {i.op_str}{note}')
