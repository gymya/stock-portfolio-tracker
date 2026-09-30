"""Render our geometric 台 mark with only Python's standard library."""
import struct, zlib
from pathlib import Path
root = Path(__file__).resolve().parents[1] / 'public' / 'icons'
root.mkdir(parents=True, exist_ok=True)
# Shared vector geometry; content stays inside the maskable icon safe zone.
polygons = [[(244,116),(281,130),(219,219),(326,219),(302,184),(332,166),(382,245),(365,262),(154,262),(144,229),(180,219)],
            [(168,291),(345,291),(345,391),(168,391)]]
def inside(x,y,points):
    hit=False
    for i,(ax,ay) in enumerate(points):
        bx,by=points[i-1]
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax: hit=not hit
    return hit
for size in [180,192,512]:
    rows=[]
    for y in range(size):
        row=bytearray([0])
        for x in range(size):
            px,py=(x+.5)*512/size,(y+.5)*512/size
            white=any(inside(px,py,p) for p in polygons) and not (203<px<310 and 322<py<360)
            row.extend((255,255,255) if white else (8,25,45))
        rows.append(bytes(row))
    def chunk(tag,data):
        return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
    (root / f'icon-{size}.png').write_bytes(png)
