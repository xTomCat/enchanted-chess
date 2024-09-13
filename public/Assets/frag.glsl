// frag.glsl
precision mediump float;

uniform float u_time;
varying vec3 vPos;

// Random function for vec2 (for Perlin noise)
vec2 random(vec2 v) {
    return fract(sin(vec2(dot(v, vec2(12.9898, 78.233)),
                           dot(v, vec2(93.989, 67.345)))) * 43758.5453);
}

// Simple 2D Perlin noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(dot(random(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(random(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(random(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(random(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
    vec3 direction = normalize(vPos);

    // Transition between sky colors
    vec3 skyColor = mix(vec3(0.05, 0.
