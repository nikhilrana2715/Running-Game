// Give the game keyboard focus as soon as the popup opens.
const f = document.querySelector('iframe');
f.addEventListener('load', () => f.contentWindow.focus());
