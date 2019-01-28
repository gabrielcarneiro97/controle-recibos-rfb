/* eslint no-underscore-dangle: 0 */

const fs = require('fs');
const path = require('path');
const { xml2js } = require('xml-js');

const { xmlFolder } = require('../../config.json');

const CONVERT_CONFIG = {
  compact: true,
};

function s1299Reader(obj, fileName) {
  return new Promise((resolve) => {
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

function r2099Reader(obj, fileName) {
  return new Promise((resolve) => {
    const { evtFechaEvPer: data } = obj.Reinf;
    console.log(data);
    const { ideEvento, ideContri, infoFech } = data;

    const arrComp = ideEvento.perApur._text.split('-');
    const idTipo = ideContri.tpInsc._text === '1' ? 'cnpj' : 'cpf';

    const end = {
      tipo: 'r2099',
      fileName,
      id: data._attributes.id,
      [idTipo]: ideContri.nrInsc._text,
      ambienteProd: ideEvento.tpAmb._text === '1',
      comp: {
        ano: arrComp[0],
        mes: arrComp[1],
      },
      fechamento: {
        evtServTm: infoFech.evtServTm._text === 'S',
        evtServPr: infoFech.evtServPr._text === 'S',
        evtAssDespRec: infoFech.evtAssDespRec._text === 'S',
        evtAssDespRep: infoFech.evtAssDespRep._text === 'S',
        evtComProd: infoFech.evtComProd._text === 'S',
        evtCPRB: infoFech.evtCPRB._text === 'S',
      },
    };
    resolve(end);
  });
}

function dctfReader(obj, fileName) {
  return new Promise((resolve) => {
    const data = obj.ProcDctf.ConteudoDeclaracao['tns1:DctfXml'];
    const infosGerais = data['A000-DadosIdentificadoresContribuinte'];

    const end = {
      tipo: 'dctf',
      fileName,
      id: obj.ProcDctf.ConteudoDeclaracao._attributes.id,
      cnpj: infosGerais.inscContrib._text,
      comp: {
        mes: infosGerais.perApuracao._text.substring(0, 2),
        ano: infosGerais.perApuracao._text.substring(2),
      },
    };

    resolve(end);
  });
}

function xmlReader(utfFile, fileName) {
  const obj = xml2js(utfFile, CONVERT_CONFIG);
  if (obj.eSocial) return s1299Reader(obj, fileName);
  else if (obj.ProcDctf) return dctfReader(obj, fileName);
  else if (obj.Reinf) return r2099Reader(obj, fileName);

  return new Promise((resolve, reject) => reject(new Error('Falha na leitura do arquivo')));
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
            xmlReader(data, fileName),
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
