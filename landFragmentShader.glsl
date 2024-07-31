varying vec2 vUv;
varying vec3 vNormal;
varying float vElevation;
varying vec3 vViewPosition;

uniform vec3 u_lowColor;
uniform vec3 u_midColor;
uniform vec3 u_highColor;
uniform float u_roughness;
uniform float u_metalness;

void main() {
    vec3 normal = normalize(vNormal);
    
    // Directional light (sun)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    // Ambient light
    float ambient = 0.3;
    
    // Mix colors based on elevation
    vec3 lowMidColor = mix(u_lowColor, u_midColor, smoothstep(0.0, 0.5, vElevation));
    vec3 midHighColor = mix(u_midColor, u_highColor, smoothstep(0.5, 1.0, vElevation));
    vec3 baseColor = mix(lowMidColor, midHighColor, smoothstep(0.4, 0.6, vElevation));
    
    // Apply lighting
    vec3 color = baseColor * (diffuse + ambient);
    
    // Simple specular highlight
    vec3 viewDir = normalize(-vViewPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);
    color += specular * 0.2 * (1.0 - u_roughness);
    
    gl_FragColor = vec4(color, 1.0);
}