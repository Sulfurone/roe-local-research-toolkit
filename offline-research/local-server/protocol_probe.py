"""Loopback-only RoE protocol probe. Captures traffic; does not emulate login yet."""
import argparse, asyncio, datetime, json, signal
from pathlib import Path

def utc(): return datetime.datetime.now(datetime.timezone.utc).isoformat()

class Probe:
    def __init__(self, directory):
        self.directory=directory; directory.mkdir(parents=True,exist_ok=True)
        self.events=(directory/'events.jsonl').open('a',encoding='utf8',buffering=1)
        self.sequence=0; self.tasks=set()
    def event(self,event,**fields):
        self.events.write(json.dumps(dict(time=utc(),event=event,**fields))+'\n')
    async def tcp(self,reader,writer):
        self.sequence+=1; sid=self.sequence; total=0; peer=writer.get_extra_info('peername')
        self.event('tcp_accept',session=sid,peer=peer)
        stream=(self.directory/f'tcp-{sid:03d}-client.bin').open('ab')
        try:
            while True:
                data=await asyncio.wait_for(reader.read(65536),timeout=90)
                if not data:break
                stream.write(data);stream.flush()
                self.event('tcp_data',session=sid,offset=total,length=len(data),hex_preview=data[:128].hex());total+=len(data)
        except asyncio.TimeoutError:self.event('tcp_idle',session=sid)
        except (ConnectionError,OSError) as error:self.event('tcp_error',session=sid,error=str(error))
        finally:
            stream.close();writer.close()
            try:await writer.wait_closed()
            except (ConnectionError,OSError):pass
            self.event('tcp_close',session=sid,client_bytes=total)
    async def run(self,port,duration):
        owner=self
        class UDP(asyncio.DatagramProtocol):
            def datagram_received(self,data,peer):
                owner.sequence+=1;sid=owner.sequence
                (owner.directory/f'udp-{sid:03d}-client.bin').write_bytes(data)
                owner.event('udp_data',session=sid,peer=peer,length=len(data),hex_preview=data[:128].hex())
            def error_received(self,error):owner.event('udp_error',error=str(error))
        server=await asyncio.start_server(self.tcp,'127.0.0.1',port)
        transport,_=await asyncio.get_running_loop().create_datagram_endpoint(UDP,local_addr=('127.0.0.1',port))
        self.event('listening',host='127.0.0.1',port=port,protocols=['tcp','udp'],mode='capture_only')
        (self.directory/'ready.json').write_text(json.dumps(dict(port=port,mode='capture_only',time=utc())),encoding='utf8')
        try:
            async with server:await asyncio.sleep(duration)
        finally:
            server.close();await server.wait_closed();transport.close();self.event('stopped');self.events.close()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-dir',type=Path,required=True)
    parser.add_argument('--port',type=int,default=8001)
    parser.add_argument('--duration',type=float,default=180)
    args=parser.parse_args()
    if not 1024<=args.port<=65535:parser.error('port must be between 1024 and 65535')
    if not 0<args.duration<=3600:parser.error('duration must be in (0,3600]')
    asyncio.run(Probe(args.run_dir).run(args.port,args.duration))
if __name__=='__main__':main()
