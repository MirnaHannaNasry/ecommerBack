// Works for Arabic and English names
module.exports = (text = '') =>
    String(text)
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
