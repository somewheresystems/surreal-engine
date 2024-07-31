import torch
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from diffusers import AutoPipelineForImage2Image
from io import BytesIO
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the SDXL Turbo pipeline
pipe = None

def load_pipeline():
    global pipe
    try:
        pipe = AutoPipelineForImage2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float32)
        pipe.to("cpu")
        logger.info("Pipeline loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load pipeline: {str(e)}")
        raise

load_pipeline()

@app.post("/process_frame")
async def process_frame(file: UploadFile = File(...), prompt: str = Form("Beautiful, cinematic photography shot of a planet in space")):
    try:
        logger.info(f"Received prompt: {prompt}")
        logger.info(f"Received file: {file.filename}, Content-Type: {file.content_type}")

        # Read and process the uploaded image
        contents = await file.read()
        logger.info(f"Read {len(contents)} bytes from the uploaded file")

        input_image = Image.open(BytesIO(contents)).convert('RGB')
        logger.info(f"Opened image with size: {input_image.size}")

        # Resize the image to 512x512 if it's not already that size
        if input_image.size != (512, 512):
            input_image = input_image.resize((512, 512))
            logger.info(f"Resized input image to: {input_image.size}")

        # Set parameters ensuring num_inference_steps * strength >= 1
        num_inference_steps = 2
        strength = 0.5
        guidance_scale = 0.0

        logger.info(f"Processing with num_inference_steps={num_inference_steps}, strength={strength}, guidance_scale={guidance_scale}")

        # Process the image using SDXL Turbo
        logger.info("Starting image processing")
        result = pipe(
            prompt=prompt, 
            image=input_image, 
            num_inference_steps=num_inference_steps, 
            strength=strength, 
            guidance_scale=guidance_scale
        )
        logger.info("Image processing completed")

        if not result.images:
            raise ValueError("No image generated")

        result_image = result.images[0]
        logger.info(f"Processed image, size: {result_image.size}")

        # Convert the result back to bytes
        img_byte_arr = BytesIO()
        result_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        img_bytes = img_byte_arr.getvalue()

        logger.info(f"Returning processed image of size: {len(img_bytes)} bytes")

        return Response(content=img_bytes, media_type="image/png")
    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)