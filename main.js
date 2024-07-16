const glctx = require("gl-context");
const glslify = require("glslify");
const glshd = require("gl-shader");
const gltex = require("gl-texture2d");
const gltri = require("a-big-triangle");

const canvas = document.getElementById('canvas');
const buttonVideo = document.getElementById('button-video');
const buttonImage = document.getElementById('button-image');
const buttonC = document.getElementById('button-c');
const buttonM = document.getElementById('button-m');
const buttonY = document.getElementById('button-y');
const color = document.getElementById('color');
let gl, program;
let video, stream, texture;

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  program.bind();

  if (video && texture) texture.setPixels(video);
  gltri(gl);
};

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gl.viewport(0, 0, canvas.width, canvas.height);
  program.bind();
  program.uniforms.screenRes = [canvas.width, canvas.height];
};

buttonVideo.onclick = async () => {
  if (video) { video.pause(); video = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'environment'
    }
  });

  video = document.createElement('video');
  const loaded = new Promise(res => { video.onloadeddata = res; });
  video.srcObject = stream;
  video.play();
  await loaded;

  texture = gltex(gl, video);
  program.bind();
  program.uniforms.textureRes = [video.videoWidth, video.videoHeight];
};
buttonImage.onclick = async () => {
  if (video) { video.pause(); video = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

  const img = document.createElement('img');
  const loaded = new Promise(res => { img.onload = res; });
  img.src = 'test.png';
  await loaded;
  texture = gltex(gl, img);
  program.bind();
  program.uniforms.textureRes = [img.naturalWidth, img.naturalHeight];
};
color.oninput = () => {
  const bigint = parseInt(color.value.slice(1), 16);
  const r = (bigint >> 16) & 0xff;
  const g = (bigint >> 8) & 0xff;
  const b = bigint & 0xff;
  program.bind();
  program.uniforms.lensColor = [r / 0xff, g / 0xff, b / 0xff];
};
color.onchange = color.oninput;
buttonC.onclick = () => { color.value = '#00adef'; color.onchange(); };
buttonM.onclick = () => { color.value = '#f140a9'; color.onchange(); };
buttonY.onclick = () => { color.value = '#fff200'; color.onchange(); };

gl = glctx(canvas, { depth: false, stencil: false, antialias: true }, render);
gl.clearColor(0, 0, 0, 1);
program = glshd(gl, glslify('./shaders/quad.vert'), glslify('./shaders/cmyk.frag'));

window.onresize = resize;
resize();

let mix = 0;
window.onkeydown = (e) => {
  if (e.key === ' ') {
    mix = 1 - mix;
    program.bind();
    program.uniforms.globalMix = mix;
  }
};

color.onchange();
buttonImage.onclick()
