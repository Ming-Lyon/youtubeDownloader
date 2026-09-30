const socket = io();
const form = document.querySelector('#form');
const subs = document.querySelector('#subtitles');
const langsWrap = document.querySelector('#langsWrap');
const panel = document.querySelector('#panel');
const bar = document.querySelector('#bar');
const status = document.querySelector('#status');
const logs = document.querySelector('#logs');
const button = form.querySelector('button');
subs.addEventListener('change', () => langsWrap.hidden = !subs.checked);

form.addEventListener('submit', async e => {
  e.preventDefault();
  panel.hidden = false; bar.style.width = '0%'; logs.textContent = '';
  status.textContent = 'Validation…'; button.disabled = true;
  try {
    const response = await fetch('/api/download', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: document.querySelector('#url').value,
        quality: document.querySelector('#quality').value,
        subtitles: subs.checked,
        subtitleLangs: document.querySelector('#subtitleLangs').value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur serveur');
    socket.emit('watch', data.jobId);
  } catch (err) { status.textContent = `Erreur : ${err.message}`; button.disabled = false; }
});

socket.on('status', d => { if (d.message) status.textContent = d.message; });
socket.on('progress', d => {
  const p = Number.isFinite(d.percent) ? d.percent : 0;
  bar.style.width = `${p}%`;
  status.textContent = `${p.toFixed(1)} % • ${d.speed || '...'} • reste ${d.eta || '...'}`;
});
socket.on('log', d => { logs.textContent = `${d.message}\n${logs.textContent}`.slice(0, 5000); });
socket.on('complete', d => {
  bar.style.width = '100%'; status.textContent = `Terminé : ${d.filename}`; button.disabled = false;
});
socket.on('failed', d => { status.textContent = `Échec : ${d.error}`; button.disabled = false; });
