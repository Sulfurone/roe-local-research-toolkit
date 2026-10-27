'use strict';
const ws=Process.getModuleByName('ws2_32.dll');
const sockets=new Set();let events=0;
function trace(ctx) { return Thread.backtrace(ctx,Backtracer.FUZZY).filter(a=>a.compare(ptr('0x140000000'))>=0&&a.compare(ptr('0x144000000'))<0).slice(0,16).map(a=>a.toString()); }
function bytes(p,n) { try{return p.readByteArray(Math.min(n,4096));}catch(_){return null;} }
function dest(p) { try{const a=new Uint8Array(p.readByteArray(16));return {family:a[0]|a[1]<<8,port:a[2]<<8|a[3],ip:Array.from(a.slice(4,8)).join('.')};}catch(_){return null;} }
function ours(s){try{let p=Socket.peerAddress(s.toInt32());return p!==null&&p.port===8001&&p.ip==='127.0.0.1';}catch(_){return sockets.has(s.toString());}}
function hook(name,callbacks){let p=ws.findExportByName(name);if(p){Interceptor.attach(p,callbacks);send({event:'hook',name,address:p.toString()});}}
hook('connect',{onEnter(a){let d=dest(a[1]);if(d&&d.ip==='127.0.0.1'&&d.port===8001){sockets.add(a[0].toString());send({event:'connect',socket:a[0].toString(),destination:d,caller:this.returnAddress.toString(),caller_module:(Process.findModuleByAddress(this.returnAddress)||{}).name,stack:trace(this.context)});}}});
hook('send',{onEnter(a){if(!ours(a[0])||events++>=100)return;send({event:'send',socket:a[0].toString(),length:a[2].toInt32(),caller:this.returnAddress.toString(),caller_module:(Process.findModuleByAddress(this.returnAddress)||{}).name,stack:trace(this.context)},bytes(a[1],a[2].toInt32()));}});
hook('WSASend',{onEnter(a){if(!ours(a[0])||events++>=100)return;let count=Math.min(a[2].toUInt32(),8);for(let i=0;i<count;i++){let b=a[1].add(i*16);let n=b.readU32();let p=b.add(8).readPointer();send({event:'WSASend',socket:a[0].toString(),length:n,caller:this.returnAddress.toString(),caller_module:(Process.findModuleByAddress(this.returnAddress)||{}).name,stack:trace(this.context)},bytes(p,n));}}});
hook('recv',{onEnter(a){this.p=a[1];this.sock=a[0];this.capture=ours(a[0]);},onLeave(r){let n=r.toInt32();if(n>0&&this.capture)send({event:'recv',socket:this.sock.toString(),length:n,caller:this.returnAddress.toString(),caller_module:(Process.findModuleByAddress(this.returnAddress)||{}).name,stack:trace(this.context)},bytes(this.p,n));}});
send({event:'ready',pid:Process.id,game:Process.enumerateModules().filter(m=>/Europa_Client/.test(m.name)).map(m=>({name:m.name,base:m.base.toString()}))});

