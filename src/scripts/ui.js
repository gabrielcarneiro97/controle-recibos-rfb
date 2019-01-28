/* global $ */
const { ipcRenderer } = require('electron');
const { Line } = require('progressbar.js');

$(document).ready(() => {
  $('select').formSelect();

  const bar = new Line('#bar', {
    color: '#26a69a',
    strokeWidth: 6,
    trailColor: '#b2dfdb',
    trailWidth: 6,
    svgStyle: { width: '100%', height: '100%', borderRadius: '2px' },
    text: {
      value: '0%',
    },
  });

  bar.text.style.color = 'white';
  bar.text.style.top = '36%';

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
      const { status: perc, msg, err } = data;
      bar.animate(perc, {
        duration: 100,
      }, () => {
        bar.text.innerText = `${(perc * 100).toFixed(0)}%`;
      });
      if (err) {
        err.forEach(d => console.error(d));
      }
      status.append(msg);
    } else if (op === 'end') {
      btn.removeAttr('disabled');
    }
  });
});