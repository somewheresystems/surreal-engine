uniform sampler2D tDiffuse;
uniform float velocityFactor;
uniform vec2 delta;
uniform int samples;
uniform float decay;
varying vec2 vUv;
void main() {
    vec4 currentColor = texture2D(tDiffuse, vUv);
    vec4 blurredColor = vec4(0.0);
    float totalWeight = 0.0;
    for (int i = 0; i < samples; i++) {
        float weight = pow(decay, float(i));
        vec2 offset = delta * velocityFactor * (float(i) / float(samples - 1) - 0.5);
        blurredColor += texture2D(tDiffuse, vUv + offset) * weight;
        totalWeight += weight;
    }
    gl_FragColor = mix(currentColor, blurredColor / totalWeight, velocityFactor);
}