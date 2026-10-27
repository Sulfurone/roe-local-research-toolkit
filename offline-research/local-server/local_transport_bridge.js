'use strict';
// This agent is used only with the launcher's explicit -server=127.0.0.1:8001.
// Select the protocol library's supported clear transport for this local session.
// It does not alter the executable, anti-cheat, OS settings, or remote account state.
let installed=false,localHandle=null;
function install(m){
 if(installed||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 try{
  const code=Array.from(new Uint8Array(m.base.add(0x2d90).readByteArray(8)));
  if(code.join(',')!=='64,83,86,65,84,184,144,16')throw Error('unsupported protocol handler build');
  Interceptor.attach(m.base.add(0x2100),{
   onEnter(args){
    const h=args[0];
    this.local=false;
    try{
     if(localHandle===null||!h.equals(localHandle))return;
     const old=args[2].toInt32();if(old!==0&&old!==3)throw Error('unexpected session method');
     args[2]=ptr(0);this.local=true;
     send({event:'local_clear_transport_selected',old_method:old});
    }catch(e){send({event:'initialization_validation_failed',error:String(e)});}
   },
   onLeave(result){if(this.local&&result.toInt32()===0){localHandle.add(0x7c).writeU32(0);send({event:'clear_send_buffer_selected'});}}
  });
  Interceptor.attach(m.base.add(0x2d90),{
   onEnter(args){
    this.changed=false;const h=args[0],header=args[1];
    try{
     if(header.readU8()!==0x55||header.add(1).readU8()!==14||header.add(2).readU8()!==1)throw Error('unexpected key frame');
     if(!h.add(24).readPointer().equals(m.base.add(0x11d620))||!h.add(32).readPointer().equals(m.base.add(0x11e200)))throw Error('unexpected QQ transport object');
     const peer=Socket.peerAddress(h.readS32());if(peer===null||peer.ip!=='127.0.0.1'||peer.port!==8001)throw Error('key frame does not belong to the loopback test');
     const method=h.add(0xb4).readU32();if(method!==3&&method!==0)throw Error('unexpected transport encryption method');
     h.add(0xb4).writeU32(0);this.changed=true;localHandle=h;
     send({event:'local_transport_bridge_applied',old_method:method,new_method:0,scope:'launcher_loopback_session',caller:this.returnAddress.sub(m.base).toString()});
    }catch(e){send({event:'bridge_validation_failed',error:String(e)});}
   },
   onLeave(result){if(this.changed)send({event:'local_key_handler_returned',result:result.toInt32()});}
  });
  Interceptor.attach(m.base.add(0x1d90),{
   onEnter(args){
    if(localHandle===null||!args[0].equals(localHandle))return;
    const size=args[2].toInt32();if(size<0||size>65536)return;
    send({event:'transport_send_input',method:localHandle.add(0xb4).readU32(),size:size,stack:Thread.backtrace(this.context,Backtracer.ACCURATE).slice(0,14).map(p=>{const module=Process.findModuleByAddress(p);return module?module.name+'+'+p.sub(module.base):p.toString();})},args[1].readByteArray(size));
   }
  });
  Interceptor.attach(m.base.add(0x2f40),{
   onEnter(args){this.local=localHandle!==null&&args[0].equals(localHandle);if(this.local)send({event:'syn_received',method:localHandle.add(0xb4).readU32()});},
   onLeave(result){if(this.local)send({event:'syn_handler_returned',result:result.toInt32()});}
  });
  const main=Process.getModuleByName('Europa_Client.exe');
  const authHandlers=new Set();
  Interceptor.attach(main.base.add(0xbafbd0),{onEnter(args){
   if(args[1].toInt32()!==753)return;
   try{
    const manager=args[0];let handler=null,owner=null;
    const candidates=[];
    for(const id of [710,711,740,751,754,760,771,811,3449,8031,8053]){
     const count=manager.add(0x50).readU32();if(count===0||count>65536)continue;
     const buckets=manager.add(0x48).readPointer(),sentinel=buckets.add(count*8).readPointer();
     let node=buckets.add((id%count)*8).readPointer();
     for(let n=0;n<64&&!node.isNull()&&!node.equals(sentinel);n++,node=node.add(0x10).readPointer()){
      if(node.readU32()!==id)continue;
      const fn=node.add(8).readPointer(),mod=Process.findModuleByAddress(fn);
      candidates.push({command:id,target:fn.toString(),module:mod?mod.name:null,rva:mod?fn.sub(mod.base).toString():null});break;
     }
    }
    send({event:'login_handler_candidates',handlers:candidates});
    for(const spec of [{table:0x98,count:0xa0,next:0x20,fn:0x18,owner:0x10},{table:0x48,count:0x50,next:0x10,fn:8}]){
     const count=manager.add(spec.count).readU32();if(count===0||count>65536)continue;
     const buckets=manager.add(spec.table).readPointer(),sentinel=buckets.add(count*8).readPointer();
     let node=buckets.add((753%count)*8).readPointer();
     for(let n=0;n<64&&!node.isNull()&&!node.equals(sentinel);n++,node=node.add(spec.next).readPointer()){
      if(node.readU32()!==753)continue;
      handler=node.add(spec.fn).readPointer();if(spec.owner!==undefined)owner=node.add(spec.owner).readPointer();break;
     }
     if(handler!==null)break;
    }
    if(handler===null){send({event:'auth_handler_missing',manager:manager.toString()});return;}
    const targetModule=Process.findModuleByAddress(handler);
    send({event:'auth_handler_resolved',target:handler.toString(),module:targetModule?targetModule.name:null,rva:targetModule?handler.sub(targetModule.base).toString():null,owner:owner?owner.toString():null});
    if(!authHandlers.has(handler.toString())){
     authHandlers.add(handler.toString());
     Interceptor.attach(handler,{onEnter(a){send({event:'auth_handler_enter',arg0:a[0].toString(),arg1:a[1].toString(),arg2:a[2].toString()});},onLeave(r){send({event:'auth_handler_leave',result:r.toString()});}});
    }
   }catch(error){send({event:'auth_dispatch_diagnostic_error',error:String(error)});}
  }});
  Interceptor.attach(main.base.add(0xbb1770),{
   onEnter(args){this.output=args[1];send({event:'game_receive_parser_enter',stack:Thread.backtrace(this.context,Backtracer.ACCURATE).slice(0,16).map(p=>{const module=Process.findModuleByAddress(p);return module?module.name+'+'+p.sub(module.base):p.toString();})});},
   onLeave(result){send({event:'game_receive_parser_return',result:result.toInt32()},this.output.readByteArray(32));}
  });
  Interceptor.attach(main.base.add(0xcaa870),{
   onEnter(args){this.output=args[0];this.command=args[1].toInt32();},
   onLeave(result){send({event:'game_body_decoded',command:this.command,result:result.toInt32()},this.output.readByteArray(24));}
  });
  Interceptor.attach(main.base.add(0xd68540),{
   onEnter(args){send({event:'auth_result_callback',result:args[0].add(4).readS32()},args[0].readByteArray(24));}
  });
  installed=true;send({event:'key_handler_hook_ready',module_base:m.base.toString()});
 }catch(e){send({event:'bridge_install_failed',error:String(e)});}
}
const observer=Process.attachModuleObserver({onAdded:install});
send({event:'bridge_waiting_for_protocol_module',pid:Process.id});

