// Runs before the page paints so the saved (or system) theme applies without a flash.
// Kept as a file rather than inline so the Content-Security-Policy can forbid inline scripts.
try {
  var saved = JSON.parse(localStorage.getItem('mi-theme') || 'null');
  document.documentElement.dataset.theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch (e) {
  document.documentElement.dataset.theme = 'light';
}
