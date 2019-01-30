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

function getSheetRanges(ranges, ano) {
  return new Promise((resolve, reject) => {
    authorize((auth) => {
      sheets.spreadsheets.values.batchGet({
        auth,
        ranges,
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

function getColsByName(names, { mes, ano }) {
  const { dataRowLoc, pageName, colNames } = SHEET_INFOS;
  const ranges = [];

  names.forEach((name) => {
    if (name === 'esocial' || name === 'dctf' || name === 'ecd') {
      const col = calcCol(mes, name);
      ranges.push(`${pageName}!${col}${dataRowLoc.primDataRow}:${col}`);
    } else {
      const col = colNames[name];
      if (col) ranges.push(`${pageName}!${col}${dataRowLoc.primDataRow}:${col}`);
    }
  });

  return new Promise((resolve, reject) => {
    getSheetRanges(ranges, ano).then(
      res => resolve(res.data.valueRanges.map(o => o.values.map(v => v[0]))))
    .catch(err => reject(err));
  });
}

function convertHex(color, alpha = 1.0) {
  const hex = color.replace('#', '');
  const red = parseInt(hex.substring(0, 2), 16) / 255;
  const green = parseInt(hex.substring(2, 4), 16) / 255;
  const blue = parseInt(hex.substring(4, 6), 16) / 255;

  return {
    red,
    green,
    blue,
    alpha,
  };
}

function convertStrRange(str, pageId) {
  if (str === '*') {
    return {
      sheetId: pageId || 0,
    };
  }
  const arr = str.includes('!') ? str.split('!')[1].split(':') : str.split(':');
  const regex = /([A-Z]*)(\d*)/;

  let [, startColumnIndex, startRowIndex] = regex.exec(arr[0]);

  startColumnIndex = lton(startColumnIndex) - 1;
  startRowIndex = parseInt(startRowIndex, 10) - 1;

  let endColumnIndex;
  let endRowIndex;
  if (arr[1]) {
    [, endColumnIndex, endRowIndex] = regex.exec(arr[1]);
    endColumnIndex = lton(endColumnIndex);
    endRowIndex = parseInt(endRowIndex, 10);
  } else {
    endColumnIndex = startColumnIndex + 1;
    endRowIndex = startRowIndex + 1;
  }

  return {
    sheetId: pageId || 0,
    startColumnIndex: startColumnIndex === 0 ? 0 : startColumnIndex || undefined,
    endColumnIndex: endColumnIndex === 0 ? 0 : endColumnIndex || undefined,
    startRowIndex: startRowIndex === 0 ? 0 : startRowIndex || undefined,
    endRowIndex: endRowIndex === 0 ? 0 : endRowIndex || undefined,
  };
}

function updateCellsColor(rangesColor, ano) {
  const requests = [];

  rangesColor.forEach(({ range, color }) => {
    const req = {
      repeatCell: {
        fields: 'userEnteredFormat(backgroundColor)',
        range: convertStrRange(range),
        cell: {
          userEnteredFormat: {
            backgroundColor: color ? convertHex(color) : convertHex('#ffffff'),
          },
        },
      },
    };

    requests.push(req);
  });

  const resource = { requests };

  return new Promise((resolve, reject) => {
    authorize((auth) => {
      sheets.spreadsheets.batchUpdate({
        auth,
        resource,
        spreadsheetId: sheetId[ano],
      }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  });
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
  getSheetRanges,
  getColByName,
  getColByDec,
  getColsByName,
  updateCellsColor,
  convertStrRange,
};
