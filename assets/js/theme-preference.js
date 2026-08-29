(() => {
  const toggle = document.getElementById('theme-preference-toggle');
  if (!toggle || !window.matchMedia) return;

  const systemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const savedTheme = () => {
    try {
      const theme = localStorage.getItem('pref-theme');
      return theme === 'light' || theme === 'dark' ? theme : null;
    } catch (_) {
      return null;
    }
  };
  const applyTheme = (theme) => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    toggle.checked = theme !== systemTheme();
  };

  applyTheme(savedTheme() || systemTheme());
  toggle.addEventListener('change', () => {
    const system = systemTheme();
    const theme = toggle.checked ? (system === 'dark' ? 'light' : 'dark') : system;
    applyTheme(theme);
    try {
      localStorage.setItem('pref-theme', theme);
    } catch (_) {}
  });
})();
