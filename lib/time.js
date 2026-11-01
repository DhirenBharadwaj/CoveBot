// Week maths in the server's timezone (Monday 00:00 -> next Monday 00:00), no dependencies.
const TZ = process.env.TIMEZONE || 'UTC';
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
});
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parts(ts) {
  const o = {};
  for (const p of fmt.formatToParts(new Date(ts))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, wd: DAYS.indexOf(o.weekday) };
}
function offsetAt(ts) {
  const p = parts(ts);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}
function localMidnight(y, m, d) {
  const t = Date.UTC(y, m - 1, d);
  const guess = t - offsetAt(t);
  return t - offsetAt(guess);
}
function weekStart(ts) {
  const p = parts(ts);
  const mon = new Date(Date.UTC(p.y, p.m - 1, p.d - p.wd));
  return localMidnight(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate());
}
function weekEnd(ts) {
  const p = parts(weekStart(ts));
  const next = new Date(Date.UTC(p.y, p.m - 1, p.d + 7));
  return localMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}
function weekKey(ts) {
  const p = parts(weekStart(ts));
  const thu = Date.UTC(p.y, p.m - 1, p.d + 3);
  const iy = new Date(thu).getUTCFullYear();
  const wn = Math.ceil(((thu - Date.UTC(iy, 0, 1)) / 864e5 + 1) / 7);
  return `${iy}-W${String(wn).padStart(2, '0')}`;
}
module.exports = { weekStart, weekEnd, weekKey };
