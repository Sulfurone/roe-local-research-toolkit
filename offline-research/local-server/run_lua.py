"""Execute a saved local Lua diagnostic on this supported client's main thread."""
import argparse, json, sys, threading
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'vendor'))
import frida

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pid',type=int)
    parser.add_argument('source',type=Path)
    parser.add_argument('--frame-rva', type=lambda text:int(text,0), default=0xd4ca40,
                        help='Alternative game-thread callback; avoid sharing the production frame hook')
    args=parser.parse_args()
    source=args.source.read_text(encoding='utf-8-sig')
    source="local ok,err=xpcall(function()\n"+source+"\nend,debug.traceback); local f=io.open('offline-research/local-server/lua-last-result.txt','w'); if f then f:write(ok and 'ok' or tostring(err)); f:close() end"
    finished=threading.Event()
    session=frida.attach(args.pid)
    try:
        script=session.create_script('''
const main=Process.getModuleByName('Europa_Client.exe');
const source=SOURCE;
const text=Memory.allocUtf8String(source),value=Memory.alloc(24);
const size=unescape(encodeURIComponent(source)).length;
value.writePointer(text);value.add(8).writePointer(text.add(size));value.add(16).writePointer(text.add(size+1));
const run=new NativeFunction(main.base.add(0x1003000),'uint8',['pointer','pointer']);let done=false;
Interceptor.attach(main.base.add(FRAME_RVA),{onLeave(){if(done)return;done=true;try{
const system=main.base.add(0x3048d48).readPointer();
send({event:'lua_result',result:run(system.add(0x18),value)});
}catch(e){send({event:'lua_error',error:String(e)});}}});
'''.replace('SOURCE',json.dumps(source)).replace('FRAME_RVA',str(args.frame_rva)))
        def message(msg,data):
            print(json.dumps(msg,ensure_ascii=False),flush=True)
            finished.set()
        script.on('message',message)
        script.load()
        if not finished.wait(15): raise TimeoutError('main-thread Lua execution timed out')
    finally:
        session.detach()
    result=Path(__file__).with_name('lua-last-result.txt')
    if result.exists(): print(result.read_text(encoding='utf8'),flush=True)

if __name__=='__main__': main()
