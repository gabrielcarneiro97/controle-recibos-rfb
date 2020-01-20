/* eslint no-param-reassign: 0 */

const { ipcRenderer } = require('electron');
const { readComp } = require('./services/xml.service');

const { writeColByDec, getColsByName, addNotesColor, clearNotesColorComp, calcCol } = require('./services/sheet.service');

const { primDataRow } = require('../sheetInfos.json').dataRowLoc;

const { YELLOW, RED } = require('../colors.json');

const ROW_OFFSET = parseInt(primDataRow, 10);

function br(str) {
  return str !== '' ? `${str.replace(/\r/, '').replace(/\n/g, '<br>\n')}<br>` : '';
}

function span(color) {
  return rest => br(`<span style="color: ${color}">${rest}</span>`);
}

const SPAN_RED = span('red');
const SPAN_GREEN = span('green');

const LOG_ERR = SPAN_RED('Erro!');

function sendStatus(status, msg, err) {
  ipcRenderer.send('toMain',
    {
      op: 'progress',
      data: {
        status,
        msg: msg.includes('<br>') ? msg : br(msg),
        err,
      },
    });
}

function checkEsocialSm(now, eSocialArr, i, notes, cellId) {
  if (now.fechamento.compSemMovto) {
    eSocialArr[i] = 'SM';
    notes.push({ range: cellId, color: YELLOW });
  } else eSocialArr[i] = 'OK';
}

function ecdSm(now) {
  return !Object.values(now.fechamento).find(v => v);
}

function checkEcdSm(now, ecdArr, i, notes, cellId) {
  if (ecdSm(now)) {
    ecdArr[i] = 'SM';
    notes.push({ range: cellId, color: YELLOW });
  } else ecdArr[i] = 'OK';
}

function msgErr(notes, cellId, msg, arr, i) {
  arr[i] = 'ER';
  notes.push({ range: cellId, note: msg, color: RED });
  return SPAN_RED(msg);
}

ipcRenderer.on('main', (e, { op, data }) => {
  if (op === 'start') {
    const { comp } = data;
    sendStatus(0, 'Inciando leitura de arquivos...');
    readComp(comp).then((files) => {
      sendStatus(0.1, 'Leitura de arquivos concluída...');

      sendStatus(0.15, 'Filtrando arquivos...');
      const eSocialFiles = [];
      const dctfFiles = [];
      const ecdFiles = [];

      const eSocialCol = calcCol(comp.mes, 'esocial');
      const dctfCol = calcCol(comp.mes, 'dctf');
      const ecdCol = calcCol(comp.mes, 'ecd');

      files.forEach((o) => {
        if (o) {
          if (o.tipo === 's1299') {
            eSocialFiles.push(o);
          } else if (o.tipo === 'dctf') {
            dctfFiles.push(o);
          } else if (o.tipo === 'r2099') {
            ecdFiles.push(o);
          }
        }
      });
      sendStatus(0.17, `Filtragem concluída...
      Arquivos eSocial: ${eSocialFiles.length}
      Arquivos DCTF: ${dctfFiles.length}
      Arquivos ECD: ${ecdFiles.length}`);

      sendStatus(0.19, 'Importando dados da planilha...');

      const eSocial = eSocialFiles.length !== 0;
      const dctf = dctfFiles.length !== 0;
      const ecd = ecdFiles.length !== 0;

      getColsByName(['nomes', 'cnpjCpf', 'esocial', 'dctf', 'ecd'], comp)
        .then((cols) => {
          const [, cnpjCpfs, eSocialArr, dctfArr, ecdArr] = cols;

          const notes = [];

          sendStatus(0.25, 'Importação concluída...');
          const idsFiltrados = cnpjCpfs.map((v) => {
            if (v) return v.replace(/\./g, '').replace(/-/g, '');
            return '';
          });

          const passo = 0.5 / idsFiltrados.length;

          sendStatus(0.26, 'Cruzando informações...');
          idsFiltrados.forEach((id, i) => {
            let msg = '';
            const row = i + ROW_OFFSET;
            if (eSocial) {
              const now = eSocialFiles.find(o => o.cnpj === id.split('/')[0] || o.cpf === id);
              const cellId = `${eSocialCol}${row}`;
              if (now) {
                if (!now.ambienteProd) {
                  msg = msgErr(notes, cellId, `${now.fileName} em ambiente de testes!`, eSocialArr, i);
                } else if (now.comp.ano === comp.ano && now.comp.mes === comp.mes) {
                  checkEsocialSm(now, eSocialArr, i, notes, cellId);
                  msg = SPAN_GREEN(`${now.fileName} OK!`);
                } else {
                  msg = msgErr(notes, cellId, `${now.fileName} competência errada!`, eSocialArr, i);
                }
              } else eSocialArr[i] = '';
            }
            if (dctf) {
              const now = dctfFiles.find(o => o.cnpj === id.replace('/', ''));
              const cellId = `${dctfCol}${row}`;
              if (now) {
                if (now.comp.ano === comp.ano && now.comp.mes === comp.mes) {
                  dctfArr[i] = 'OK';
                  msg = SPAN_GREEN(`${now.fileName} OK!`);
                } else {
                  msg = msgErr(notes, cellId, `${now.fileName} competência errada!`, dctfArr, i);
                }
              } else dctfArr[i] = '';
            }
            if (ecd) {
              const now = ecdFiles.find(o => o.cnpj === id.split('/')[0] || o.cpf === id);
              const cellId = `${ecdCol}${row}`;
              if (now) {
                if (!now.ambienteProd) {
                  msg = msgErr(notes, cellId, `${now.fileName} em ambiente de testes!`, ecdArr, i);
                } else if (now.comp.ano === comp.ano && now.comp.mes === comp.mes) {
                  checkEcdSm(now, ecdArr, i, notes, cellId);
                  msg = SPAN_GREEN(`${now.fileName} OK!`);
                } else {
                  msg = msgErr(notes, cellId, `${now.fileName} competência errada!`, ecdArr, i);
                }
              } else ecdArr[i] = '';
            }

            sendStatus(0.26 + (passo * i), msg);
          });

          sendStatus(0.77, 'Cruzamento finalizado com sucesso...\nIniciando escrita...');

          const writePromises = [];

          clearNotesColorComp(comp).then(() => {
            if (eSocial) writePromises.push(writeColByDec('esocial', eSocialArr, comp));
            if (dctf) writePromises.push(writeColByDec('dctf', dctfArr, comp));
            if (ecd) writePromises.push(writeColByDec('ecd', ecdArr, comp));
            if (notes.length !== 0) writePromises.push(addNotesColor(notes, comp.ano));

            Promise.all(writePromises).then(() => {
              sendStatus(1, 'Processo finalizado com sucesso!');
              ipcRenderer.send('toMain', { op: 'end' });
            }).catch((errs) => {
              let msgs;
              if (Array.isArray(errs)) msgs = errs.map(o => o.message);
              else msgs = [errs.message];

              console.error(errs);
              sendStatus(0, LOG_ERR, msgs);
            });
          }).catch(err => console.error(err, sendStatus(0, LOG_ERR, [err.message])));
        }).catch((errs) => {
          let msgs;
          if (Array.isArray(errs)) msgs = errs.map(o => o.message);
          else msgs = [errs.message];
          console.error(errs);
          sendStatus(0, LOG_ERR, msgs);
        });
    }).catch(err => console.error(err, sendStatus(0, LOG_ERR, [err.message])));
  }
});
