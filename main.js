const glctx = require("gl-context");
const glslify = require("glslify");
const glshd = require("gl-shader");
const gltex = require("gl-texture2d");
const gltri = require("a-big-triangle");
const math = require("mathjs");
const calibrate = require("./calibrate.js");

const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const buttonVideo = document.getElementById('button-video');
const buttonImage = document.getElementById('button-image');
const buttonAll = document.getElementById('button-all');
const buttonC = document.getElementById('button-c');
const buttonM = document.getElementById('button-m');
const buttonY = document.getElementById('button-y');
const buttonCalibrate = document.getElementById('calibrate');
const color = document.getElementById('color');
const step = document.getElementById('step');
const hint = document.getElementById('hint');
let gl, program, texture;
let updateInput, cleanupInput;
let mix = 0;

let colorCorrection = localStorage.density_lens_corr && JSON.parse(localStorage.density_lens_corr);

buttonCalibrate.onclick = () => {
  if (colorCorrection) {
    colorCorrection = null;
    return;
  }

  colorCorrection = calibrate(gl, overlay);
  localStorage.density_lens_corr = JSON.stringify(colorCorrection);
};

const render = () => {
  overlay.style.visibility = colorCorrection ? 'hidden' : 'visible';

  gl.clear(gl.COLOR_BUFFER_BIT);
  program.bind();
  if (texture) {
    program.uniforms.screenRes = [canvas.width, canvas.height];
    program.uniforms.textureRes = [texture.width, texture.height];
  }

  program.uniforms.globalMix = colorCorrection ? 0 : 1;
  program.uniforms.colorCorrection = colorCorrection ? colorCorrection.flat(2) : math.identity(4).toArray().flat(2);
  program.uniforms.stepRange = [+step.value - 0.1, +step.value + 0.1];

  if (updateInput) updateInput();

  gltri(gl);
};

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gl.viewport(0, 0, canvas.width, canvas.height);
};

buttonVideo.onclick = async () => {
  if (cleanupInput) {
    cleanupInput();
    cleanupInput = null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'environment',
      width: { ideal: 4096 },
      height: { ideal: 2160 },
    }
  });

  const video = document.createElement('video');
  const loaded = new Promise(res => { video.onplaying = res; });
  video.srcObject = stream;
  video.play();
  await loaded;

  texture = gltex(gl, video);
  texture.width = video.videoWidth;
  texture.height = video.videoHeight;

  updateInput = () => texture.setPixels(video);
  cleanupInput = () => {
    video.pause();
    stream.getTracks().forEach(t => t.stop());
    updateInput = null;
  };
};
buttonImage.onclick = async () => {
  if (cleanupInput) {
    cleanupInput();
    cleanupInput = null;
  }

  const img = document.createElement('img');
  const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  img.src = 'test.png';
  await loaded;
  texture = gltex(gl, img);
};
document.body.ondrop = async (e) => {
  if (cleanupInput) {
    cleanupInput();
    cleanupInput = null;
  }

  e.preventDefault();
  const items = Array.from(e.dataTransfer.items);
  const image = items.find(item => item.type.startsWith('image/'));
  const urls = items.find(item => item.type === 'text/uri-list');

  let url;
  if (image) {
    url = URL.createObjectURL(image.getAsFile());
    cleanupInput = () => URL.revokeObjectURL(url);
  } else if (urls) {
    url = await new Promise(res => urls.getAsString(res));
  } else {
    return;
  }

  const img = document.createElement('img');
  const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  img.src = url;
  window.IMG = img;
  await loaded;
  texture = gltex(gl, img);
};
document.body.ondragover = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
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
buttonAll.onclick = () => { color.value = '#ffffff'; color.onchange(); };
buttonC.onclick = () => { color.value = '#ff0000'; color.onchange(); };
buttonM.onclick = () => { color.value = '#00ff00'; color.onchange(); };
buttonY.onclick = () => { color.value = '#0000ff'; color.onchange(); };

gl = glctx(canvas, { depth: false, stencil: false, antialias: true, preserveDrawingBuffer: true }, render);
gl.clearColor(0, 0, 0, 1);
program = glshd(gl, glslify('./shaders/quad.vert'), glslify('./shaders/cmyk.frag'));

canvas.onclick = (e) => {
  const x = Math.floor(e.clientX - canvas.offsetLeft);
  const y = canvas.height - Math.floor(e.clientY - canvas.offsetTop);

  const pixels = new Uint8Array(4);
  gl.readPixels(
    x, y,
    1, 1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );

  const [r, g, b] = pixels;
  const num = r << 16 | g << 8 | b;
  let hex = num.toString(16);
  hex = '#' + '0'.repeat(6 - hex.length) + hex;
  console.log(hex, Array.from(pixels).map(n => (n/255).toFixed(2)).join(' '));
};

window.onresize = resize;
resize();

window.onkeydown = (e) => {
  if (e.key === ' ') {
    mix = 1 - mix;
    program.bind();
    program.uniforms.globalMix = mix;
  }
};

color.onchange();
buttonImage.onclick();
