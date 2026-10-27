import sys,re,struct
from pathlib import Path
sys.path.insert(0,'../vendor')
import capstone
b=Path('../client-runtime-image.bin').read_bytes();md=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_64)
for spec in sys.argv[1:]:
 a,n=(int(v,0) for v in spec.split(':'));print('RANGE',hex(a),hex(a+n))
 for i in md.disasm(b[a:a+n],a):
  t=i.mnemonic+' '+i.op_str;m=re.search(r'\[rip ([+-]) (0x[0-9a-f]+)\]',t)
  if m:
   p=i.address+i.size+int(m[2],16)*(1 if m[1]=='+' else -1);t+=' ; '+hex(p)
   if 0<p<len(b):
    s=b[p:p+100].split(b'\0')[0]
    if s and all(32<=c<127 for c in s):t+=' '+s.decode()
  print(hex(i.address),t)
