// Book page: saves a table booking through the database's create_reservation function.
(function () {
  const { api, cafeNow, hoursFor, dayNameOf, toMinutes, formatTime } = window.HJ;
  const form = document.getElementById('bookForm');
  const done = document.getElementById('bookDone');
  const errorEl = document.getElementById('bookError');
  const date = document.getElementById('bDate');
  const time = document.getElementById('bTime');

  const today = cafeNow().date;
  date.min = today;
  const max = new Date(today + 'T12:00:00Z'); max.setUTCDate(max.getUTCDate() + 60);
  date.max = max.toISOString().slice(0, 10);

  function fillTimes(preferred) {
    if (!date.value) { time.innerHTML = '<option value="">Choose a date first</option>'; return; }
    const h = hoursFor(dayNameOf(date.value));
    const now = cafeNow();
    const opts = ['<option value="">Choose a time</option>'];
    for (let m = toMinutes(h.open); m <= toMinutes(h.close) - 30; m += 30) {
      if (date.value === now.date && m <= now.minutes) continue;
      const v = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      opts.push(`<option value="${v}">${formatTime(m)}</option>`);
    }
    if (opts.length === 1) opts[0] = '<option value="">No times left that day</option>';
    time.innerHTML = opts.join('');
    if (preferred && [...time.options].some((o) => o.value === preferred)) time.value = preferred;
  }
  date.addEventListener('change', () => fillTimes());

  function fail(message, fields = []) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    fields.forEach((el) => el.setAttribute('aria-invalid', 'true'));
    (fields[0] || errorEl).focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const missing = [];
    const bad = [];
    if (!name) { missing.push('your name'); bad.push(form.elements.name); }
    if (!phone) { missing.push('a phone number'); bad.push(form.elements.phone); }
    if (!date.value) { missing.push('a date'); bad.push(date); }
    if (!time.value) { missing.push('a time'); bad.push(time); }
    if (missing.length) { fail(`Please add ${missing.join(', ')}.`, bad); return; }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Booking…'; errorEl.hidden = true;
    try {
      const r = await api('/rest/v1/rpc/create_reservation', {
        method: 'POST',
        body: JSON.stringify({
          p_name: name, p_phone: phone, p_date: date.value, p_time: time.value,
          p_guests: data.get('guests'), p_notes: String(data.get('notes') || '').trim() || null,
        }),
      });
      const nice = new Date(date.value + 'T12:00:00Z').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
      document.getElementById('doneRef').textContent = r.reference;
      document.getElementById('doneText').textContent =
        `Table for ${r.guests} on ${nice} at ${r.time.toLowerCase().replace(' ', '')}, under the name ${name}.`;
      form.hidden = true;
      done.hidden = false;
      done.querySelector('h2').focus();
    } catch (err) {
      console.error('Booking failed', err);
      fail(err.status === 400 && err.message ? err.message : 'We couldn’t save your booking. Check your connection and try again.');
    } finally {
      btn.disabled = false; btn.textContent = 'Book table';
    }
  });

  document.getElementById('bookAnother').addEventListener('click', () => {
    form.reset(); fillTimes(); form.hidden = false; done.hidden = true; form.elements.name.focus();
  });
})();
