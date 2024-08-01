import requests
import cv2
import numpy as np
from PIL import Image
from io import BytesIO

def send_image(image_path):
    # Convert image to JPEG format
    img = Image.open(image_path).convert('RGB')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()

    print(f"Sending image of size: {len(img_byte_arr)} bytes")
    print(f"Image dimensions: {img.size}")

    files = {'file': ('image.jpg', img_byte_arr, 'image/jpeg')}
    response = requests.post('http://localhost:8000/process_frame', files=files)
    
    if response.status_code != 200:
        print(f"Error: Server returned status code {response.status_code}")
        print(f"Response content: {response.content}")
        return None
    return response.content

def display_images(original, processed):
    if processed is None:
        print("Error: No processed image to display")
        return

    # Convert original image to RGB (OpenCV uses BGR)
    original_rgb = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
    
    # Ensure processed image is in the correct format
    processed_rgb = cv2.cvtColor(processed, cv2.COLOR_BGR2RGB)
    
    # Resize images to match dimensions
    h, w = original_rgb.shape[:2]
    processed_rgb = cv2.resize(processed_rgb, (w, h))
    
    # Combine images horizontally
    combined = np.hstack((original_rgb, processed_rgb))
    
    # Display the combined image
    cv2.imshow('Original vs Processed', combined)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

# Path to your test image
image_path = 'test_image.jpg'

# Read the original image
original_image = cv2.imread(image_path)

if original_image is None:
    print(f"Error: Could not read image from {image_path}")
else:
    print(f"Original image shape: {original_image.shape}")
    # Send the image to the server and get the processed image
    processed_image_bytes = send_image(image_path)
    
    if processed_image_bytes:
        try:
            processed_image = cv2.imdecode(np.frombuffer(processed_image_bytes, np.uint8), cv2.IMREAD_COLOR)
            print(f"Processed image shape: {processed_image.shape}")
            # Display the original and processed images side by side
            display_images(original_image, processed_image)
        except Exception as e:
            print(f"Error processing the response: {e}")
            print(f"Response content: {processed_image_bytes[:100]}...")  # Print first 100 bytes