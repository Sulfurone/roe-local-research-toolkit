import argparse,datetime,json,sys,threading
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vendor'))
import frida
ap=argparse.ArgumentParser();ap.add_argument('pid',type=int,nargs='?');ap.add_argument('--launch',type=Path);ap.add_argument('--script',type=Path);ap.add_argument('--scene-probe',action='store_true');ap.add_argument('--login-diagnostic',action='store_true');ap.add_argument('--map-probe',action='store_true');ap.add_argument('--free-camera-probe',action='store_true');ap.add_argument('--free-base-probe',action='store_true');ap.add_argument('--actor-scene-probe',action='store_true');ap.add_argument('--actor-rebuild-probe',action='store_true');ap.add_argument('--native-scene-start-probe',action='store_true');ap.add_argument('--vehicle-trace',action='store_true');ap.add_argument('--vehicle-audio-test',action='store_true');ap.add_argument('--vehicle-audio-observe',action='store_true');ap.add_argument('--character-roaming',action='store_true');ap.add_argument('--local-menu',action='store_true');ap.add_argument('--local-ui',action='store_true');ap.add_argument('--map-id',type=int,choices=[10020,10021,10024,10019,10016],default=10020);ap.add_argument('--seconds',type=int,default=180);ap.add_argument('--output',type=Path,required=True);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
if (a.pid is None)==(a.launch is None):ap.error('provide a pid or --launch executable')
if not 0<=a.seconds<=3600:ap.error('seconds must be 0 (until game exits) or between 1 and 3600')
if a.launch:
 a.launch=a.launch.resolve();a.pid=frida.spawn([str(a.launch),'-garena','-uid=1','-server=127.0.0.1:8001'],cwd=str(a.launch.parent))
 (a.output/'client.pid').write_text(str(a.pid),encoding='ascii')
log=(a.output/'trace.jsonl').open('a',encoding='utf8',buffering=1);sequence=0
session=None;detached=threading.Event()
def on_message(message,data):
 global sequence
 try:
  row=dict(time=datetime.datetime.now(datetime.timezone.utc).isoformat(),**message)
  if message.get('payload',{}).get('event')=='key_handler_hook_ready':
   (a.output/'bridge-ready.json').write_text(json.dumps(message['payload']),encoding='utf8')
  if data:
   sequence+=1;name=f'payload-{sequence:04d}.bin';(a.output/name).write_bytes(data);row['binary_file']=name;row['binary_length']=len(data)
  log.write(json.dumps(row)+'\n');log.flush()
 except Exception as error:
  print('instrumentation callback failed:',repr(error),file=sys.stderr,flush=True)
try:
 session=frida.attach(a.pid)
 def on_detached(*args):
  log.write(json.dumps(dict(time=datetime.datetime.now(datetime.timezone.utc).isoformat(),event='session_detached',details=[str(x) for x in args]))+'\n');log.flush();detached.set()
 session.on('detached',on_detached)
 source=(a.script or Path(__file__).with_name('network_trace.js')).read_text(encoding='utf8')
 source='globalThis.ROAM_MAP_ID='+str(a.map_id)+';globalThis.LOCAL_MENU_ENABLED='+json.dumps(a.local_menu)+';globalThis.LOCAL_VEHICLE_AUDIO_TEST='+json.dumps(a.vehicle_audio_test)+';globalThis.LOCAL_MENU_OUTBOX='+json.dumps(str((a.output/'menu-command.json').resolve()))+';\n'+source
 if a.scene_probe:source+='\n'+Path(__file__).with_name('scene_probe.js').read_text(encoding='utf8')
 if a.login_diagnostic:source+='\n'+Path(__file__).with_name('login_state_diagnostic.js').read_text(encoding='utf8')
 if a.map_probe:source+='\n'+Path(__file__).with_name('switch_plane_probe.js').read_text(encoding='utf8')
 if a.free_camera_probe:source+='\n'+Path(__file__).with_name('free_camera_probe.js').read_text(encoding='utf8')
 if a.free_base_probe:source+='\n'+Path(__file__).with_name('free_base_probe.js').read_text(encoding='utf8')
 if a.actor_scene_probe:source+='\n'+Path(__file__).with_name('actor_scene_probe.js').read_text(encoding='utf8')
 if a.actor_rebuild_probe:source+='\n'+Path(__file__).with_name('rebuild_actor_probe.js').read_text(encoding='utf8')
 if a.native_scene_start_probe:source+='\n'+Path(__file__).with_name('native_scene_start_probe.js').read_text(encoding='utf8')
 if a.character_roaming:source+='\n'+Path(__file__).with_name('local_audio.js').read_text(encoding='utf-8-sig')+'\n'+Path(__file__).with_name('local_outfit.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_weapons.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_vehicles.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_weather.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_doors.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_interact.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('character_roaming.js').read_text(encoding='utf8')
 if a.character_roaming:source+='\n'+Path(__file__).with_name('local_consumables.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_backpack_catalogue.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_adventure.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_traversal.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_wind_tunnels.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_glider.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_grapple.js').read_text(encoding='utf8')
 if a.vehicle_trace:source+='\n'+Path(__file__).with_name('vehicle_native_trace.js').read_text(encoding='utf8')
 if a.local_menu or a.local_ui:
   source+='\n'+'globalThis.LOCAL_MENU_LUA='+json.dumps(Path(__file__).with_name('local_menu.lua').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_deployment.lua').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_appearance.lua').read_text(encoding='utf8'))+';\n'+Path(__file__).with_name('local_menu.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_map_markers.js').read_text(encoding='utf8')+'\n'+Path(__file__).with_name('local_minimap.js').read_text(encoding='utf8')
 if a.vehicle_audio_test:source+='\n'+Path(__file__).with_name('vehicle_audio_test_fixture.js').read_text(encoding='utf8')
 if a.vehicle_audio_observe:source+='\n'+Path(__file__).with_name('vehicle_audio_observe.js').read_text(encoding='utf8')
 script=session.create_script(source);script.on('message',on_message);script.load()
 if a.launch:frida.resume(a.pid)
 finished=detached.wait(a.seconds or None)
 log.write(json.dumps(dict(time=datetime.datetime.now(datetime.timezone.utc).isoformat(),event='observation_finished',reason='detached' if finished else 'duration_elapsed'))+'\n');log.flush()
finally:
 try:
  if session is not None:session.detach()
 except frida.InvalidOperationError:pass
 if a.launch:
  try:frida.kill(a.pid)
  except (frida.ProcessNotFoundError,frida.InvalidOperationError):pass
 log.close()




