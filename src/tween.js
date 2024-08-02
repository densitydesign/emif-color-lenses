const math = require("mathjs");

module.exports = (from, to, step) => {
  const delta = math.subtract(to, from);
  let i = 0;

  return () => {
    i += step;
    if (i >= 1) return to;
    return math.add(from, math.multiply(delta, i));
  };
};
