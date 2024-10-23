const math = require('mathjs');

const getCenter = (el) => {
  const rect = el.getBoundingClientRect();
  return [rect.x + rect.width/2, rect.y + rect.height/2];
};

const fmt = (col) => {
  const [r, g, b] = col.map(c => Math.floor(c * 255)); 
  const num = r << 16 | g << 8 | b;
  let hex = num.toString(16);
  hex = '#' + '0'.repeat(6 - hex.length) + hex;
  return hex;
};

const parse = (col) => {
  if (col.length !== 7 || col[0] !== '#') throw new Error(`invalid color string '${col}'`);
  const rgb = parseInt(col.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;

  return [
    r / 0xff,
    g / 0xff,
    b / 0xff,
    0,
  ];
};

module.exports = (gl, svg) => {
  const samples = svg.getElementById('calibration-samples');

  const pixels = new Uint8Array(4);

  const readings = {};
  for (const sample of samples.children) {
    let [x, y] = getCenter(sample);
    y = window.innerHeight - y;

    gl.readPixels(
      x, y,
      1, 1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    const output = sample.attributes.fill.value;
    readings[output] = readings[output] ?? [];
    readings[output].push(Array.from(pixels).map(n => (n/255)));
  }

  const measured = [];
  const reference = [];
  for (const output of Object.keys(readings)) {
    const average = readings[output]
      .reduce((a,b) => math.add(a,b))
      .map(c => c / readings[output].length);
    measured.push(average);
    reference.push(parse(output));
  }

  console.table({ reference: reference.map(fmt), measured: measured.map(fmt) });
  const mat = math.multiply(math.pinv(measured), reference);
  console.log(mat);
  return mat;
};
