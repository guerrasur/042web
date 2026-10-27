"""Regenerate cached face deformations (requires Pillow and NumPy, build-time only)."""
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = np.asarray(Image.open(root / 'Grupo 4.png').convert('RGBA'), dtype=np.float64)
height, width = source.shape[:2]
y, x = np.mgrid[:height, :width]
nx, ny = (x - (width - 1) / 2) / (width / 2), (y - (height - 1) / 2) / (height / 2)
radius = np.hypot(nx, ny)
(root / 'sprites').mkdir(exist_ok=True)
for level in range(1, 4):
    factor = np.ones_like(radius)
    inside = (radius > 0) & (radius < 1)
    factor[inside] = radius[inside] ** (level * .45)
    sx = np.clip((width - 1) / 2 + nx * factor * width / 2, 0, width - 1)
    sy = np.clip((height - 1) / 2 + ny * factor * height / 2, 0, height - 1)
    ix, iy = sx.astype(int), sy.astype(int)
    fx, fy = (sx - ix)[..., None], (sy - iy)[..., None]
    jx, jy = np.minimum(ix + 1, width - 1), np.minimum(iy + 1, height - 1)
    pixels = ((source[iy, ix] * (1 - fx) + source[iy, jx] * fx) * (1 - fy)
              + (source[jy, ix] * (1 - fx) + source[jy, jx] * fx) * fy)
    Image.fromarray(np.rint(pixels).astype('uint8')).save(root / f'sprites/group-inflated-{level}.png', optimize=True)
