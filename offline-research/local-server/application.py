"""Small, recovered subset of the game protocol; no world/actor emulation."""
from dataclasses import dataclass
import struct,time
from tpdu import ProtocolError

HEADER_SIZE = 26
AUTH_REQUEST = 752
AUTH_RESPONSE = 753
WORLD_LOGIN_REQUEST = 740
WORLD_LOGIN_RESPONSE = 751

def world_begin(user_id=1, version=136):
    # 0xBDD270 / 0xD74810: uint64 login identity, uint32 version field.
    return server_message(754, struct.pack('>QI', user_id, version))

def empty_world_login_response(user_id=1, version=136, timestamp=None):
    # 0xBDC800: no character records, followed by two int32, two bytes, two int32.
    timestamp=int(time.time()) if timestamp is None else timestamp
    return server_message(WORLD_LOGIN_RESPONSE,struct.pack('>IQIIIIBBII',0,user_id,version,0,timestamp,0,0,0,0,0))

def experimental_character_login_response(fields,timestamp=None):
    # Fixture from this build's native encoder/decoder round trip. Model and
    # equipment remain incomplete; this supports research, not playable actors.
    fields=bytearray(fields)
    if len(fields)!=1240 or struct.unpack_from('>IQII',fields)!=(0,1,136,1):
        raise ProtocolError('unsupported experimental character fields')
    if fields[20:28]!=struct.pack('>Q',1) or b'LocalPlayer\0' not in fields:
        raise ProtocolError('expected local experimental character')
    timestamp=int(time.time()) if timestamp is None else timestamp
    struct.pack_into('>I',fields,len(fields)-18,timestamp)
    return server_message(WORLD_LOGIN_RESPONSE,fields)

def empty_policy_sync():
    # Registered command 0x72D9 at 0x1126374. Native codec C449A0:
    # int32 count (0..100), followed by that many int32 policy identifiers.
    # Empty local policy list triggers EVENT_TERM_POLICY_END via 0x1126920.
    return server_message(29401,struct.pack('>I',0))

def account_info_response(user_id=1):
    # 0xC471A0 / 0xBD3540: result + packed 0x3E-byte account structure + int32.
    fields=bytearray(70)
    struct.pack_into('>Q',fields,4,user_id)
    struct.pack_into('>Q',fields,44,user_id)
    return server_message(3449,fields)

def heartbeat_response():
    # 0xBD5CF0 encodes six uint32. Handler 0xD6B4C0 ignores payload and
    # acknowledges receipt through 0xCD7D70, updating its last-received tick.
    return server_message(8031,bytes(24))

def simulation_clock_command(timestamp):
    # BB00xx handles SYSTEM_MSGID_TIME_SYN_CMD before the application callback.
    return server_message(8031,struct.pack('>6I',1,0,0,50,timestamp&0xffffffff,1))

def simulation_frame(frame):
    # BD4070: frame number, reserved, milliseconds per frame, reserved.
    return server_message(8023,struct.pack('>4I',frame,0,20,0))

def world_heartbeat_response(request):
    # C636B0 serializes 8052 and 8053 as one uint32. D4AB60 sends an
    # incrementing request counter; D65E80 emits EVENT_WORLD_HEARTBEAT_RSP.
    if request.command != 8052 or len(request.body) != 8:
        raise ProtocolError('invalid world heartbeat request')
    return server_message(8053,request.body[4:8])

@dataclass(frozen=True)
class Message:
    sequence: int
    header: bytes
    body: bytes

    @property
    def command(self):
        return struct.unpack_from('>H', self.header, 4)[0]

    @classmethod
    def unpack(cls, data):
        if len(data) < 4 + HEADER_SIZE + 4:
            raise ProtocolError('truncated game message')
        sequence, size = struct.unpack_from('>II', data)
        if size != len(data) - 4:
            raise ProtocolError('unsupported game message length')
        header = data[4:4 + HEADER_SIZE]
        body = data[4 + HEADER_SIZE:]
        if struct.unpack_from('>I', body)[0] != struct.unpack_from('>H', header, 4)[0]:
            raise ProtocolError('game header/union command mismatch')
        return cls(sequence, header, body)

def server_message(command, fields, tick=0):
    # Receiver RVA 0xBB1770: uint32 tick, int16 command, discriminated union.
    # The 26-byte routing header and transport sequence are client -> server only.
    return struct.pack('>IHI', tick, command, command) + fields

def auth_response(request, user_id=1):
    if request.command != AUTH_REQUEST:
        raise ProtocolError('expected USER_AUTHEN_REQ')
    if len(request.body) < 29:
        raise ProtocolError('truncated USER_AUTHEN_REQ fields')
    token_size = struct.unpack_from('>I', request.body, 21)[0]
    if token_size > 1024 or len(request.body) != 29 + token_size:
        raise ProtocolError('invalid USER_AUTHEN_REQ token length')
    # Serializer RVA 0xBDD0E0: int32, uint64, int32 (version >= 80).
    # The final field's meaning is unconfirmed. Echoing the client version is
    # experimental; its exact semantics remain unconfirmed.
    client_version = struct.unpack_from('>I', request.body, 4)[0]
    return server_message(AUTH_RESPONSE, struct.pack('>IQI', 0, user_id, client_version))
