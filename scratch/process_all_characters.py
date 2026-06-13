import os
from PIL import Image, ImageFilter

brain_dir = "/Users/elamir/.gemini/antigravity-ide/brain/20643c9f-d7cb-427a-b7d9-4ff00db3b1b6"
output_dir = "/Users/elamir/Desktop/Marco_Polo/public/images/characters"

os.makedirs(output_dir, exist_ok=True)

def process_character(input_path, output_name, is_jpeg=True, threshold=230, feather_radius=1.2):
    img = Image.open(input_path).convert("RGBA")
    
    if is_jpeg:
        # 1. Remove background (near-white pixels)
        datas = img.getdata()
        new_data = []
        for item in datas:
            if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)

    # 2. Trim bounds (crop bounding box)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # 3. Soften/feather edges using alpha channel Gaussian blur
    r, g, b, alpha = img.split()
    blurred_alpha = alpha.filter(ImageFilter.GaussianBlur(feather_radius))
    img = Image.merge("RGBA", (r, g, b, blurred_alpha))

    output_path = os.path.join(output_dir, output_name)
    img.save(output_path, "PNG")
    print(f"Processed: {output_name} | Size: {img.size}")

# File configurations: (filename, output_name, is_jpeg)
character_files = [
    ("media__1781305322126.jpg", "marcopolo_thinking.png", True),
    ("media__1781305322127.jpg", "marcopolo_celebrating.png", True),
    ("media__1781305322132.jpg", "marcopolo_concerned.png", True),
    ("media__1781306024804.jpg", "marcopolo_bazaar.png", True),
]

# Process JPEGs
for filename, output_name, is_jpeg in character_files:
    fp = os.path.join(brain_dir, filename)
    if os.path.exists(fp):
        process_character(fp, output_name, is_jpeg=is_jpeg)
    else:
        print(f"Warning: {filename} not found.")

# Process welcome PNG
welcome_png = os.path.join(brain_dir, "media__1781305318778.png")
if not os.path.exists(welcome_png):
    welcome_png = os.path.join(brain_dir, "media__1781304418600.png")

if os.path.exists(welcome_png):
    process_character(welcome_png, "marcopolo_welcome.png", is_jpeg=False)
else:
    print("Warning: Waving welcome PNG not found.")
