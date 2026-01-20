import '@testing-library/jest-dom/vitest';

// Polyfill for HTMLDialogElement (not supported in jsdom)
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.style.display = 'block';
  };
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.style.display = 'none';
  };
}
