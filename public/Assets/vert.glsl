// vertex.glsl
attribute vec4 a_position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec3 vPos;

void main() {
    // Transform the vertex position
    vPos = a_position.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * a_position;
}