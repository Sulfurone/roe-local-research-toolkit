"""Experimental loopback TPDU/authentication service. No playable world yet."""
import argparse,asyncio,datetime,json,secrets,struct,time
from pathlib import Path
from tpdu import Frame,FrameReader,ProtocolError,change_key,challenge,identity
from application import Message,AUTH_REQUEST,auth_response,world_begin,empty_world_login_response,WORLD_LOGIN_REQUEST,account_info_response,heartbeat_response,world_heartbeat_response,empty_policy_sync,experimental_character_login_response
from application import simulation_clock_command,simulation_frame
class Server:
 def __init__(self,out,allow_local_bridge=False,application_auth=False,probe_outbox=False,world_login=False,character_fields=None,simulation_clock=False):
  self.simulation_clock=simulation_clock
  self.world_login=world_login
  self.character_fields=character_fields
  if character_fields is not None:experimental_character_login_response(character_fields)
  self.probe_outbox=probe_outbox
  self.application_auth=application_auth
  out.mkdir(parents=True,exist_ok=True);self.out=out;self.allow_local_bridge=allow_local_bridge;self.log=(out/'events.jsonl').open('a',encoding='utf8',buffering=1);self.seq=0;self.sessions=set();self.writers=set()
 def event(self,event,**fields):self.log.write(json.dumps(dict(time=datetime.datetime.now(datetime.timezone.utc).isoformat(),event=event,**fields))+'\n')
 async def accept(self,reader,writer):
  task=asyncio.current_task();self.sessions.add(task);self.writers.add(writer)
  self.seq+=1;sid=self.seq;parser=FrameReader();nonce=secrets.token_bytes(16);state='await_auth';self.event('connect',session=sid,peer=writer.get_extra_info('peername'))
  inbound=(self.out/f'client-{sid:03d}.bin').open('ab');outbound=(self.out/f'server-{sid:03d}.bin').open('ab')
  async def send(frame):
   packet=frame.pack();outbound.write(packet);outbound.flush();writer.write(packet);await writer.drain();self.event('send',session=sid,command=frame.command,head_len=12+len(frame.extension),body_len=len(frame.body))
  async def probe_watch():
   seen=set()
   while True:
    for path in sorted(self.out.glob(f'session-{sid:03d}-probe-*.bin')):
     if path.name in seen:continue
     seen.add(path.name)
     try:
      if path.stat().st_size>4*1024*1024:raise ProtocolError('oversized probe')
      frame=Frame.unpack(path.read_bytes());await send(frame);self.event('probe_sent',session=sid,file=path.name)
     except (OSError,ProtocolError) as error:self.event('probe_error',session=sid,error=str(error))
    await asyncio.sleep(.1)
  probe_task=asyncio.create_task(probe_watch()) if self.probe_outbox else None
  async def clock_watch():
   started=None
   while True:
    if state=='world_login_replied':
     if started is None:
      started=time.monotonic();await send(Frame(0,body=simulation_clock_command(int(started*1000))))
     await send(Frame(0,body=simulation_frame(1000+int((time.monotonic()-started)*50))))
    await asyncio.sleep(.2)
  clock_task=asyncio.create_task(clock_watch()) if self.simulation_clock else None
  try:
   while data:=await asyncio.wait_for(reader.read(65536),600 if self.probe_outbox else 90):
    inbound.write(data);inbound.flush()
    for frame in parser.feed(data):
     self.event('frame',session=sid,command=frame.command,head_len=12+len(frame.extension),body_len=len(frame.body),state=state,body_hex_preview=frame.body[:128].hex())
     if state=='await_auth' and frame.command==3:
      if len(frame.extension)<12:raise ProtocolError('truncated auth')
      method,service,auth=struct.unpack_from('>III',frame.extension)
      self.event('auth_transport',session=sid,enc_method=method,service_id=service,auth_type=auth)
      if method not in (0,3):raise ProtocolError('unsupported transport encryption method')
      if method!=0 and not self.allow_local_bridge:
       self.event('requires_local_transport_bridge',session=sid);break
      if method!=0:
       for _ in range(400):
        if (self.out/'bridge-ready.json').exists():break
        await asyncio.sleep(.025)
       else:raise ProtocolError('local transport bridge did not become ready')
      await send(change_key(secrets.token_bytes(16)))
      if self.application_auth:state='await_application_auth'
      else:await send(challenge(nonce));state='await_syn_ack'
     elif state=='await_syn_ack' and frame.command==9:
      if frame.extension!=bytes([16])+nonce:raise ProtocolError('challenge echo mismatch')
      self.event('challenge_verified',session=sid);await send(identity(secrets.token_bytes(16)));state='transport_ready'
     elif self.application_auth and frame.command==0:
      message=Message.unpack(frame.body);self.event('game_message',session=sid,command=message.command)
      if state=='await_application_auth' and message.command==AUTH_REQUEST:
       await send(Frame(0,body=auth_response(message)));state='auth_replied';self.event('local_auth_response_sent',session=sid,user_id=1)
       if self.world_login:
        await send(Frame(0,body=world_begin()));state='await_world_login'
      elif self.world_login and state=='await_world_login' and message.command==WORLD_LOGIN_REQUEST:
       response=empty_world_login_response() if self.character_fields is None else experimental_character_login_response(self.character_fields)
       await send(Frame(0,body=response));state='world_login_replied';self.event('local_world_login_response_sent',session=sid,characters=int(self.character_fields is not None))
       await send(Frame(0,body=empty_policy_sync()));self.event('local_empty_policy_sync_sent',session=sid)
      elif self.world_login and message.command==3448:
       await send(Frame(0,body=account_info_response()));self.event('local_account_response_sent',session=sid)
      elif self.world_login and message.command==8030:
       response=simulation_clock_command(int(time.monotonic()*1000)) if self.simulation_clock else heartbeat_response()
       await send(Frame(0,body=response));self.event('heartbeat_acknowledged',session=sid)
      elif self.world_login and message.command==8052:
       await send(Frame(0,body=world_heartbeat_response(message)));self.event('world_heartbeat_acknowledged',session=sid)
      else:self.event('unimplemented_game_message',session=sid,command=message.command)
     else:
      self.event('unimplemented_application_or_control_message',session=sid,command=frame.command)
  except (ProtocolError,TimeoutError,ConnectionError,OSError) as error:self.event('session_error',session=sid,error=str(error) or type(error).__name__,state=state)
  finally:
   if clock_task:
    clock_task.cancel();await asyncio.gather(clock_task,return_exceptions=True)
   if probe_task:
    probe_task.cancel();await asyncio.gather(probe_task,return_exceptions=True)
   inbound.close();outbound.close();writer.close()
   try:await writer.wait_closed()
   except (OSError,ConnectionError):pass
   self.event('disconnect',session=sid,state=state)
   self.sessions.discard(task);self.writers.discard(writer)
 async def close(self):
  for writer in tuple(self.writers):writer.close()
  tasks=tuple(self.sessions)
  for task in tasks:task.cancel()
  if tasks:await asyncio.gather(*tasks,return_exceptions=True)
  if not self.log.closed:self.event('stopped');self.log.close()
 async def run(self,port,duration):
  server=await asyncio.start_server(self.accept,'127.0.0.1',port)
  self.event('listening',host='127.0.0.1',port=port,mode='experimental_transport_handshake')
  (self.out/'ready.json').write_text(json.dumps(dict(port=port,host='127.0.0.1',mode='experimental_transport_handshake')),encoding='utf8')
  try:
   async with server:
    if duration:await asyncio.sleep(duration)
    else:await asyncio.Future()
  finally:server.close();await server.wait_closed();await self.close()
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--run-dir',type=Path,required=True);p.add_argument('--port',type=int,default=8001);p.add_argument('--duration',type=int,default=300);p.add_argument('--allow-local-bridge',action='store_true');p.add_argument('--application-auth',action='store_true');p.add_argument('--probe-outbox',action='store_true');p.add_argument('--world-login',action='store_true');p.add_argument('--experimental-character-fields',type=Path);p.add_argument('--simulation-clock',action='store_true');a=p.parse_args()
 if not 1024<=a.port<=65535:p.error('port must be between 1024 and 65535')
 if not 0<=a.duration<=86400:p.error('duration must be 0 (until stopped) or between 1 and 86400 seconds')
 fields=a.experimental_character_fields.read_bytes() if a.experimental_character_fields else None
 asyncio.run(Server(a.run_dir,a.allow_local_bridge,a.application_auth,a.probe_outbox,a.world_login,fields,a.simulation_clock).run(a.port,a.duration))
if __name__=='__main__':main()



