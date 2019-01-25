const { ipcRenderer } = require('electron');
const { readComp } = require('./services/xml.service');

const { getColByName, writeColByDec } = require('./services/sheet.service');

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
    sendStatus(0, 'Inciando leitura de arquivos...<br>');
    readComp(comp).then((files) => {
      sendStatus(0.1, 'Leitura de arquivos concluída...<br>');

      sendStatus(0.15, 'Filtrando arquivos...<br>');
      const eSocialFiles = files.filter(o => o.tipo === 's1299');
      const dctfFiles = files.filter(o => o.tipo === 'dctf');
      const ecdFiles = files.filter(o => o.tipo === 'ecd');
      sendStatus(0.17, `Filtragem concluída...<br>
      Arquivos eSocial: ${eSocialFiles.length}<br>
      Arquivos DCTF: ${dctfFiles.length}<br>
      Arquivos ECD: ${ecdFiles.length}<br>`);

      sendStatus(0.19, 'Importando dados da planilha...<br>');

      const eSocial = eSocialFiles.length !== 0;
      const dctf = dctfFiles.length !== 0;
      const ecd = ecdFiles.length !== 0;

      const getPromises = [];

      getPromises.push(getColByName('nomes', comp.ano));
      getPromises.push(getColByName('cnpjCpf', comp.ano));

      Promise.all(getPromises).then(([nomes, cnpjCpfs]) => {
        sendStatus(0.25, 'Importação concluída...<br>');
        const idsFiltrados = cnpjCpfs.map((v) => {
          if (v) return v.replace(/\./g, '').replace(/-/g, '');
          return '';
        });

        const passo = 0.5 / idsFiltrados.length;

        const eSocialArr = [];
        const dctfArr = [];
        const ecdArr = [];

        sendStatus(0.26, 'Cruzando informações...<br>');
        idsFiltrados.forEach((id, i) => {
          if (eSocial) {
            const now = eSocialFiles.find(o => o.cnpj === id.split('/')[0] || o.cpf === id);
            if (now) eSocialArr[i] = now.fechamento.compSemMovto ? 'SM' : 'OK';
            else eSocialArr[i] = '';
          }
          if (dctf) {

          }
          if (ecd) {

          }

          sendStatus(0.26 + (passo * i));
        });

        sendStatus(0.77, 'Cruzamento finalizado com sucesso...<br>Iniciando escrita...<br>');

        const writePromises = [];

        if (eSocial) writePromises.push(writeColByDec('esocial', eSocialArr, comp));
        if (dctf) writePromises.push(writeColByDec('dctf', dctfArr, comp));
        if (ecd) writePromises.push(writeColByDec('ecd', ecdArr, comp));

        Promise.all(writePromises).then(() => {
          sendStatus(1, 'Processo finalizado com sucesso!<br>');
          ipcRenderer.send('toMain', { op: 'end' });
        }).catch(errs => sendStatus(0, 'Erro!', errs));
      }).catch(errs => sendStatus(0, 'Erro!', errs));
    }).catch(err => sendStatus(0, 'Erro!', err));
  }
});
