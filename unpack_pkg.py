from pathlib import Path
import struct,json
src=Path('extracted/3653324997/scene.pkg'); data=src.read_bytes(); pos=0
def u32():
 global pos
 value=struct.unpack_from('<I',data,pos)[0];pos+=4;return value
def string():
 global pos
 n=u32(); value=data[pos:pos+n].decode('utf-8');pos+=n;return value
version=string(); count=u32(); entries=[]
for _ in range(count):
 name=string(); offset=u32(); size=u32();entries.append((name,offset,size))
root=Path('unpacked/3653324997').resolve(); root.mkdir(parents=True,exist_ok=True)
for name,offset,size in entries:
 target=(root/name).resolve()
 if not target.is_relative_to(root): raise ValueError(name)
 if pos+offset+size>len(data): raise ValueError('Invalid bounds')
 target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data[pos+offset:pos+offset+size])
print(version,count)
print('\n'.join(f'{name}: {size}' for name,offset,size in entries))
