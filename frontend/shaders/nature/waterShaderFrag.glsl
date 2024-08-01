uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_roughness;
uniform float u_metalness;
uniform float u_opacity;
uniform float u_opacityThreshold;
uniform float u_refractionRatio;
uniform float u_fresnelBias;
uniform float u_fresnelScale;
uniform float u_fresnelPower;
uniform bool u_useRefraction;
uniform bool u_useReflection;
uniform samplerCube envMap;
uniform sampler2D u_landElevationTexture;
uniform float u_waterTransparency;
uniform float u_waterEdgeSharpness;

varying vec3 vNormal;
varying float vWaveHeight;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying float vDistanceToLand;

void main() {
    float normalizedHeight = (vWaveHeight + 0.1) * 5.0;
    vec3 color = mix(u_color1, u_color2, normalizedHeight);
    
    // Add white caps
    float whiteCap = smoothstep(0.8, 1.0, normalizedHeight);
    color = mix(color, vec3(1.0), whiteCap);
    
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    
    // Fresnel term
    float fresnel = u_fresnelBias + u_fresnelScale * pow(1.0 + dot(viewDir, normal), u_fresnelPower);
    
    // Refraction
    vec3 refractedColor = vec3(0.0);
    if (u_useRefraction) {
        vec3 refractedDir = refract(-viewDir, normal, u_refractionRatio);
        refractedColor = textureCube(envMap, refractedDir).rgb;
    }
    
    // Reflection
    vec3 reflectedDir = reflect(-viewDir, normal);
    vec3 reflectedColor = textureCube(envMap, reflectedDir).rgb;

    // Apply a simple box blur to the environment map
    vec3 blurredEnvColor = vec3(0.0);
    float blurSize = 0.01;
    for(float x = -2.0; x <= 2.0; x += 1.0) {
        for(float y = -2.0; y <= 2.0; y += 1.0) {
            vec3 offset = vec3(x * blurSize, y * blurSize, 0.0);
            blurredEnvColor += textureCube(envMap, reflectedDir + offset).rgb;
        }
    }
    blurredEnvColor /= 25.0; // Normalize (5x5 samples)

    // Combine colors
    vec3 finalColor = mix(color, mix(blurredEnvColor, reflectedColor, fresnel), fresnel);
    
    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diffuse = max(dot(normal, lightDir), 0.0);
    float specular = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 32.0);
    
    finalColor *= (diffuse * 0.7 + 0.3);
    finalColor += specular * 0.3;
    
    // Opacity-to-height mapping
    float opacity = smoothstep(u_opacityThreshold, 1.0, normalizedHeight) * u_opacity;
    
    // Calculate opacity based on distance to land
    float edgeOpacity = smoothstep(-u_waterEdgeSharpness, u_waterEdgeSharpness, vDistanceToLand);
    float finalOpacity = min(opacity, edgeOpacity) * u_waterTransparency;

    // Discard fragment if it's below the land surface
    if (vDistanceToLand < 0.0) {
        discard;
    }

    gl_FragColor = vec4(finalColor, finalOpacity);
}