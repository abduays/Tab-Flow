#!/bin/bash
# Generate placeholder PNG icons using ImageMagick or pure bash fallback

ICON_DIR="$(dirname "$0")"

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Generating icons with ImageMagick..."
    
    # Create 16x16 icon
    convert -size 16x16 xc:'#4285f4' \
        -fill white -gravity center -pointsize 8 -annotate 0 'TF' \
        "$ICON_DIR/icon16.png"
    
    # Create 32x32 icon
    convert -size 32x32 xc:'#4285f4' \
        -fill white -gravity center -pointsize 16 -annotate 0 'TF' \
        "$ICON_DIR/icon32.png"
    
    # Create 48x48 icon
    convert -size 48x48 xc:'#4285f4' \
        -fill white -gravity center -pointsize 24 -annotate 0 'TF' \
        "$ICON_DIR/icon48.png"
    
    # Create 96x96 icon
    convert -size 96x96 xc:'#4285f4' \
        -fill white -gravity center -pointsize 48 -annotate 0 'TF' \
        "$ICON_DIR/icon96.png"
    
    # Create 128x128 icon
    convert -size 128x128 xc:'#4285f4' \
        -fill white -gravity center -pointsize 64 -annotate 0 'TF' \
        "$ICON_DIR/icon128.png"
    
    echo "✅ Icons generated successfully!"
else
    echo "ImageMagick not found. Creating simple placeholder PNGs..."
    python3 << 'PYTHON'
import struct
import zlib

def create_png(width, height, color=(66, 133, 244), text="TF"):
    """Create a simple PNG with background color and text"""
    
    def png_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # Create pixel data (simple solid color with text approximation)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter byte
        for x in range(width):
            # Simple text rendering for "TF"
            is_text = False
            if width >= 16:
                # Rough text positioning
                cx, cy = width // 2, height // 2
                size = min(width, height) // 4
                
                # Letter T
                if x < cx - size//4 or x > cx + size//4:
                    if abs(y - (cy - size//4)) < size//8:
                        is_text = True
                if abs(x - cx) < size//8 and y > cy - size//4 and y < cy + size//2:
                    is_text = True
                
                # Letter F (offset to right)
                fx = cx + size//2
                if abs(x - fx) < size//8 and y > cy - size//4 and y < cy + size//2:
                    is_text = True
                if x > fx - size//8 and x < fx + size//4:
                    if abs(y - (cy - size//4)) < size//8 or abs(y - cy) < size//8:
                        is_text = True
            
            if is_text:
                raw_data += bytes([255, 255, 255])  # White text
            else:
                raw_data += bytes(color)  # Blue background
    
    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

# Generate all required sizes
sizes = [16, 32, 48, 96, 128]
for size in sizes:
    png_data = create_png(size, size)
    with open(f'/workspace/TabFlow/icons/icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f"✅ Created icon{size}.png")

print("All placeholder icons generated!")
PYTHON
fi
