#define SHADER_NAME quad.frag

precision highp float;

uniform sampler2D texture;
uniform vec2 textureRes;
uniform vec2 screenRes;

uniform vec3 lensColor;
uniform mat4 cameraCorrection;
uniform mat4 screenCorrection;
uniform vec2 stepRange;

uniform float globalMix;

#pragma glslify: squareFrame = require(glsl-square-frame)
#pragma glslify: oklab2rgb = require(./oklab2rgb.glsl)
#pragma glslify: rgb2oklab = require(./rgb2oklab.glsl)

void main() {
  vec2 uv = squareFrame(screenRes);
  uv.y *= -1.0;

  vec2 st = uv / (textureRes / min(textureRes.x, textureRes.y));
  st = st / 2.0 + 0.5;

  vec3 texcol = texture2D(texture, st).rgb;
  vec3 col = texcol;

  col = (cameraCorrection * vec4(col, 1.0)).rgb;
  col = smoothstep(stepRange.x, stepRange.y, col);
  col *= lensColor;
  col = (screenCorrection * vec4(col, 1.0)).rgb;

  gl_FragColor = vec4(col.xyz, 1.0);

  gl_FragColor.rgb = mix(gl_FragColor.rgb, texcol, globalMix);
}
