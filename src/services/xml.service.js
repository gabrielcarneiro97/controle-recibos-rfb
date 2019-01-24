/* eslint no-underscore-dangle: 0 */

const fs = require('fs');
const path = require('path');
const { xml2js } = require('xml-js');

const { xmlFolder } = require('../../config.json');

const CONVERT_CONFIG = {
  compact: true,
};

function s1299Reader(utfFile, fileName) {
  return new Promise((resolve) => {
    const obj = xml2js(utfFile, CONVERT_CONFIG);
    const { evtFechaEvPer: data } = obj.eSocial;
    const { ideEvento, ideEmpregador, infoFech } = data;

    const arrComp = ideEvento.perApur._text.split('-');
    const idTipo = ideEmpregador.tpInsc._text === '1' ? 'cnpj' : 'cpf';

    const end = {
      tipo: 's1299',
      fileName,
      id: data._attributes.Id,
      [idTipo]: ideEmpregador.nrInsc._text,
      ambienteProd: ideEvento.tpAmb._text === '1',
      comp: {
        eh13: ideEvento.indApuracao._text === '2',
        ano: arrComp[0],
        mes: arrComp[1],
      },
      fechamento: {
        evtRemun: infoFech.evtRemun._text === 'S',
        evtPgtos: infoFech.evtPgtos._text === 'S',
        evtAqProd: infoFech.evtAqProd._text === 'S',
        evtComProd: infoFech.evtComProd._text === 'S',
        evtContratAvNP: infoFech.evtContratAvNP._text === 'S',
        evtInfoComplPer: infoFech.evtInfoComplPer._text === 'S',
        compSemMovto: !!infoFech.compSemMovto,
      },
    };
    resolve(end);
  });
}

function readComp(comp) {
  return new Promise((resolve, reject) => {
    const folder = path.join(xmlFolder, comp.ano, comp.mes);
    fs.readdir(folder, (readdirErr, files) => {
      if (readdirErr) {
        reject(readdirErr);
      } else {
        const promises = [];
        files.forEach((fileName) => {
          const data = fs.readFileSync(path.join(folder, fileName), 'utf8');
          promises.push(
            s1299Reader(data, fileName),
          );
        });

        Promise.all(promises).then(objs => resolve(objs));
      }
    });
  });
}

module.exports = {
  readComp,
};
