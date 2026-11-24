// Developer Atasoge Software 2026
// simpan file ini dengan nama : script.js

// 1. Data dan format waktu perangkat
const el = id => document.getElementById(id);
const storageKey = 'kalender-alarm-pagi-v1';
const fullDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' });
const monthDate = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const pad = number => String(number).padStart(2, '0');
const dateKey = date => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
const showStatus = message => { el('status').textContent = message; };
let selected = new Date();
let alarms = {};
let displayedDay, lastAlarm, audio, soundTimer;

try {
  alarms = JSON.parse(localStorage.getItem(storageKey)) || {};
} catch {
  showStatus('Jadwal tersimpan tidak dapat dibaca.');
}

// 2. Kalender dan formulir
function render() {
  const calendar = el('calendar');
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const selectedKey = dateKey(selected);
  const today = dateKey(new Date());

  el('month').textContent = monthDate.format(first);
  el('selected-date').textContent = fullDate.format(selected);
  el('alarm-time').value = alarms[selectedKey] || '06:00';
  el('remove').hidden = !alarms[selectedKey];
  calendar.innerHTML = 'Sen Sel Rab Kam Jum Sab Min'.split(' ')
    .map(day => '<span class="dayname">' + day + '</span>').join('');

  for (let i = 0; i < (first.getDay() + 6) % 7; i++) calendar.append(document.createElement('span'));

  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const button = document.createElement('button');
    button.textContent = day;
    button.className = alarms[key] ? 'day has-alarm' : 'day';
    button.setAttribute('aria-label', fullDate.format(date) + (alarms[key] ? ', alarm ' + alarms[key] : ''));
    button.setAttribute('aria-pressed', key === selectedKey);
    if (key === today) button.setAttribute('aria-current', 'date');
    button.onclick = () => {
      selectDate(date);
      calendar.querySelector('[aria-pressed="true"]').focus();
    };
    calendar.append(button);
  }
}

function selectDate(date) {
  selected = date;
  render();
  showStatus('');
}

function saveSchedule() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(alarms));
    return true;
  } catch {
    return false;
  }
}

// 3. Bunyi dan pemeriksaan alarm
async function enableSound() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    return audio.state === 'running';
  } catch {
    return false;
  }
}

function beep() {
  if (audio?.state !== 'running') return;
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  const start = audio.currentTime;
  tone.frequency.value = 784;
  volume.gain.setValueAtTime(0.18, start);
  volume.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
  tone.connect(volume).connect(audio.destination);
  tone.start(start);
  tone.stop(start + 0.5);
}

function tick() {
  const now = new Date();
  const today = dateKey(now);
  const time = [now.getHours(), now.getMinutes()].map(pad).join(':');
  el('clock').textContent = time + ':' + pad(now.getSeconds());

  if (today !== displayedDay) {
    el('today-date').textContent = fullDate.format(now);
    if (displayedDay) render();
    displayedDay = today;
  }

  const occurrence = today + 'T' + time;
  if (alarms[today] !== time || lastAlarm === occurrence) return;

  lastAlarm = occurrence;
  el('ring-details').textContent = fullDate.format(now) + ' · ' + time;
  if (!el('ring').open) el('ring').showModal();
  clearInterval(soundTimer);
  beep();
  soundTimer = setInterval(beep, 1800);
}

// 4. Tombol dan awal program
el('prev').onclick = () => selectDate(new Date(selected.getFullYear(), selected.getMonth() - 1, 1));
el('next').onclick = () => selectDate(new Date(selected.getFullYear(), selected.getMonth() + 1, 1));
el('today').onclick = () => selectDate(new Date());

el('alarm-form').onsubmit = async event => {
  event.preventDefault();
  const key = dateKey(selected);
  const time = el('alarm-time').value;
  if (!time || new Date(key + 'T' + time) <= new Date()) {
    showStatus('Pilih tanggal dan jam yang akan datang.');
    return;
  }

  const soundReady = enableSound();
  alarms[key] = time;
  const saved = saveSchedule();
  render();
  showStatus((saved ? 'Alarm tersimpan pukul ' : 'Alarm aktif untuk sesi ini pukul ') + time + '.' +
    (await soundReady ? '' : ' Klik Tes suara untuk mengaktifkan bunyi.'));
};

el('remove').onclick = () => {
  delete alarms[dateKey(selected)];
  showStatus(saveSchedule() ? 'Alarm dihapus.' : 'Alarm dihapus untuk sesi ini.');
  render();
};
el('test').onclick = async () => {
  const ready = await enableSound();
  beep();
  showStatus(ready ? 'Suara alarm aktif.' : 'Suara belum bisa diputar.');
};
el('stop').onclick = () => el('ring').close();
el('ring').addEventListener('close', () => clearInterval(soundTimer));

render();
tick();
setInterval(tick, 500);
