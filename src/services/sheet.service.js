const COLS_CONFIG = require('../../columns.json');

function ntol(num) {
  let ret = '';
  for (let a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) { // eslint-disable-line
    ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret; // eslint-disable-line
  }
  return ret;
}

function lton(string) {
  string = string.toUpperCase(); // eslint-disable-line
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < string.length; i += 1) {
    sum += (letters.length ** i) * (letters.indexOf(string.substr(((i + 1) * -1), 1)) + 1);
  }
  return sum;
}

function calcCol(mes, dec) {
  const { prim } = COLS_CONFIG[dec];
  const primNum = lton(prim);

  const c = 3 * (parseInt(mes, 10) - 1);

  return ntol(c + primNum);
}

console.log(calcCol('13', 'esocial'));

module.exports = {
  lton,
  ntol,
};
