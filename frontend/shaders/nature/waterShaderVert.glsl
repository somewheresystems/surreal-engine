uniform float u_time;
uniform float u_waveHeight;
uniform int u_iterations;
uniform float u_scale;
uniform float u_seed;
uniform float u_fluidSpeed;
uniform float u_fluidScale;
uniform float u_refractionRatio;
uniform sampler2D u_landElevationTexture;

varying vec3 vNormal;
varying float vWaveHeight;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying float vDistanceToLand;
const float PI = 3.14159265358979323846;

// Curl noise function for more twisty patterns
vec3 curl(vec3 p) {

    
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_x0 = vec3(snoise(p.yz - dx.yz), snoise(p.zx - dx.zx), snoise(p.xy - dx.xy));
    vec3 p_x1 = vec3(snoise(p.yz + dx.yz), snoise(p.zx + dx.zx), snoise(p.xy + dx.xy));
    vec3 p_y0 = vec3(snoise(p.yz - dy.yz), snoise(p.zx - dy.zx), snoise(p.xy - dy.xy));
    vec3 p_y1 = vec3(snoise(p.yz + dy.yz), snoise(p.zx + dy.zx), snoise(p.xy + dy.xy));
    vec3 p_z0 = vec3(snoise(p.yz - dz.yz), snoise(p.zx - dz.zx), snoise(p.xy - dz.xy));
    vec3 p_z1 = vec3(snoise(p.yz + dz.yz), snoise(p.zx + dz.zx), snoise(p.xy + dz.xy));

    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    return normalize(vec3(x, y, z));
}

float twistyNoise(vec3 p) {
    vec3 curlOffset = curl(p * u_fluidScale + vec3(u_time * u_fluidSpeed * 0.1));
    return snoise(p + curlOffset * 0.5);
}

float fractal(vec3 p) {
    float sum = 0.0;
    float freq = 1.0;
    float amp = 0.5;
    for (int i = 0; i < u_iterations; i++) {
        sum += twistyNoise(p * freq) * amp;
        p = p.yzx * 1.1 + vec3(u_time * u_fluidSpeed * 0.05);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    vec3 p = normalize(position);
    
    float elevation = -fractal(p * u_scale + vec3(u_seed)) * u_waveHeight;
    vWaveHeight = elevation;
    
    vec3 newPosition = p * (1.0 + elevation);
    
    vec3 tangent1 = normalize(cross(p, vec3(0.0, 1.0, 0.0)));
    vec3 tangent2 = normalize(cross(p, tangent1));
    vec3 nearby1 = p + tangent1 * 0.01;
    vec3 nearby2 = p + tangent2 * 0.01;
    float nearby1Elevation = -fractal(nearby1 * u_scale + vec3(u_seed)) * u_waveHeight;
    float nearby2Elevation = -fractal(nearby2 * u_scale + vec3(u_seed)) * u_waveHeight;
    vec3 newNearby1 = nearby1 * (1.0 + nearby1Elevation);
    vec3 newNearby2 = nearby2 * (1.0 + nearby2Elevation);
    vNormal = normalize(cross(newNearby1 - newPosition, newNearby2 - newPosition));

    vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = -mvPosition.xyz;

    // Sample land elevation
    vec2 uv = vec2(
        0.5 + atan(p.z, p.x) / (2.0 * PI),
        0.5 - asin(p.y) / PI
    );
    float landElevation = texture2D(u_landElevationTexture, uv).r;

    // Calculate distance to land surface
    float waterSurfaceRadius = length(newPosition);
    vDistanceToLand = waterSurfaceRadius - (0.98 + landElevation * 0.02); // Adjust these values as needed

    gl_Position = projectionMatrix * mvPosition;
}