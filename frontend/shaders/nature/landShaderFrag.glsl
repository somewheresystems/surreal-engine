varying vec2 vUv;
varying vec3 vNormal;
varying float vElevation;

uniform vec3 u_lowColor;
uniform vec3 u_midColor;
uniform vec3 u_highColor;

void main() {
    // Clamp elevation between 0 and 1
    float clampedElevation = clamp(vElevation, 0.0, 1.0);
    
    vec3 color;
    if (clampedElevation < 0.5) {
        // Interpolate between low and mid color
        color = mix(u_lowColor, u_midColor, clampedElevation * 2.0);
    } else {
        // Interpolate between mid and high color
        color = mix(u_midColor, u_highColor, (clampedElevation - 0.5) * 2.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}