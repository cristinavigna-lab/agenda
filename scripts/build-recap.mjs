// Genera il recap settimanale (HTML email) leggendo data.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const COLORS = { alta: '#ff6b6b', media: '#ffd166', bassa: '#6ee7a0' };
const ICONS = { alta: '🔴', media: '🟡', bassa: '🟢' };

const data = existsSync('data.json') ? JSON.parse(readFileSync('data.json', 'utf8')) : { todos: [], days: {} };
const pOrder = { alta: 0, media: 1, bassa: 2 };
const todos = (data.todos || []).filter(t => !t.done).sort((a, b) => pOrder[a.pri] - pOrder[b.pri]);

// --- messaggio motivazionale auto-generato (combinatorio, diverso ogni settimana) ---
const GEN = {
  aperture: [
    'Nuova settimana, foglio bianco:', 'Oggi si riparte:', 'Lunedì è il tuo alleato:',
    'Sette giorni davanti a te:', 'Questa settimana conta:', 'Riprendi il ritmo:',
    'Un passo alla volta:', 'La costanza batte il talento:', 'Piccole vittorie, grandi risultati:'
  ],
  nuclei: [
    'ogni passo che segni, ogni sigaretta in meno, ogni ora di sonno in più è un mattone del te futuro',
    'non devi fare tutto, devi solo fare la prossima cosa sulla lista',
    'la disciplina è scegliere ciò che vuoi di più rispetto a ciò che vuoi adesso',
    'le cose difficili fatte per prime rendono leggero tutto il resto',
    'stai costruendo abitudini, non solo completando compiti',
    'il corpo che alleni e i progetti che porti avanti sono la stessa cosa: investimenti su di te',
    'chi misura migliora: i numeri che segni ogni giorno sono già metà del lavoro',
    'la motivazione ti fa iniziare, l’abitudine ti fa continuare'
  ],
  chiusure: [
    'Parti dalla cosa rossa più importante, adesso. 💪',
    'Il te stesso di dicembre ti ringrazierà. 🚀',
    'Una spunta oggi vale più di dieci propositi. ✅',
    'Fai che stasera tu possa dirti: fatto. 🔥',
    'Ricorda perché hai iniziato. 🌱',
    'Vinci la mattinata e vincerai la giornata. ☀️'
  ]
};
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const week = Math.floor(Date.now() / (7 * 86400000));
const rnd = mulberry(week * 7919);
const pick = a => a[Math.floor(rnd() * a.length)];
const motiv = `${pick(GEN.aperture)} ${pick(GEN.nuclei)}. ${pick(GEN.chiusure)}`;

// --- riepilogo tracker ultima settimana ---
function avg(field) {
  const vals = Object.values(data.days || {}).slice(-7).map(d => parseFloat(d[field])).filter(n => !isNaN(n));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
}
const stats = [
  ['👣 Passi medi', avg('passi')], ['😴 Sonno medio (h)', avg('sonno')],
  ['🍽️ Calorie cibo', avg('calin')], ['🔥 Calorie movimento', avg('calout')],
  ['🚬 Sigarette/giorno', avg('sig')]
].filter(([, v]) => v !== null);

// --- consigli ordine ---
const nAlta = todos.filter(t => t.pri === 'alta').length;
const nMedia = todos.filter(t => t.pri === 'media').length;
const advice = [];
if (nAlta) advice.push(`🔴 Inizia dalle <b>${nAlta} cose ad alta priorità</b>: falle lunedì e martedì mattina, quando hai più energia.`);
if (nMedia) advice.push(`🟡 Le ${nMedia} a media priorità distribuiscile a metà settimana, una o due al giorno.`);
advice.push('🟢 Le verdi sono jolly: incastrale nei momenti liberi o spostale senza sensi di colpa.');
advice.push('⏱️ Regola d’oro: la cosa più importante falla per prima, prima che la giornata decida per te.');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const todoRow = t => `
  <tr><td style="padding:8px 12px;border-left:5px solid ${COLORS[t.pri]};background:#f6f6fb;border-radius:6px">
    ${ICONS[t.pri]} <b>${esc(t.txt)}</b>
    ${t.day !== '' && t.day !== undefined ? `<span style="color:#888;font-size:12px"> — ${DAYS[t.day]}</span>` : ''}
  </td></tr><tr><td style="height:6px"></td></tr>`;

const html = `
<div style="font-family:Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#222">
  <h2 style="color:#7c6cf0">📋 La tua settimana — ${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</h2>
  <div style="background:linear-gradient(135deg,#3b2f7a,#1f4d4a);color:#fff;padding:16px;border-radius:12px;line-height:1.5">
    <b style="color:#4ecdc4">💪 Messaggio della settimana</b><br>${esc(motiv)}
  </div>
  <h3 style="margin-top:24px">Cose da fare, dalla più importante</h3>
  <table cellspacing="0" cellpadding="0" style="width:100%">
    ${todos.length ? todos.map(todoRow).join('') : '<tr><td style="color:#888;font-style:italic">Lista vuota: apri l’app e pianifica la settimana! 🎉</td></tr>'}
  </table>
  <h3 style="margin-top:20px">Consigli sull'ordine</h3>
  <p style="line-height:1.7">${advice.join('<br>')}</p>
  ${stats.length ? `<h3>📈 La tua ultima settimana in numeri</h3>
  <p style="line-height:1.7">${stats.map(([l, v]) => `${l}: <b>${v}</b>`).join(' · ')}</p>` : ''}
  <p style="color:#888;font-size:12px;margin-top:28px">Email automatica della tua agenda personale — ogni lunedì mattina.</p>
</div>`;

writeFileSync('email.html', html);
console.log(`Recap generato: ${todos.length} cose da fare (${nAlta} alta priorità).`);
