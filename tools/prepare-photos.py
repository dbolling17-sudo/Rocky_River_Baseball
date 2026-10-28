# Copies a batch of photos into src/assets/photos/<folder>/ ready for the site:
# turns each one upright, removes hidden camera data (location, phone model,
# time taken) and gives it a simple numbered name.
#
#   python3 tools/prepare-photos.py <folder of photos> <year>/<album-name>
#   e.g. python3 tools/prepare-photos.py ~/Downloads/clinic 2026/river-bucs
#
# Files come out as river-bucs-01.jpg, river-bucs-02.jpg, ... in name order.
import sys
from pathlib import Path
from PIL import Image, ImageOps

src, dest = Path(sys.argv[1]), sys.argv[2].strip('/')
out = Path('src/assets/photos') / dest
out.mkdir(parents=True, exist_ok=True)
prefix = Path(dest).name
files = sorted(p for p in src.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.heic', '.webp'})
for i, f in enumerate(files, 1):
    im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
    name = f'{prefix}-{i:02d}.jpg'
    im.save(out / name, quality=92, optimize=True)  # saved without any metadata
    print(f'{f.name} -> {dest}/{name} ({im.width}x{im.height})')
