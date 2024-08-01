uniform sampler2D tDiffuse;
uniform float bloomStrength;
uniform float bloomRadius;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    vec3 bloomColor = vec3(0.0);
    float total = 0.0;
    
    for (float i = -4.0; i <= 4.0; i++) {
        for (float j = -4.0; j <= 4.0; j++) {
            vec2 offset = vec2(i, j) * bloomRadius / vec2(textureSize(tDiffuse, 0));
            vec3 sampleColor = texture2D(tDiffuse, vUv + offset).rgb;
            float weight = 1.0 - length(vec2(i, j)) / 5.0;
            bloomColor += sampleColor * weight;
            total += weight;
        }
    }
    
    bloomColor /= total;
    gl_FragColor = vec4(color.rgb + bloomColor * bloomStrength, color.a);
}