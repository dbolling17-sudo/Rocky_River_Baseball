# Removes the white background around the Rocky River Pirates logo.
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
im=np.array(Image.open('src.png').convert('RGB')).astype(float)
H,W,_=im.shape
nearwhite=im.min(-1)>=236
lab,_=ndi.label(nearwhite)
border=set(np.unique(np.r_[lab[0],lab[-1],lab[:,0],lab[:,-1]]))-{0}
bg=np.isin(lab,list(border))
core=~bg
# soften the 2px edge: estimate how much of each edge pixel is logo vs white paper
edge=core&ndi.binary_dilation(bg,iterations=2)
a=np.ones((H,W))
lightness=im.mean(-1)
a[edge]=np.clip((255-lightness[edge])/(255-205),0,1)
a[bg]=0
rgb=im.copy()
# un-blend edge pixels from white
m=edge&(a>0)
rgb[m]=np.clip((im[m]-255*(1-a[m,None]))/a[m,None],0,255)
out=np.dstack([rgb,a*255]).astype(np.uint8)
ys,xs=np.where(a>0)
img=Image.fromarray(out,'RGBA').crop((xs.min()-4,ys.min()-4,xs.max()+5,ys.max()+5))
img.save('pirates-logo.png'); print(img.size)
for name,bg_ in [('maroon',(117,23,38)),('dark',(34,29,31)),('white',(255,255,255))]:
    b=Image.new('RGBA',img.size,bg_+(255,)); b.alpha_composite(img); b.convert('RGB').save(f'prev-{name}.png')
