import cv2
import requests
import numpy as np
from io import BytesIO
from PIL import Image

def send_frame(frame):
    _, img_encoded = cv2.imencode('.jpg', frame)
    response = requests.post("http://localhost:8000/process_frame", files={"file": img_encoded.tobytes()})
    img = Image.open(BytesIO(response.content))
    return np.array(img)

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    processed_frame = send_frame(frame)
    processed_frame = cv2.cvtColor(processed_frame, cv2.COLOR_RGB2BGR)

    cv2.imshow('SDXL Turbo Renderer', processed_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()