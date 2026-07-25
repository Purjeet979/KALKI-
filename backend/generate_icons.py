import os
from PIL import Image, ImageDraw

def generate_shield_icon(size: int, output_path: str):
    """Generates a high-quality, professional cybersecurity icon of the given size
    and saves it to the output_path. Draws a modern hex-shield shape with a
    neon cyan border and a stylized 'K' character in the center using line vector drawing.
    """
    # Create an image with transparent background (RGBA)
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Scale coordinates based on the size
    S = float(size)
    
    # Hex-shield points
    p1 = (0.2 * S, 0.25 * S)
    p2 = (0.5 * S, 0.12 * S)
    p3 = (0.8 * S, 0.25 * S)
    p4 = (0.8 * S, 0.65 * S)
    p5 = (0.5 * S, 0.90 * S)
    p6 = (0.2 * S, 0.65 * S)
    
    shield_polygon = [p1, p2, p3, p4, p5, p6]
    
    # Background fill of the shield (Cyber Dark Navy)
    fill_color = (7, 11, 25, 230) # Dark navy with slight transparency
    # Neon Cyan border
    border_color = (0, 240, 255, 255) # #00f0ff Neon Cyan
    border_width = max(1, int(S / 14.0))
    
    # Draw shield background polygon
    draw.polygon(shield_polygon, fill=fill_color)
    
    # Draw shield border
    # Using line drawing to control joint thickness and outline cleanly
    draw.line(shield_polygon + [p1], fill=border_color, width=border_width, joint="curve")
    
    # Draw a stylized letter "K" in the center using vector lines (Neon Cyan / White mix)
    # Bounds for the "K" letter: Y is from 0.35 to 0.65, X is from 0.42 to 0.62
    spine_x = 0.43 * S
    top_y = 0.36 * S
    mid_y = 0.51 * S
    bottom_y = 0.66 * S
    right_x = 0.62 * S
    
    k_color = (255, 255, 255, 255) # White body for high visibility
    k_width = max(1, int(S / 16.0))
    
    # Vertical spine
    draw.line([(spine_x, top_y), (spine_x, bottom_y)], fill=k_color, width=k_width, joint="curve")
    # Upper angled branch
    draw.line([(spine_x, mid_y), (right_x, top_y)], fill=border_color, width=k_width, joint="curve")
    # Lower angled branch
    draw.line([(spine_x, mid_y), (right_x, bottom_y)], fill=border_color, width=k_width, joint="curve")
    
    # Save the image
    image.save(output_path, "PNG")
    print(f"Generated {size}x{size} icon at: {output_path}")

def main():
    # Target directory for the icons inside extension
    icons_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "extension", "icons")
    os.makedirs(icons_dir, exist_ok=True)
    
    sizes = [16, 32, 48, 128]
    for size in sizes:
        output_file = os.path.join(icons_dir, f"icon{size}.png")
        generate_shield_icon(size, output_file)

if __name__ == "__main__":
    main()
