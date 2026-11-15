// Page transitions can be cut short (e.g. clicking two links quickly). That's harmless,
// so keep it out of the console. Loaded early (not deferred) so it catches the first one.
(function () {
  const quiet = (t) => { if (t) ['ready', 'finished', 'updateCallbackDone'].forEach((k) => t[k] && t[k].catch(() => {})); };
  window.addEventListener('pageswap', (e) => quiet(e.viewTransition));
  window.addEventListener('pagereveal', (e) => quiet(e.viewTransition));
})();
