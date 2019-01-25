/* global $ */
const { ipcRenderer } = require('electron');
const { Line } = require('progressbar.js');

$(document).ready(() => {
  $('select').formSelect();

  const bar = new Line('#bar', {
    color: '#009688',
    strokeWidth: 6,
    trailColor: '#b2dfdb',
    trailWidth: 6,
    text: {
      value: '0%',
    },
  });

  bar.text.style.color = 'rgba(0,0,0,0.87)';

  const btn = $('#btn-atualizar');
  const selectMes = $('#mes');
  const selectAno = $('#ano');
  const status = $('#status');

  const comp = {
    mes: '',
    ano: '',
  };

  const checkBtn = () => {
    if (comp.mes !== '' && comp.ano !== '') {
      btn.removeAttr('disabled');
    } else btn.attr('disabled', true);
  };

  selectMes.change((e) => {
    comp.mes = e.target.value;
    checkBtn();
  });

  selectAno.change((e) => {
    comp.ano = e.target.value;
    checkBtn();
  });

  btn.click(() => {
    btn.attr('disabled', true);
    ipcRenderer.send('toProcessor', { op: 'start', data: { comp } });
    bar.animate(0, {
      duration: 100,
    }, () => {
      bar.text.innerText = '0%';
    });
    status.text('');
  });

  ipcRenderer.on('main', (e, { op, data }) => {
    if (op === 'progress') {
      const { status: perc, msg } = data;
      bar.animate(perc, {
        duration: 100,
      }, () => {
        bar.text.innerText = `${(perc * 100).toFixed(0)}%`;
      });
      status.append(msg);
    } else if (op === 'end') {
      btn.removeAttr('disabled');
    }
  });
});
