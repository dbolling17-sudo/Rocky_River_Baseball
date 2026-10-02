# One-time tool used to cut the pirate out of the River Diamond Club logo
# (src.png = the original artwork). Needs: pip install pillow numpy scipy.
# Output: pirate-logo.png on a transparent background, plus preview images.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
src=Image.open('src.png').convert('L')
lum=np.array(src).astype(float)
H,W=lum.shape
white=lum>128
lab,n=ndi.label(white)
cy,cx,r=395,376,237
yy,xx=np.mgrid[0:H,0:W]
keep=np.zeros_like(white)
for i in range(1,n+1):
    if i==4: continue
    ys,xs=np.where(lab==i)
    if np.hypot(ys.mean()-cy,xs.mean()-cx) < r+25: keep|=lab==i
# Bat: the band of component 4 between its two edges, with a rounded end replacing the R.
# Bat: rebuilt as a clean band from edges fitted to the artwork, ending in a rounded
# barrel where the R used to cover it.
c4=lab==4
rows=np.arange(80,207)
left=np.array([np.where(c4[y])[0].min() for y in rows])
fl=np.polyfit(rows,left,1)
rpts=[(126,577),(134,571),(166,558),(174,552),(182,544),(190,538),(198,531),(206,524)]
fr=np.polyfit([p[0] for p in rpts],[p[1] for p in rpts],1)
Lx=np.polyval(fl,yy); Rx=np.polyval(fr,yy)
yc=100.0; xc=(np.polyval(fl,yc)+np.polyval(fr,yc))/2; w=(np.polyval(fr,yc)-np.polyval(fl,yc))/2
u=np.array([-0.6,0.8])
proj=(xx-xc)*u[0]+(yy-yc)*u[1]
bandfill=(xx>=Lx)&(xx<=Rx)&(yy<=214)&(proj>=0)
cap=(np.hypot(xx-xc,yy-yc)<=w)&(proj<0)
bat=bandfill|cap
inner=bandfill&(xx>Lx+4)&(xx<Rx-4)&(lum<128)   # the thin black highlight line inside the bat
bat_white=bat&~inner
keep|=bat_white|(c4&(yy>214))
disk=lambda k: np.hypot(*np.mgrid[-k:k+1,-k:k+1])<=k
core=ndi.binary_fill_holes(ndi.binary_closing(keep,structure=disk(7)))
# The shoe at the bottom is black and pokes past the circle; wrap it with a wider closing.
bottom=keep.copy(); bottom[:560]=False
core|=ndi.binary_fill_holes(ndi.binary_closing(np.pad(bottom,30),structure=disk(20)))[30:-30,30:-30]&(yy>=560)
# A black rim under the cleats so the shoe sole has a clean bottom edge.
cleats=keep&(yy>=600)&(lab!=8)
core|=ndi.binary_dilation(cleats,structure=disk(7))
core=ndi.binary_fill_holes(core)
lc,nc=ndi.label(core)
core=lc==(np.argmax(ndi.sum(core,lc,range(1,nc+1)))+1)   # drop stray specks
ring=ndi.binary_dilation(core,structure=disk(2))&~core
gray=lum.copy(); gray[bat_white]=255
alpha=np.where(core,255,np.where(ring,lum,0))
rgb=np.where(core,gray,255)
out=np.dstack([rgb,rgb,rgb,alpha]).astype(np.uint8)
ys,xs=np.where(alpha>0)
pad=12
y0,y1,x0,x1=ys.min()-pad,ys.max()+pad,xs.min()-pad,xs.max()+pad
img=Image.fromarray(out).crop((max(x0,0),max(y0,0),min(x1,W),min(y1,H)))
s=max(img.size); sq=Image.new('RGBA',(s,s),(0,0,0,0)); sq.paste(img,((s-img.width)//2,(s-img.height)//2))
sq.save('pirate-logo.png')
print(img.size, sq.size)
# preview on maroon and on white
for name,bg in [('maroon',(87,10,19)),('white',(255,255,255)),('check',(200,200,200))]:
    b=Image.new('RGBA',sq.size,bg+(255,)); b.alpha_composite(sq); b.convert('RGB').save(f'prev-{name}.png')
