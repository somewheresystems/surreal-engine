uniform sampler2D tDiffuse;
uniform float brightness;
uniform float contrast;
uniform float saturation;
varying vec2 vUv;
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    
    // Brightness
    color.rgb += brightness;
    
    // Contrast
    color.rgb = (color.rgb - 0.5) * contrast + 0.5;
    
    // Saturation
    float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    color.rgb = mix(vec3(luminance), color.rgb, saturation);
    
    gl_FragColor = clamp(color, 0.0, 1.0);
}