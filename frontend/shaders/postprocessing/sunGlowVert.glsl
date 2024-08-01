uniform vec3 viewVector;
varying float intensity;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vec3 actual_normal = vec3(modelMatrix * vec4(normal, 0.0));
    intensity = pow( dot(normalize(viewVector), actual_normal), 6.0 );
}