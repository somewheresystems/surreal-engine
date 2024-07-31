uniform sampler2D tSpace;
uniform float time;
varying vec3 vWorldPosition;

// Function to create a seamless loop
vec2 loopUV(vec2 uv, float loopTime) {
    return fract(uv - mod(time, loopTime) / loopTime);
}

void main() {
    vec3 direction = normalize(vWorldPosition);
    vec2 baseUV = vec2(
        atan(direction.z, direction.x) * 0.15915494309189535 + 0.5,
        asin(direction.y) * 0.3183098861837907 + 0.5
    );
    
    // Create two layers of stars with different speeds and scales
    vec2 uv1 = loopUV(baseUV * 2.0, 120.0); // Layer 1: Larger scale, slower
    vec2 uv2 = loopUV(baseUV * 4.0, 60.0);  // Layer 2: Smaller scale, faster
    
    vec4 color1 = texture2D(tSpace, uv1);
    vec4 color2 = texture2D(tSpace, uv2);
    
    // Blend the two layers
    vec4 finalColor = mix(color1, color2, 0.5);
    
    gl_FragColor = vec4(finalColor.rgb, 1.0);
}