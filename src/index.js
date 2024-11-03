const i18n = require("./i18n.js");
const t = i18n(document.getElementById('select-language'));

const glctx = require("gl-context");
const glslify = require("glslify");
const glshd = require("gl-shader");
const gltex = require("gl-texture2d");
const gltri = require("a-big-triangle");
const math = require("mathjs");
const calibrate = require("./calibrate.js");
const tween = require("./tween.js");

const pages = Object.fromEntries(
  ['start', 'calibration', 'live', 'credits']
  .map(n => [n, document.getElementById(`page-${n}`)])
);
const buttons = Object.fromEntries(
  ['start', 'calibrate', 'recalibrate', 'credits', 'back', 'c', 'm', 'y']
  .map(n => [n, document.getElementById(`button-${n}`)])
);
const sliders = Object.fromEntries(
  ['input']
  .map(n => [n, document.getElementById(`slider-${n}`)])
);
const canvas = document.getElementById('canvas');
const template = document.getElementById('calibration-template');
let gl, program, texture;
let updateInput, cleanupInput;

let cameraCorrection = null; // localStorage.density_lens_corr && JSON.parse(localStorage.density_lens_corr);

const screenCorrection = (() => {
  const colors = [0x00adee, 0xed6ea7, 0xfff200];
  let matrix = [];
  for (const rgb of colors) {
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    matrix.push([
      r / 0xff - 1,
      g / 0xff - 1,
      b / 0xff - 1,
      0,
    ]);
  }

  matrix.push([1, 1, 1, 1]);
  return matrix;
})();
const lenses = {c: [1,0,0], m: [0,1,0], y: [0,0,1]};
const thresholds = {c: 0.48, m: 0.45, y: 0.32};

let mode = 'c';
let page = 'start';
let lensColor = tween(lenses[mode], lenses[mode], 1);
let globalMix = tween(0, 0, 1);

const update = () => {
  buttons.c.classList.toggle('active', mode === 'c');
  buttons.m.classList.toggle('active', mode === 'm');
  buttons.y.classList.toggle('active', mode === 'y');

  lensColor = tween(lensColor(), lenses[mode], 0.1);
  globalMix = tween(globalMix(), cameraCorrection ? 0 : 1, 0.1);

  sliders.input.value = thresholds[mode];
  // sliders.label.innerText = `${mode.toUpperCase()}: ${thresholds[mode].toFixed(2)}`;

  for (const p in pages) {
    pages[p].classList.toggle('visible', page === p);
  }
};

sliders.input.oninput = (e) => {
  thresholds[mode] = +e.target.value;
  // sliders.label.innerText = `${mode.toUpperCase()}: ${thresholds[mode].toFixed(2)}`;
};

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  program.bind();
  if (texture) {
    program.uniforms.screenRes = [canvas.width, canvas.height];
    program.uniforms.textureRes = [texture.width, texture.height];
  }

  program.uniforms.cameraCorrection = (cameraCorrection || math.identity(4).toArray()).flat(2);
  program.uniforms.screenCorrection = screenCorrection.flat(2);
  program.uniforms.stepRange = [thresholds[mode]-0.1, thresholds[mode]+0.1];
  program.uniforms.lensColor = lensColor();
  program.uniforms.globalMix = globalMix();

  if (updateInput) updateInput();

  gltri(gl);
};

buttons.start.onclick = async () => {
  try {
    if (cleanupInput) {
      cleanupInput();
      cleanupInput = null;
    }

    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'environment',
          frameRate: { min: 24, ideal: 60 },
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        }
      }),
      new Promise((_, rej) => setTimeout(rej, 10 * 1000)),
    ]);
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

    page = cameraCorrection ? 'live' : 'calibration';
    update();
  } catch (e) {
    console.error("error or timeout in getUserMedia:", e);
    window.alert(t("start-error"));
    location.reload();
  }
};

buttons.calibrate.onclick = () => {
  render();
  cameraCorrection = calibrate(gl, template);
  localStorage.density_lens_corr = JSON.stringify(cameraCorrection);
  page = 'live';
  update();
};

buttons.recalibrate.onclick = () => {
  cameraCorrection = null;
  page = 'calibration';
  update();
};

buttons.credits.onclick = () => {
  page = 'credits';
  update();
};
buttons.back.onclick = () => {
  page = 'live';
  update();
};

buttons.c.onclick = () => {
  mode = 'c';
  update();
}
buttons.m.onclick = () => {
  mode = 'm';
  update();
}
buttons.y.onclick = () => {
  mode = 'y';
  update();
}

gl = glctx(canvas, { depth: false, stencil: false, antialias: true }, render);
gl.clearColor(0, 0, 0, 1);
program = glshd(gl, glslify('./shaders/quad.vert'), glslify('./shaders/cmyk.frag'));

const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gl.viewport(0, 0, canvas.width, canvas.height);
};
window.onresize = resize;
resize();
update();

buttons.start.disabled = false;
