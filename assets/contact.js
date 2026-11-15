// Contact page: checks the message, then saves it through the database's
// submit_contact_message function (which checks everything again).
(function () {
  const { api, busy } = window.HJ;
  const form = document.getElementById('contactForm');
  const done = document.getElementById('contactDone');
  const errorEl = document.getElementById('contactError');
  const message = form.elements.message;
  const count = document.getElementById('cCount');
  const MAX = 1000;

  // Live character count under the message box
  function updateCount() {
    const n = message.value.length;
    count.textContent = `${n} of ${MAX} characters`;
    count.classList.toggle('near', n > MAX - 100);
  }
  message.addEventListener('input', updateCount);

  function fail(text, fields = []) {
    errorEl.textContent = text;
    errorEl.hidden = false;
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    fields.forEach((el) => el.setAttribute('aria-invalid', 'true'));
    (fields[0] || errorEl).focus();
  }

  form.addEventListener('input', (e) => { if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const topic = String(data.get('topic') || '');
    const text = String(data.get('message') || '').trim();

    // A filled-in spam trap means a bot: pretend it worked and save nothing.
    if (data.get('website')) { showDone(name, '—'); return; }

    const problems = [];
    const bad = [];
    if (!name) { problems.push('your name'); bad.push(form.elements.name); }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { problems.push('a valid email address'); bad.push(form.elements.email); }
    if (!topic) { problems.push('what it’s about'); bad.push(form.elements.topic); }
    if (text.length < 10) { problems.push('a message of at least 10 characters'); bad.push(message); }
    if (problems.length) { fail(`Please add ${problems.join(', ')}.`, bad); return; }

    const btn = form.querySelector('[type="submit"]');
    busy(btn, true, 'Sending…');
    errorEl.hidden = true;
    try {
      const r = await api('/rest/v1/rpc/submit_contact_message', {
        method: 'POST',
        body: JSON.stringify({ p_name: name, p_email: email, p_topic: topic, p_message: text }),
      });
      showDone(name, r.reference);
    } catch (err) {
      console.error('Message failed', err);
      fail(err.status === 400 && err.message ? err.message : 'We couldn’t send your message. Check your connection and try again.');
    } finally {
      busy(btn, false);
    }
  });

  function showDone(name, reference) {
    document.getElementById('contactRef').textContent = reference;
    document.getElementById('contactText').textContent = `Thanks, ${name || 'friend'}. Your message has been saved.`;
    form.hidden = true;
    done.hidden = false;
    done.querySelector('h2').focus();
  }

  document.getElementById('contactAnother').addEventListener('click', () => {
    form.reset();
    updateCount();
    form.hidden = false;
    done.hidden = true;
    form.elements.name.focus();
  });
})();
