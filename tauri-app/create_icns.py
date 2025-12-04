#!/usr/bin/env python3
from PIL import Image
import os

# Create iconset directory
iconset_dir = '/tmp/icon.iconset'
os.makedirs(iconset_dir, exist_ok=True)

# Load the source icon
source = Image.open('/home/moebius/dev/tools/vtracer/tauri-app/src/assets/vtracerlogo.ico')

# Generate all required sizes for macOS
sizes = [
    (16, 'icon_16x16.png'),
    (32, 'icon_16x16@2x.png'),
    (32, 'icon_32x32.png'),
    (64, 'icon_32x32@2x.png'),
    (128, 'icon_128x128.png'),
    (256, 'icon_128x128@2x.png'),
    (256, 'icon_256x256.png'),
    (512, 'icon_256x256@2x.png'),
    (512, 'icon_512x512.png'),
    (1024, 'icon_512x512@2x.png'),
]

for size, filename in sizes:
    resized = source.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(iconset_dir, filename), 'PNG')

print(f"Created iconset at {iconset_dir}")
