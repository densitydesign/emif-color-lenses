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

vec3 cmyk2rgb(vec4 cmyk) {
    float c = cmyk.x;
    float m = cmyk.y;
    float y = cmyk.z;
    float k = cmyk.w;

    float invK = 1.0 - k;
    float r = 1.0 - min(1.0, c * invK + k);
    float g = 1.0 - min(1.0, m * invK + k);
    float b = 1.0 - min(1.0, y * invK + k);
    return clamp(vec3(r, g, b), 0.0, 1.0);
}

vec4 rgb2cmyk(vec3 rgb) {
    float r = rgb.r;
    float g = rgb.g;
    float b = rgb.b;
    float k = min(1.0 - r, min(1.0 - g, 1.0 - b));
    vec3 cmy = vec3(0.0);
    float invK = 1.0 - k;
    if (invK != 0.0) {
        cmy.x = (1.0 - r - k) / invK;
        cmy.y = (1.0 - g - k) / invK;
        cmy.z = (1.0 - b - k) / invK;
    }
    return clamp(vec4(cmy, k), 0.0, 1.0);
}


void main() {
  vec2 uv = squareFrame(screenRes);
  uv.y *= -1.0;

  vec2 st = uv / (textureRes / min(textureRes.x, textureRes.y));
  st = st / 2.0 + 0.5;

  vec3 texcol = texture2D(texture, st).rgb;
  vec4 col = rgb2cmyk(texcol);

  vec4 lens = rgb2cmyk(lensColor);

  col.a = smoothstep(0.5, 0.6, col.a); // * smoothstep(0.8, 0.7, length(col.rgb));

  float aligned = dot(col.rgb, lens.rgb);
  col.rgb *= smoothstep(0.85, 0.95, aligned);

  gl_FragColor = vec4(cmyk2rgb(col), 1);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, texcol, globalMix);
}
