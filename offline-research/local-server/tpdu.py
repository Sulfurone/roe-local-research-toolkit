"""TPDU transport recovered from this client's ProtocalHandler_x64.dll metadata."""
from dataclasses import dataclass
import struct
BASE=struct.Struct('>BBBBII')
MAGIC=0x55
VERSION=14
MAX_FRAME=4*1024*1024
class ProtocolError(ValueError):pass
@dataclass(frozen=True)
class Frame:
 command:int
 extension:bytes=b''
 body:bytes=b''
 encrypted_header_length:int=0
 version:int=VERSION
 def pack(self):
  return BASE.pack(MAGIC,self.version,self.command,self.encrypted_header_length,BASE.size+len(self.extension),len(self.body))+self.extension+self.body
 @classmethod
 def unpack(cls,data):
  if len(data)<BASE.size:raise ProtocolError('truncated base')
  magic,version,command,enc,head,body=BASE.unpack_from(data)
  if magic!=MAGIC or version!=VERSION:raise ProtocolError('unsupported TPDU magic/version')
  if head<BASE.size or head+body>MAX_FRAME:raise ProtocolError('invalid lengths')
  if len(data)!=head+body:raise ProtocolError('frame length mismatch')
  return cls(command,data[BASE.size:head],data[head:],enc,version)
class FrameReader:
 def __init__(self):self.buffer=bytearray()
 def feed(self,data):
  self.buffer.extend(data);frames=[]
  while len(self.buffer)>=BASE.size:
   magic,version,command,enc,head,body=BASE.unpack_from(self.buffer)
   if magic!=MAGIC or version!=VERSION:raise ProtocolError('unsupported TPDU magic/version')
   if head<BASE.size or head+body>MAX_FRAME:raise ProtocolError('invalid lengths')
   size=head+body
   if len(self.buffer)<size:break
   frames.append(Frame.unpack(bytes(self.buffer[:size])));del self.buffer[:size]
  return frames

def change_key(key):
 if len(key)!=16:raise ValueError('session key must be 16 bytes')
 return Frame(1,struct.pack('>HH',0,16)+key)
def challenge(nonce):
 if len(nonce)!=16:raise ValueError('challenge must be 16 bytes')
 return Frame(8,bytes([16])+nonce)
def identity(identifier):
 if len(identifier)!=16:raise ValueError('identifier must be 16 bytes')
 payload=struct.pack('>I',1)+identifier
 return Frame(4,struct.pack('>HH',0,len(payload))+payload)
