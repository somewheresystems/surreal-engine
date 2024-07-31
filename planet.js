import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import snoiseShader from './snoise.glsl';
import waterVertexShader from './waterVertexShader.glsl';
import waterFragmentShader from './waterFragmentShader.glsl';
import cloudShader from './cloudShader.glsl';
import landVertexShader from './landVertexShader.glsl';
import landFragmentShader from './landFragmentShader.glsl';
import animatedSkyboxVert from './animatedSkyboxVert.glsl';
import animatedSkyboxFrag from './animatedSkyboxFrag.glsl';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Vector3, Vector2 } from 'three';

let scene, camera, renderer, waterMaterial, waterSphere, controls, cloudTexture, envMap, envScene, mainSkybox, landSphere, landMaterial, composer, bloomPass, motionBlurPass;
let previousCameraPosition = new Vector3();
let previousCameraRotation = new Vector3();
let frameCount = 0;

export function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create water sphere (outer)
    const waterGeometry = new THREE.SphereGeometry(1, 512, 512);
    waterMaterial = createWaterMaterial();
    waterSphere = new THREE.Mesh(waterGeometry, waterMaterial);
    scene.add(waterSphere);

    // Create land sphere (inner)
    const landGeometry = new THREE.SphereGeometry(0.98, 512, 512);
    landMaterial = createLandMaterial();
    landSphere = new THREE.Mesh(landGeometry, landMaterial);
    scene.add(landSphere);

    // After creating the land geometry
    const landElevationTexture = new THREE.DataTexture(
        landGeometry.attributes.position.array,
        256, // width (adjust based on your geometry resolution)
        128, // height (adjust based on your geometry resolution)
        THREE.RedFormat,
        THREE.FloatType
    );
    landElevationTexture.needsUpdate = true;

    // Make sure water sphere is transparent
    waterMaterial.transparent = true;
    waterMaterial.opacity = 0.8;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Create cloud texture
    cloudTexture = createCloudTexture();

    // Create HDR noise texture for environment map
    const spaceNoiseTexture = createSpaceNoiseTexture(2048); // Increased size for more detail

    // Create environment map
    const envMapSize = 256;
    envMap = new THREE.WebGLCubeRenderTarget(envMapSize, {
        type: THREE.HalfFloatType, // Use HalfFloatType instead of FloatType for better performance
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
    });

    // Set up environment map scene and camera
    envScene = new THREE.Scene();
    const envCamera = new THREE.CubeCamera(0.1, 10, envMap);
    envScene.add(envCamera);

    // Add a sphere to the environment scene using the HDR noise texture
    const envSphereGeometry = new THREE.SphereGeometry(5, 64, 64); // Increased detail
    const envSphereMaterial = createAnimatedSkyboxMaterial(spaceNoiseTexture);
    const envSphere = new THREE.Mesh(envSphereGeometry, envSphereMaterial);
    envScene.add(envSphere);

    // Update the environment map
    envCamera.update(renderer, envScene);

    // Update fractal material to use the environment map
    waterMaterial.envMap = envMap.texture;
    waterMaterial.envMapIntensity = 1;
    waterMaterial.needsUpdate = true;

    // Add a skybox to display the environment map in the main scene
    const mainSkyboxGeometry = new THREE.BoxGeometry(100, 100, 100);
    const mainSkyboxMaterial = createAnimatedSkyboxMaterial(spaceNoiseTexture);
    mainSkybox = new THREE.Mesh(mainSkyboxGeometry, mainSkyboxMaterial);
    scene.add(mainSkybox);

    // Create a visible sun in the skybox
    const sunGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    // Replace the sun material creation with this:
    const sunMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1,
        toneMapped: false // This ensures the sun always appears bright
    });

    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(50, 30, -50);
    mainSkybox.add(sunMesh);

    // Add a point light to simulate sun's light
    const sunLight = new THREE.PointLight(0xffffff, 2.0, 0, 1);
    sunLight.position.copy(sunMesh.position);
    scene.add(sunLight);

    // Add a subtle glow effect to the sun
    const sunGlowGeometry = new THREE.SphereGeometry(5.5, 32, 32);
    const sunGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { type: "f", value: 0.1 },
            p: { type: "f", value: 1.4 },
            glowColor: { type: "c", value: new THREE.Color(0xffff00) },
            viewVector: { type: "v3", value: camera.position }
        },
        vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                vec3 actual_normal = vec3(modelMatrix * vec4(normal, 0.0));
                intensity = pow( dot(normalize(viewVector), actual_normal), 6.0 );
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying float intensity;
            void main() {
                vec3 glow = glowColor * intensity;
                gl_FragColor = vec4( glow, 1.0 );
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sunGlow.position.copy(sunMesh.position);
    scene.add(sunGlow);

    // Add subtle ambient light to simulate sky illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Set up postprocessing
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.21;
    bloomPass.strength = 1.2;
    bloomPass.radius = 0.55;
    composer.addPass(bloomPass);

    const motionBlurShader = {
        uniforms: {
            "tDiffuse": { value: null },
            "velocityFactor": { value: 0.5 },
            "delta": { value: new Vector2() }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float velocityFactor;
            uniform vec2 delta;
            varying vec2 vUv;
            void main() {
                vec4 currentColor = texture2D(tDiffuse, vUv);
                vec4 blurredColor = vec4(0.0);
                float totalWeight = 0.0;
                const int samples = 5;
                for (int i = 0; i < samples; i++) {
                    float weight = float(samples - i) / float(samples);
                    vec2 offset = delta * velocityFactor * (float(i) / float(samples - 1) - 0.5) * 5;
                    blurredColor += texture2D(tDiffuse, vUv + offset) * weight;
                    totalWeight += weight;
                }
                gl_FragColor = mix(currentColor, blurredColor / totalWeight, 0.5);
            }
        `
    };

    motionBlurPass = new ShaderPass(motionBlurShader);
    motionBlurPass.renderToScreen = true;
    composer.addPass(motionBlurPass);

    // Initialize previous positions
    previousCameraPosition.copy(camera.position);
    previousCameraRotation.setFromEuler(camera.rotation);

    setupGUI(landMaterial);

    window.addEventListener('resize', onWindowResize, false);

    // Remove any background color
    scene.background = null;

    // Set up tone mapping for better HDR rendering
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Instead of outputEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
}

function createWaterMaterial(landElevationTexture) {
    return new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0.0 },
            u_seed: { value: 77 },
            u_iterations: { value: 5 },
            u_scale: { value: 1.7 },
            u_color1: { value: new THREE.Color(0xffffff) },
            u_color2: { value: new THREE.Color(0xcccccc) },
            u_waveHeight: { value: 0.027 },
            u_fluidSpeed: { value: 0.62 },
            u_fluidScale: { value: 0.3 },
            u_roughness: { value: 0.1 },
            u_metalness: { value: 0.9 },
            u_opacity: { value: 0.8 },
            u_opacityThreshold: { value: 0 },
            u_refractionRatio: { value: 0.98 },
            u_fresnelBias: { value: 0.1 },
            u_fresnelScale: { value: 1.0 },
            u_fresnelPower: { value: 2.0 },
            u_useRefraction: { value: false },
            u_useReflection: { value: true },
            envMap: { value: null },
            u_envMapIntensity: { value: 2.8 },
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_motionBlurStrength: { value: 0.05 }, // New uniform for motion blur
            u_landElevationTexture: { value: landElevationTexture },
            u_waterTransparency: { value: 0.8 },
            u_waterEdgeSharpness: { value: 0.01 },
            prevModelViewMatrix: { value: new THREE.Matrix4() },
            prevProjectionMatrix: { value: new THREE.Matrix4() },
            prevCameraPosition: { value: new THREE.Vector3() }
        },
        vertexShader: snoiseShader + '\n' + waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
    });
}

function createLandMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            u_lowColor: { value: new THREE.Color(0x1a4d2e).multiplyScalar(1/255) },
            u_midColor: { value: new THREE.Color(0x4a7c59).multiplyScalar(1/255) },
            u_highColor: { value: new THREE.Color(0x9ef01a).multiplyScalar(1/255) },
            u_noiseScale: { value: 1.0 },
            u_noiseStrength: { value: 0.1 },
            u_roughness: { value: 0.7 },
            u_metalness: { value: 0.1 },
            u_elevationLevels: { value: 10.0 },
            u_quantizationStrength: { value: 0.3 },
            u_time: { value: 0 },
            u_minElevation: { value: 0.0 },
            u_maxElevation: { value: 1.0 },
            prevModelViewMatrix: { value: new THREE.Matrix4() },
            prevProjectionMatrix: { value: new THREE.Matrix4() },
            prevCameraPosition: { value: new THREE.Vector3() }
        },
        vertexShader: landVertexShader,
        fragmentShader: landFragmentShader,
    });
}

function createCloudTexture(size = 512) {
    const cloudMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0 },
            u_cloudColor: { value: new THREE.Color(1, 1, 1) },
            u_cloudScale: { value: 2.0 },
            u_cloudSpeed: { value: 0.1 },
            iResolution: { value: new THREE.Vector2(size, size) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: cloudShader
    });

    const renderTarget = new THREE.WebGLRenderTarget(size, size, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
    });

    const cloudScene = new THREE.Scene();
    const cloudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const cloudPlane = new THREE.PlaneGeometry(2, 2);
    const cloudMesh = new THREE.Mesh(cloudPlane, cloudMaterial);
    cloudScene.add(cloudMesh);

    return { renderTarget, cloudScene, cloudCamera, cloudMaterial };
}

function createSpaceNoiseTexture(size = 2048) { // Increased size for more detail
    const data = new Float32Array(size * size * 4);
    const starDensity = 0.00001; // Reduced density for fewer, smaller stars
    const starBrightness = 100.0; // Increased brightness to compensate for smaller size
    const blurRadius = 1; // Small blur radius

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            
            if (Math.random() < starDensity) {
                // Create a bright star with slight color variation and anti-aliasing
                const brightness = Math.random() * starBrightness;
                const r = brightness * (0.9 + Math.random() * 0.1);
                const g = brightness * (0.9 + Math.random() * 0.1);
                const b = brightness * (0.9 + Math.random() * 0.1);
                
                // Apply anti-aliasing and blur
                const aa = (x, y) => Math.max(0, 1 - Math.sqrt(x*x + y*y));
                for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                    for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                        if (x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size) {
                            const j = ((y + dy) * size + (x + dx)) * 4;
                            const factor = aa(dx / blurRadius, dy / blurRadius);
                            data[j] += r * factor;
                            data[j + 1] += g * factor;
                            data[j + 2] += b * factor;
                            data[j + 3] = Math.max(data[j + 3], factor);
                        }
                    }
                }
            } else {
                // Very dark space background
                const darkValue = Math.random() * 0.005;
                data[i] = darkValue;
                data[i + 1] = darkValue;
                data[i + 2] = darkValue;
                data[i + 3] = 1;
            }
        }
    }

    // Apply a small amount of blur to the entire texture
    const tempData = new Float32Array(data);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                    if (x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size) {
                        const j = ((y + dy) * size + (x + dx)) * 4;
                        r += tempData[j];
                        g += tempData[j + 1];
                        b += tempData[j + 2];
                        a += tempData[j + 3];
                        count++;
                    }
                }
            }
            const i = (y * size + x) * 4;
            data[i] = r / count;
            data[i + 1] = g / count;
            data[i + 2] = b / count;
            data[i + 3] = a / count;
        }
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.type = THREE.FloatType;
    texture.needsUpdate = true;
    return texture;
}

function createAnimatedSkyboxMaterial(spaceNoiseTexture) {
    return new THREE.ShaderMaterial({
        uniforms: {
            tSpace: { value: spaceNoiseTexture },
            time: { value: 0 }
        },
        vertexShader: animatedSkyboxVert,
        fragmentShader: animatedSkyboxFrag,
        side: THREE.BackSide
    });
}

function setupGUI(landMaterial) {
    const gui = new dat.GUI();
    
    const landFolder = gui.addFolder('Land');
    
    // Helper function to convert hex to RGB (0-1 range)
    const hexToRGB = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return new THREE.Color(r, g, b);
    };

    // Helper function to convert RGB (0-1 range) to hex
    const rgbToHex = (color) => {
        return '#' + color.getHexString();
    };

    // Low Altitude Color
    landFolder.addColor({ color: rgbToHex(landMaterial.uniforms.u_lowColor.value) }, 'color')
        .name('Low Altitude')
        .onChange(value => {
            landMaterial.uniforms.u_lowColor.value = hexToRGB(value);
        });

    // Mid Altitude Color
    landFolder.addColor({ color: rgbToHex(landMaterial.uniforms.u_midColor.value) }, 'color')
        .name('Mid Altitude')
        .onChange(value => {
            landMaterial.uniforms.u_midColor.value = hexToRGB(value);
        });

    // High Altitude Color
    landFolder.addColor({ color: rgbToHex(landMaterial.uniforms.u_highColor.value) }, 'color')
        .name('High Altitude')
        .onChange(value => {
            landMaterial.uniforms.u_highColor.value = hexToRGB(value);
        });

    landFolder.add(landMaterial.uniforms.u_noiseScale, 'value', 0.1, 5).name('Noise Scale');
    landFolder.add(landMaterial.uniforms.u_noiseStrength, 'value', 0, 0.5).name('Noise Strength');
    landFolder.add(landMaterial.uniforms.u_elevationLevels, 'value', 1, 50).step(1).name('Elevation Levels');
    landFolder.add(landMaterial.uniforms.u_quantizationStrength, 'value', 0, 1).name('Quantization Strength');
    landFolder.add(landMaterial.uniforms.u_roughness, 'value', 0, 1).name('Roughness');
    landFolder.add(landMaterial.uniforms.u_metalness, 'value', 0, 1).name('Metalness');
    
    const waterFolder = gui.addFolder('Water');
    const params = {
        seed: 77,
        iterations: 3,
        scale: 3,
        waveHeight: 0.005,
        fluidSpeed: 0.82,
        fluidScale: 0.52,
        color1: '#000000',
        color2: '#ffffff',
        roughness: 0.91,
        metalness: 0.05,
        opacity: 1,
        opacityThreshold: 0,
        refractionRatio: 0,
        fresnelBias: 0,
        fresnelScale: 0,
        fresnelPower: 0,
        useRefraction: true,
        useReflection: true,
        cloudColor: '#ffffff',
        cloudScale: 2,
        cloudSpeed: 0.1,
        envMapIntensity: 2.8,
        motionBlurStrength: 0.05,
        waterTransparency: 0.8,
        waterEdgeSharpness: 0.01
    };

    waterFolder.add(params, 'seed', 0, 100).onChange(updateUniforms);
    waterFolder.add(params, 'iterations', 1, 10).step(1).onChange(updateUniforms);
    waterFolder.add(params, 'scale', 0.1, 5).onChange(updateUniforms);
    waterFolder.add(params, 'waveHeight', 0.001, 0.2).onChange(updateUniforms);
    waterFolder.add(params, 'fluidSpeed', 0.01, 1).onChange(updateUniforms);
    waterFolder.add(params, 'fluidScale', 0.1, 10).onChange(updateUniforms);
    waterFolder.addColor(params, 'color1').onChange(updateUniforms);
    waterFolder.addColor(params, 'color2').onChange(updateUniforms);
    waterFolder.add(params, 'roughness', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'metalness', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'opacity', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'opacityThreshold', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'refractionRatio', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'fresnelBias', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'fresnelScale', 0, 5).onChange(updateUniforms);
    waterFolder.add(params, 'fresnelPower', 0, 5).onChange(updateUniforms);
    waterFolder.add(params, 'useRefraction').onChange(updateUniforms);
    waterFolder.add(params, 'useReflection').onChange(updateUniforms);
    waterFolder.addColor(params, 'cloudColor').onChange(updateCloudUniforms);
    waterFolder.add(params, 'cloudScale', 0.1, 10).onChange(updateCloudUniforms);
    waterFolder.add(params, 'cloudSpeed', 0, 1).onChange(updateCloudUniforms);
    waterFolder.add(params, 'envMapIntensity', 0, 5).onChange(updateUniforms);
    waterFolder.add(params, 'waterTransparency', 0, 1).onChange(updateUniforms);
    waterFolder.add(params, 'waterEdgeSharpness', 0, 0.1).onChange(updateUniforms);

    function updateUniforms() {
        waterMaterial.uniforms.u_seed.value = params.seed;
        waterMaterial.uniforms.u_iterations.value = params.iterations;
        waterMaterial.uniforms.u_scale.value = params.scale;
        waterMaterial.uniforms.u_waveHeight.value = params.waveHeight;
        waterMaterial.uniforms.u_fluidSpeed.value = params.fluidSpeed;
        waterMaterial.uniforms.u_fluidScale.value = params.fluidScale;
        waterMaterial.uniforms.u_color1.value.setStyle(params.color1);
        waterMaterial.uniforms.u_color2.value.setStyle(params.color2);
        waterMaterial.uniforms.u_roughness.value = params.roughness;
        waterMaterial.uniforms.u_metalness.value = params.metalness;
        waterMaterial.uniforms.u_opacity.value = params.opacity;
        waterMaterial.uniforms.u_opacityThreshold.value = params.opacityThreshold;
        waterMaterial.uniforms.u_refractionRatio.value = params.refractionRatio;
        waterMaterial.uniforms.u_fresnelBias.value = params.fresnelBias;
        waterMaterial.uniforms.u_fresnelScale.value = params.fresnelScale;
        waterMaterial.uniforms.u_fresnelPower.value = params.fresnelPower;
        waterMaterial.uniforms.u_useRefraction.value = params.useRefraction;
        waterMaterial.uniforms.u_useReflection.value = params.useReflection;
        waterMaterial.uniforms.u_envMapIntensity.value = params.envMapIntensity;
        waterMaterial.uniforms.u_waterTransparency.value = params.waterTransparency;
        waterMaterial.uniforms.u_waterEdgeSharpness.value = params.waterEdgeSharpness;
    }

    function updateCloudUniforms() {
        if (cloudTexture && cloudTexture.cloudMaterial) {
            cloudTexture.cloudMaterial.uniforms.u_cloudColor.value.setStyle(params.cloudColor);
            cloudTexture.cloudMaterial.uniforms.u_cloudScale.value = params.cloudScale;
            cloudTexture.cloudMaterial.uniforms.u_cloudSpeed.value = params.cloudSpeed;
        }
    }

    // Initialize uniforms with default values
    updateUniforms();
    updateCloudUniforms();

    const postprocessingFolder = gui.addFolder('Postprocessing');
    const postprocessingParams = {
        bloomEnabled: true,
        bloomThreshold: 0.21,
        bloomStrength: 1.2,
        bloomRadius: 0.55,
        motionBlurEnabled: true,
        motionBlurStrength: 0.1
    };

    postprocessingFolder.add(postprocessingParams, 'bloomEnabled').onChange(updatePostprocessing);
    postprocessingFolder.add(postprocessingParams, 'bloomThreshold', 0, 1).onChange(updatePostprocessing);
    postprocessingFolder.add(postprocessingParams, 'bloomStrength', 0, 3).onChange(updatePostprocessing);
    postprocessingFolder.add(postprocessingParams, 'bloomRadius', 0, 1).onChange(updatePostprocessing);
    postprocessingFolder.add(postprocessingParams, 'motionBlurEnabled').onChange(updatePostprocessing);
    postprocessingFolder.add(postprocessingParams, 'motionBlurStrength', 0, 1)
        .name('Motion Blur Strength')
        .onChange((value) => {
            motionBlurPass.uniforms.velocityFactor.value = value;
        });

    function updatePostprocessing() {
        bloomPass.enabled = postprocessingParams.bloomEnabled;
        bloomPass.threshold = postprocessingParams.bloomThreshold;
        bloomPass.strength = postprocessingParams.bloomStrength;
        bloomPass.radius = postprocessingParams.bloomRadius;
        
        motionBlurPass.enabled = postprocessingParams.motionBlurEnabled;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    waterMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

export function animate(time) {
    requestAnimationFrame(animate);

    const t = time * 0.001; // Convert to seconds

    // Update skybox animation
    if (envMap && envMap.isWebGLCubeRenderTarget && envScene) {
        const envCamera = envMap.texture.camera;
        if (envCamera) {
            if (waterSphere) waterSphere.visible = false;
            envScene.children.forEach(child => {
                if (child.material && child.material.uniforms && child.material.uniforms.time) {
                    child.material.uniforms.time.value = t;
                }
            });
            envCamera.update(renderer, envScene);
            if (waterSphere) waterSphere.visible = true;
        }
    }

    // Update main scene skybox
    if (scene) {
        scene.children.forEach(child => {
            if (child.material && child.material.uniforms && child.material.uniforms.time) {
                child.material.uniforms.time.value = t;
            }
        });
    }

    // Update water sphere
    if (waterSphere && waterSphere.material.uniforms && waterSphere.material.uniforms.u_time) {
        waterSphere.material.uniforms.u_time.value = t;
    }

    // Rotate the water sphere
    if (waterSphere) {
        waterSphere.rotation.x += 0.001;
        waterSphere.rotation.y += 0.002;
    }

    // Update controls if they exist
    if (controls && typeof controls.update === 'function') {
        controls.update();
    }

    // Calculate camera movement
    const currentPosition = camera.position.clone();
    const currentRotation = new Vector3().setFromEuler(camera.rotation);

    const positionDelta = currentPosition.sub(previousCameraPosition);
    const rotationDelta = currentRotation.sub(previousCameraRotation);

    // Calculate 2D screen-space motion vector
    const motionVector = new Vector2(
        positionDelta.x + rotationDelta.y,
        positionDelta.y + rotationDelta.x
    );

    // Clamp the motion vector to prevent extreme blurring
    motionVector.clampLength(0, 0.05);

    // Update motion blur uniforms
    motionBlurPass.uniforms.delta.value.copy(motionVector);

    // Store current camera state for next frame
    previousCameraPosition.copy(camera.position);
    previousCameraRotation.setFromEuler(camera.rotation);

    // Slowly rotate the skybox
    if (mainSkybox) {
        mainSkybox.rotation.y = time * 0.00001;
    }

    // Render main scene
    if (renderer && scene && camera) {
        composer.render();
    }

    // Reset render target and clear artifacts
    if (frameCount % 300 === 0) {  // Every 300 frames
        renderer.setRenderTarget(null);
        renderer.clear();
        renderer.render(scene, camera);
    }
}

init();
animate(0);