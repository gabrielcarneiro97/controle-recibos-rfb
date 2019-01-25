const google = require('googleapis');

const { authorize } = require('./gApi.service');

const COLS_CONFIG = require('../../columns.json');
const { sheetId: spreadsheetId } = require('../../config.json');

const sheets = new google.GoogleApis().sheets('v4');

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

function getSheetRange(range) {
  return new Promise((resolve, reject) => {
    authorize((auth) => {
      sheets.spreadsheets.values.get({
        auth,
        range,
        spreadsheetId,
      }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  });
}

function writeSheetRange(range, values) {
  return new Promise((resolve, reject) => {
    authorize((auth) => {
      sheets.spreadsheets.values.update({
        auth,
        range,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
        spreadsheetId,
      }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  });
}

function writeCell(cellId, data) {
  return writeSheetRange(cellId, [[data]]);
}

// getSheetRange('2019!A1').then((res) => {
//   let rows = res.data.values;

//   console.log(rows);
// }).catch(err => console.error(err));

writeCell('2019!A3', 'EITCHA!').then(r => console.log(r)).catch(err => console.error(err));

module.exports = {
  lton,
  ntol,
  calcCol,
};
