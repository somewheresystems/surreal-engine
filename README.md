# Surreal Engine

## Overview
Surreal Engine combines the power of Three.js and Stable Diffusion XL Turbo to create a unique procedural art sandbox. SE effectively employs a neural renderer for visual art pieces.

## Features
- Procedural art generation using Three.js
- Python backend for complex computations
- Integration with SDXL Turbo for neural rendering
- Real-time visual output

## Getting Started

### Prerequisites
- Node.js
- Python 3.x
- SDXL Turbo

### Installation
1. Clone the repository
   ```
   git clone https://github.com/yourusername/surreal-engine.git
   cd surreal-engine
   ```

### Running the SDXL Server with `poetry`
1. Navigate to the Backend directory with `cd backend`
2. `poetry shell`
3. `poetry install`
4. `python sdxl_turbo_server.py`

### Running the Frontend with `npm`
1. Navigate to the Frontend directory with `cd frontend`
2. `npm install`
3. `npm run build`
4. `npm start`
5. Access the frontend on http://localhost:8080.

### Running the Project with `docker-compose`
1. Build the project
   ```
   docker-compose build
   ```
2. Start the application
   ```
   docker-compose up
   ```

### Common Problems

The backend uses a lot of memory (16GB+) so you'll need to ensure that Docker Desktop has enough allocated, as well as consider hacking CUDA support (maybe I'll work on this soon).

When you first build and run the program, it can take up to 10 minutes for the backend to download the SDXL model and dependencies. However, these will be cached for each subsequent run.

## Contributing
We welcome contributions to Surreal Engine! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
