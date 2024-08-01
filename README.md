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

### Running the Project
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
