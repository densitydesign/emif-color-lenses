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

const reference = [
  [1,0,0,1],
  [0,1,0,1],
  [0,0,1,1],
  [1,1,0,1],
  [0,1,1,1],
  [1,0,1,1],
  [1,1,1,1],
  [0,0,0,1],
];

module.exports = (callback) => {
  const samplesPerColor = 3;

  const measured = [];
  let samples = [];

  const getHint = () => {
    const count = samplesPerColor - samples.length;
    const color = names[measured.length];
    if (!color) return '';
    return `click to collect ${count} ${color} samples`;
  };

  const addSample = (rgb) => {
    if (measured.length >= reference.length) return;

    samples.push(rgb);

    if (samples.length >= samplesPerColor) {
      const avg = samples
        .reduce((a, b) => a.map((ac, i) => ac + b[i]), [0, 0, 0])
        .map(c => c / samples.length);
      measured.push([...avg, 1]);
      samples = [];
    }

    if (measured.length >= reference.length) {
      const matrix = math.multiply(math.pinv(measured), reference);
      callback(matrix);
      return '';
    } else {
      return getHint();
    }
  };

  return [getHint(), addSample];
};
