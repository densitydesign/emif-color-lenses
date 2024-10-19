const math = require('mathjs');

const names = [
  'cyan',
  'magenta',
  'yellow',
  'CM',
  'MY',
  'CY',
  'black',
  'white',
];

const getCenter = (el) => {
  const rect = el.getBoundingClientRect();
  return [rect.x + rect.width/2, rect.y + rect.height/2];
};

const fmt = ( col ) => {
  const [r, g, b] = col.map(c => Math.floor(c * 255)); 
  const num = r << 16 | g << 8 | b;
  let hex = num.toString(16);
  hex = '#' + '0'.repeat(6 - hex.length) + hex;
  return hex;
};

module.exports = (gl, svg) => {
  const regions = svg.getElementById('calibration-samples');

  const reference = [];
  const measured = [];

  const pixels = new Uint8Array(4);

  for (const region of regions.children) {
    const samples = [];

    for (const sample of region.children) {
      let [x, y] = getCenter(sample);
      y = window.innerHeight - y;

      gl.readPixels(
        x, y,
        1, 1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );

      samples.push(Array.from(pixels).map(n => (n/255)));
    }

    const average = samples
      .reduce((a, b) => a.map((ac, i) => ac + b[i]), [0, 0, 0, 0])
      .map(c => c / samples.length);
    measured.push(average);
    reference.push([...JSON.parse(region.dataset.color), 1]);
  }

  console.table({ reference: reference.map(fmt), measured: measured.map(fmt) });
  const mat = math.multiply(math.pinv(measured), reference);
  console.log(mat);
  return mat;
};
