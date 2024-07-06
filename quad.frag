#define SHADER_NAME quad.frag

precision highp float;

uniform sampler2D texture;
uniform vec2 textureRes;
uniform vec2 screenRes;

uniform vec3 lensColor;

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
  vec3 col = rgb2oklab(texcol);

  // if close to black or white keep that
  // float colorness = smoothstep(0.9, 0.8, col.x) * smoothstep(0.0, 0.1, col.x);
  float colorness = smoothstep(0.7, 0.75, length(col));
  // col = mix(col, vec3(0.5), colorness);

  vec3 lens = rgb2oklab(lensColor);

  float dist = length(lens - col);
  float keep = smoothstep(0.2, 0.22, dist);
  col = mix(col, vec3(1, 0, 0), keep * colorness);

  gl_FragColor = vec4(oklab2rgb(col), 1);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, texcol, globalMix);
}
