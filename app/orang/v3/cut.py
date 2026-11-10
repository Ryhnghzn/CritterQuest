from PIL import Image, ImageDraw
import numpy as np, json
import os
ROOT=os.path.dirname(os.path.abspath(__file__))
I=ROOT+'/../../../art-src/karakter/'
O=ROOT+'/parts/'
def key(path):
    a=np.array(Image.open(path).convert('RGB')).astype(float); r,g,b=a[...,0],a[...,1],a[...,2]
    ex=g-np.maximum(r,b); al=np.clip(1-(ex-40)/70,0,1)
    g2=np.minimum(g,np.maximum(r,b)+8)
    return Image.fromarray(np.dstack([r,g2,b,al*255]).astype('uint8'),'RGBA')
sheet=key(I+'eclipse-potongan.png'); full=key(I+'eclipse-utuh.png'); print(sheet.size)
R=dict(crown=(25,50,175,130),pauldron=(205,10,362,190),armtop=(388,15,495,285),vambrace=(525,68,625,216),open=(650,20,755,245),
 fist=(772,38,868,240),sword=(893,92,1005,560),coat=(5,135,295,555),thigh=(392,303,495,472),knee=(528,335,618,460),
 greave=(650,285,740,566),foot=(770,305,900,402))
meta={}
for k,b in R.items():
    c=sheet.crop(b)
    if k=='coat': c.paste((0,0,0,0),(170,0,290,62))        # pauldron tip that shares the box
    if k=='sword': c.paste((0,0,0,0),(0,200,8,470))        # specks from the neighbouring boot
    bb=c.getbbox(); c=c.crop(bb); c.save(O+k+'.webp',quality=92,method=6); meta[k]=c.size
# head from the full figure: polygon around hair, face and neck, away from the black far shoulder
m=Image.new('L',full.size,0)
ImageDraw.Draw(m).polygon([(322,30),(500,30),(495,135),(470,165),(452,205),(452,232),(395,232),(372,185),(352,150),(322,120)],fill=255)
h=full.copy(); h.putalpha(Image.fromarray(np.minimum(np.array(full)[...,3],np.array(m)))); bb=h.getbbox(); h=h.crop(bb); h.save(O+'head.webp',quality=92,method=6); meta['head']=h.size; print('head box',bb)
# joints need their own pieces: shin without the foot, hand without the bracer
def sub(src,name,box):
    c=Image.open(O+src+'.webp').convert('RGBA').crop(box); c=c.crop(c.getbbox()); c.save(O+name+'.webp',quality=92,method=6); meta[name]=c.size
sub('greave','shin',(0,0,88,212)); sub('fist','hand',(0,0,93,112))
print(meta)
