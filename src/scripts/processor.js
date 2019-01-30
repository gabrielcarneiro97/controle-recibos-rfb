const { ipcRenderer } = require('electron');
const { readComp } = require('./services/xml.service');

const { writeColByDec, getColsByName /* , updateCellsColor, ntol  */} = require('./services/sheet.service');

const { primDataRow } = require('../sheetInfos.json').dataRowLoc;

const ROW_OFFSET = parseInt(primDataRow, 10);

function br(str) {
  return `${str}<br>`;
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
        msg,
        err,
      },
    });
}

ipcRenderer.on('main', (e, { op, data }) => {
  if (op === 'start') {
    const { comp } = data;
    sendStatus(0, br('Inciando leitura de arquivos...'));
    readComp(comp).then((files) => {
      sendStatus(0.1, br('Leitura de arquivos concluída...'));

      sendStatus(0.15, br('Filtrando arquivos...'));
      const eSocialFiles = [];
      const dctfFiles = [];
      const ecdFiles = [];

      files.forEach((o) => {
        if (o.tipo === 's1299') {
          eSocialFiles.push(o);
        } else if (o.tipo === 'dctf') {
          dctfFiles.push(o);
        } else if (o.tipo === 'r2099') {
          ecdFiles.push(o);
        }
      });
      sendStatus(0.17, br('Filtragem concluída...') +
      br(`Arquivos eSocial: ${eSocialFiles.length}`) +
      br(`Arquivos DCTF: ${dctfFiles.length}`) +
      br(`Arquivos ECD: ${ecdFiles.length}`));

      sendStatus(0.19, br('Importando dados da planilha...'));

      const eSocial = eSocialFiles.length !== 0;
      const dctf = dctfFiles.length !== 0;
      const ecd = ecdFiles.length !== 0;

      getColsByName(['nomes', 'cnpjCpf', 'esocial', 'dctf', 'ecd'], comp)
        .then((cols) => {
          const [, cnpjCpfs, eSocialArr, dctfArr, ecdArr] = cols;

          sendStatus(0.25, br('Importação concluída...'));
          const idsFiltrados = cnpjCpfs.map((v) => {
            if (v) return v.replace(/\./g, '').replace(/-/g, '');
            return '';
          });

          const passo = 0.5 / idsFiltrados.length;

          sendStatus(0.26, br('Cruzando informações...'));
          idsFiltrados.forEach((id, i) => {
            let msg = '';
            if (eSocial) {
              const now = eSocialFiles.find(o => o.cnpj === id.split('/')[0] || o.cpf === id);
              if (now) {
                if (now.comp.ano === comp.ano && now.comp.mes === comp.mes) {
                  eSocialArr[i] = now.fechamento.compSemMovto ? 'SM' : 'OK';
                  msg = SPAN_GREEN(`${now.fileName} OK!`);
                } else {
                  eSocialArr[i] = now.fechamento.compSemMovto ? `SM CompErr ${now.fileName}` : `OK CompErr ${now.fileName}`;

                  msg = SPAN_RED(`${now.fileName} competência errada!`);
                }
              } else if (!eSocialArr[i]) eSocialArr[i] = '';
            }
            if (dctf) {
              const now = dctfFiles.find(o => o.cnpj === id.replace('/', ''));
              if (now) {
                if (now.comp.ano === comp.ano && now.comp.mes === comp.mes) {
                  dctfArr[i] = 'OK';
                  msg = SPAN_GREEN(`${now.fileName} OK!`);
                } else {
                  dctfArr[i] = `OK CompErr ${now.fileName}`;

                  console.log(i + ROW_OFFSET);

                  msg = SPAN_RED(`${now.fileName} competência errada!`);
                }
              } else if (!dctfArr[i]) dctfArr[i] = '';
            }
            if (ecd) {
              const now = ecdFiles.find(o => o.cnpj === id.split('/')[0] || o.cpf === id);
              if (now) {
                if (now.comp.ano === comp.ano && now.comp.mes === comp.mes) {
                  ecdArr[i] = 'OK';
                  msg = SPAN_GREEN(`${now.fileName} OK!`);
                } else {
                  ecdArr[i] = `OK CompErr ${now.fileName}`;

                  msg = SPAN_RED(`${now.fileName} competência errada!`);
                }
              } else if (!ecdArr[i]) ecdArr[i] = '';
            }

            sendStatus(0.26 + (passo * i), msg);
          });

          sendStatus(0.77, br('Cruzamento finalizado com sucesso...') + br('Iniciando escrita...'));

          const writePromises = [];

          if (eSocial) writePromises.push(writeColByDec('esocial', eSocialArr, comp));
          if (dctf) writePromises.push(writeColByDec('dctf', dctfArr, comp));
          if (ecd) writePromises.push(writeColByDec('ecd', ecdArr, comp));

          Promise.all(writePromises).then(() => {
            sendStatus(1, br('Processo finalizado com sucesso!'));
            ipcRenderer.send('toMain', { op: 'end' });
          }).catch((errs) => {
            let msgs;
            if (Array.isArray(errs)) msgs = errs.map(o => o.message);
            else msgs = [errs.message];
            sendStatus(0, LOG_ERR, msgs);
          });
        }).catch((errs) => {
          let msgs;
          if (Array.isArray(errs)) msgs = errs.map(o => o.message);
          else msgs = [errs.message];
          sendStatus(0, LOG_ERR, msgs);
        });
    }).catch(err => sendStatus(0, LOG_ERR, [err.message]));
  }
});
