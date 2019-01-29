const google = require('googleapis');

const { authorize } = require('./gAPI.service');

const SHEET_INFOS = require('../../sheetInfos.json');
const { sheetId } = require('../../config.json');

const sheets = new google.GoogleApis().sheets('v4');

function ntol(num) {
  let ret = '';
  for (let a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) { // eslint-disable-line
    ret = String.fromCharCode(parseInt((num % b) / a, 10) + 65) + ret;
  }
  return ret;
}

function lton(str) {
  const string = str.toUpperCase();
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < string.length; i += 1) {
    sum += (letters.length ** i) * (letters.indexOf(string.substr(((i + 1) * -1), 1)) + 1);
  }
  return sum;
}

function calcCol(mes, dec) {
  const { prim } = SHEET_INFOS[dec];
  const primNum = lton(prim);

  const c = 3 * (parseInt(mes, 10) - 1);

  return ntol(c + primNum);
}

function writeSheetRange(range, values, ano) {
  return new Promise((resolve, reject) => {
    authorize((auth) => {
      sheets.spreadsheets.values.update({
        auth,
        range,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
        spreadsheetId: sheetId[ano],
      }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  });
}

function writeCol(column, arr, ano) {
  return new Promise((resolve, reject) => {
    const values = arr.map(v => [v]);
    const { dataRowLoc, pageName } = SHEET_INFOS;
    const range = `${pageName}!${column}${dataRowLoc.primDataRow}:${column}`;
    authorize((auth) => {
      sheets.spreadsheets.values.update({
        auth,
        range,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
        spreadsheetId: sheetId[ano],
      }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  });
}

function writeColByDec(dec, data, { mes, ano }) {
  const col = calcCol(mes, dec);

  return writeCol(col, data, ano);
}

function writeCell(cellId, data, ano) {
  return writeSheetRange(cellId, [[data]], ano);
}

function getSheetRange(range, ano) {
  return new Promise((resolve, reject) => {
    authorize((auth) => {
      sheets.spreadsheets.values.get({
        auth,
        range,
        spreadsheetId: sheetId[ano],
      }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  });
}

function getCol(col, ano) {
  return new Promise((resolve, reject) => {
    const { dataRowLoc, pageName } = SHEET_INFOS;

    const range = `${pageName}!${col}${dataRowLoc.primDataRow}:${col}`;

    getSheetRange(range, ano).then((res) => {
      const rows = res.data.values;
      if (rows) {
        resolve(rows.map((v) => {
          if (v[0]) return v[0];
          return '';
        }));
      } else resolve([]);
    }).catch(err => reject(err));
  });
}

function getColByName(name, ano) {
  const { colNames } = SHEET_INFOS;
  return getCol(colNames[name], ano);
}

function getColByDec(name, { mes, ano }) {
  const col = calcCol(mes, name);

  return getCol(col, ano);
}

module.exports = {
  lton,
  ntol,
  calcCol,
  writeSheetRange,
  writeCol,
  writeColByDec,
  writeCell,
  getSheetRange,
  getColByName,
  getColByDec,
};
