'use strict';
// Feed the shipped start-point movie with real GFx Point objects. Lua tables
// cannot be assigned to its strongly typed worldPosition:flash.geom.Point.
function installLocalMapMarkers(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const localId=new NativeFunction(b.add(0xf62570),'uint64',[]);
 const startRecord=new NativeFunction(b.add(0xe96d30),'pointer',['pointer','pointer']);
 const member=new NativeFunction(b.add(0x30cb40),'uint8',['pointer','pointer','pointer','pointer','uint8']);
 const setMember=new NativeFunction(b.add(0x30d050),'uint8',['pointer','pointer','pointer','pointer']);
 const setElement=new NativeFunction(b.add(0x30e3a0),'void',['pointer','pointer','uint','pointer']);
 const invoke=new NativeFunction(b.add(0xcc9240),'uint8',['pointer','pointer','pointer','pointer','int']);
 const release=new NativeFunction(b.add(0x20a5a0),'void',['pointer']);
 const strings=new Map(),enemyIds=new Map();let serial=1000,next=0,wasVisible=false,selected=null,lastSignature='',lastStatus=null,lastError='',generation=null;
 function text(s){if(!strings.has(s))strings.set(s,Memory.allocUtf8String(s));return strings.get(s);}
 function panel(){
  const manager=b.add(0x30411c8).readPointer();if(manager.isNull())return null;
  const sentinel=manager.add(0x28);let node=sentinel.readPointer();
  for(let i=0;i<1000&&!node.equals(sentinel);i++,node=node.readPointer()){
   const p=node.add(16).readPointer();if(!p.isNull()&&p.add(0x18).readPointer().readCString()==='EuUIStartPointPanel0')return p;
  }
  return null;
 }
 function valueOf(wrapper){const alias=wrapper.add(16).readPointer();return alias.isNull()?wrapper.readPointer():alias;}
 function arena(p){
  const values=[];
  function value(){const v=Memory.alloc(32);v.writeByteArray(new Uint8Array(32));values.push(v);return v;}
  function maybeGet(object,name){const out=value();return member(object.readPointer(),object.add(16).readPointer(),text(name),out,0)?out:null;}
  function get(object,name){const out=maybeGet(object,name);if(!out)throw Error('Missing map member '+name);return out;}
  function number(n){const v=value();v.add(8).writeU32(5);v.add(16).writeDouble(n);return v;}
  function boolean(n){const v=value();v.add(8).writeU32(2);v.add(16).writeU8(n?1:0);return v;}
  function string(s){const v=value();v.add(8).writeU32(6);v.add(16).writePointer(text(s));return v;}
  function scalar(v){const t=v.add(8).readU32()&31;if(t===2)return v.add(16).readU8()!==0;if(t===3)return v.add(16).readS32();if(t===4)return v.add(16).readU32();if(t===5)return v.add(16).readDouble();throw Error('Unexpected map scalar '+t);}
  function set(object,name,v){if(!setMember(object.readPointer(),object.add(16).readPointer(),text(name),v))throw Error('Cannot set map member '+name);}
  const movie=p.add(0x158).readPointer().add(0x10).readPointer().add(0x18).readPointer();
  const create=new NativeFunction(movie.readPointer().add(0x170).readPointer(),'uint8',['pointer','pointer','pointer','pointer','uint']);
  const createArray=new NativeFunction(movie.readPointer().add(0x178).readPointer(),'void',['pointer','pointer']);
  function object(name,args=[]){
   const out=value(),data=Memory.alloc(Math.max(32,args.length*32));data.writeByteArray(new Uint8Array(Math.max(32,args.length*32)));
   args.forEach((v,i)=>data.add(i*32).writeByteArray(v.readByteArray(32)));
   if(!create(movie,out,name?text(name):NULL,args.length?data:NULL,args.length))throw Error('Cannot create '+(name||'Object'));
   return out;
  }
  function callOn(root,name,args,output=false){
   const wrappers=Memory.alloc(Math.max(24,args.length*24));wrappers.writeByteArray(new Uint8Array(Math.max(24,args.length*24)));
   args.forEach((v,i)=>wrappers.add(i*24).writePointer(v));
   const rootWrap=Memory.alloc(24),outWrap=Memory.alloc(24),result=output?value():NULL;
   rootWrap.writeByteArray(new Uint8Array(24));rootWrap.writePointer(root);outWrap.writeByteArray(new Uint8Array(24));if(output)outWrap.writePointer(result);
   if(!invoke(rootWrap,text(name),output?outWrap:NULL,wrappers,args.length))throw Error('Map method failed: '+name);
   return result;
  }
  function call(name,args){return callOn(valueOf(p.add(0x168)),name,args);}
  return {value,get,maybeGet,number,boolean,string,scalar,set,object,call,callOn,point(x,y){return object('flash.geom.Point',[number(x),number(y)]);},array(){const v=value();createArray(movie,v);return v;},
   append(array,index,v){setElement(array.readPointer(),array.add(16).readPointer(),index,v);},
   close(){for(let i=values.length-1;i>=0;i--){const v=values[i];if(v.add(8).readU32()&64)release(v);v.add(8).writeU32(0);}}
  };
 }
 function mapElements(a,root){
  // teamStartPoints and obTeamIcons are private AS3 fields. Inspect authored
  // display children through the engine's public invocation wrapper instead.
  const container=a.get(a.get(root,'mapAnchor'),'mapContainer'),queue=[{object:container,depth:0}],out=[];let visited=0;
  while(queue.length&&visited++<500){
   const {object,depth}=queue.shift(),self=a.maybeGet(object,'animSelfMarkingCircle1'),enemy=a.maybeGet(object,'observeBgMc');
   if(self||enemy){out.push({object,self,enemy});continue;}
   if(depth>=3)continue;
   const count=a.maybeGet(object,'numChildren');if(!count)continue;
   for(let i=0;i<Math.min(128,a.scalar(count));i++){const child=a.callOn(object,'getChildAt',[a.number(i)],true);if([8,9,10].includes(child.add(8).readU32()&31))queue.push({object:child,depth:depth+1});}
  }
  return out;
 }
 function enemies(p){
  // Authored spawn-selection records supplied by the native game, never invented
  // targets. The current solo world normally has none other than the player.
  const mgr=b.add(0x3040958).readPointer();if(mgr.isNull())return [];
  const own=localId().toString(),stack=[mgr.add(0xe8).readPointer()],seen=new Set(),out=[];
  const mode=p.add(0x38c).readS32(),cell=p.add(0x3d0).readS32();
  while(stack.length&&seen.size<2048&&out.length<128){
   const node=stack.pop();if(node.isNull()||seen.has(node.toString()))continue;seen.add(node.toString());
   stack.push(node.readPointer(),node.add(8).readPointer());
   const id=node.add(0x20).readU64();if(id.toString()===own||id.toString()==='0')continue;
   const key=Memory.alloc(8);key.writeU64(id);const rec=startRecord(mgr.add(0xd0),key);if(rec.isNull())continue;
   let x=rec.readS32(),y=rec.add(4).readS32();
   if(mode===2||mode===3){if(cell<=0)continue;x=x*cell+p.add(0x1ec).readS32()+Math.trunc(cell/2);y=y*cell+p.add(0x1f8).readS32()+Math.trunc(cell/2);}
   if(x>0&&y>0&&x<2000000&&y<2000000)out.push({id:id.toString(),x,y});
  }
  return out;
 }
 function render(p,position,others){
  const a=arena(p);try{
   const root=valueOf(p.add(0x168));
   if(!a.scalar(a.get(root,'visible')))return false;
   const labels=a.get(a.get(a.get(root,'mapTotallLegend'),'animMapTotallLegend'),'teammateInfoPanel');
   if(!a.scalar(a.get(a.get(labels,'teammateInfo1'),'visible')))return false;
   const rows=a.array(),self=a.object(null),point=a.point(position.x,position.y);
   a.set(self,'teamSlot',a.number(0));a.set(self,'groupKey',a.number(0));a.set(self,'isSelf',a.boolean(true));a.set(self,'worldPosition',point);a.append(rows,0,self);
   a.call('Cpp2As_UpdateStartPoints',[rows]);
   const active=new Set();
   for(const enemy of others){
    if(!enemyIds.has(enemy.id))enemyIds.set(enemy.id,++serial);
    const id=enemyIds.get(enemy.id);active.add(enemy.id);const location=a.point(enemy.x,enemy.y);
    a.call('Cpp2As_SetObTeamNumber',[a.number(id),location,a.number(1),a.number(0),a.number(197),a.number(247)]);
   }
   const elements=mapElements(a,root),own=elements.find(e=>e.self&&a.scalar(a.get(e.object,'visible'))&&a.scalar(a.get(e.self,'visible')));
   if(!own)throw Error('Self start-point display was not created');
   const mark=own.object,tint=a.object('flash.geom.ColorTransform',[0,0,0,1,255,209,27,0].map(a.number));
   a.set(a.get(mark,'transform'),'colorTransform',tint);
   const enemyMarkers=[];
   for(const e of elements.filter(e=>e.enemy)){
    const icon=e.object,world=a.get(icon,'worldPosition'),x=a.scalar(a.get(world,'x')),y=a.scalar(a.get(world,'y'));
    const nameValue=a.get(icon,'name');let namePointer=nameValue.add(16).readPointer();if(nameValue.add(8).readU32()&64)namePointer=namePointer.readPointer();const name=namePointer.readCString();
    let match=others.find(row=>'LocalRoamEnemy'+enemyIds.get(row.id)===name);
    if(!match)match=others.find(row=>Math.abs(row.x-x)<1&&Math.abs(row.y-y)<1);
    if(match){a.set(icon,'name',a.string('LocalRoamEnemy'+enemyIds.get(match.id)));a.set(icon,'worldPosition',a.point(match.x,match.y));a.set(a.get(icon,'observeCellText'),'visible',a.boolean(false));a.set(icon,'visible',a.boolean(true));
     const loc=a.get(icon,'worldPosition'),color=a.get(a.get(e.enemy,'transform'),'colorTransform');enemyMarkers.push({id:match.id,x:a.scalar(a.get(loc,'x')),y:a.scalar(a.get(loc,'y')),visible:a.scalar(a.get(icon,'visible')),color:[a.scalar(a.get(color,'redOffset')),a.scalar(a.get(color,'greenOffset')),a.scalar(a.get(color,'blueOffset'))]});
    }
    else if(name.startsWith('LocalRoamEnemy'))a.set(icon,'visible',a.boolean(false));
   }
   for(const key of enemyIds.keys())if(!active.has(key))enemyIds.delete(key);
   const world=a.get(mark,'worldPosition'),transform=a.get(a.get(mark,'transform'),'colorTransform');
   lastStatus={position:{x:a.scalar(a.get(world,'x')),y:a.scalar(a.get(world,'y'))},visible:a.scalar(a.get(mark,'visible')),
    selfCircle:a.scalar(a.get(a.get(mark,'animSelfMarkingCircle1'),'visible')),color:[a.scalar(a.get(transform,'redOffset')),a.scalar(a.get(transform,'greenOffset')),a.scalar(a.get(transform,'blueOffset'))],enemies:others.length,enemyMarkers};
   send({event:'local_map_markers_updated',...lastStatus});return true;
  }finally{a.close();}
 }
 Interceptor.attach(b.add(0x1268890),{onEnter(args){try{
  const array=args[2].readPointer(),end=args[2].add(8).readPointer();if(end.sub(array).toInt32()!==72)return;
  const at=i=>{const item=array.add(24*i),v=item.add(16).readPointer();return v.isNull()?item.readPointer():v;};
  const command=at(0);let name=command.add(16).readPointer();if(command.add(8).readU32()&64)name=name.readPointer();if(name.readCString()!=='SET_START_POINT')return;
  const n=v=>{const t=v.add(8).readU32()&31;return t===5?v.add(16).readDouble():t===4?v.add(16).readU32():v.add(16).readS32();};
  selected={x:n(at(1)),y:n(at(2))};lastSignature='';
 }catch(_){}}});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(Date.now()<next)return;next=Date.now()+200;
  try{
   const p=panel();if(!p)return;
   const state=globalThis.LocalRoamUI&&globalThis.LocalRoamUI.pickerState?globalThis.LocalRoamUI.pickerState():null;
   const a=arena(p);let visible=false;try{visible=a.scalar(a.get(valueOf(p.add(0x168)),'visible'));}finally{a.close();}
   if(!visible||(state&&!state.visible)){wasVisible=false;lastSignature='';selected=null;return;}
   if(state&&generation!==state.generation){generation=state.generation;selected=null;lastSignature='';}
   if(!wasVisible){lastSignature='';wasVisible=true;}
   if(state&&state.selected)selected=state.selected;
   const man=getMan();if(man.isNull())return;
   const pos=new NativeFunction(man.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(man);
   const position=selected||{x:pos.readFloat(),y:pos.add(4).readFloat()};if(!Number.isFinite(position.x)||!Number.isFinite(position.y)||position.x<=0||position.y<=0)return;
   const others=enemies(p),signature=JSON.stringify([p.toString(),position,others]);
   if(signature!==lastSignature&&render(p,position,others)){lastSignature=signature;lastError='';}
  }catch(error){const text=String(error);if(text!==lastError){lastError=text;send({event:'local_map_markers_error',error:text});}next=Date.now()+1000;}
 }});
 globalThis.LocalRoamMapMarkers={status(){return lastStatus;},refresh(){lastSignature='';},renderForTest(position,others=[]){const p=panel();if(!p)throw Error('Map panel is not loaded');return render(p,position,others);}};
 send({event:'local_map_markers_ready'});
}
let lmMarkersInstalled=false;
const lmMarkersObserver=Process.attachModuleObserver({onAdded(m){if(lmMarkersInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;lmMarkersInstalled=true;installLocalMapMarkers();}});
