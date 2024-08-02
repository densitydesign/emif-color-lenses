const messages = require('./messages.json');
const languages = ['en', 'de'];

const getString = (lang, key) => {
  if (!(key in messages[lang])) console.error(`untranslated key in lang ${lang}: ${key}`);
  return messages[lang][key] ?? key;
}

const update = (lang) => {
  for (const el of Array.from(document.querySelectorAll('[data-i18n]'))) {
    el.innerText = getString(lang, el.dataset.i18n);
  }

  for (const el of Array.from(document.querySelectorAll('[data-i18n-alt]'))) {
    el.alt = getString(lang, el.dataset['i18nAlt']);
  }
};

module.exports = (select) => {
  for (const value of languages) {
    select.add(new Option(messages[value]['language-name'], value));
  }

  select.value = localStorage.density_lens_lang;
  if (!select.value) {
    for (const lang of navigator.languages) {
      const code = lang.toLowerCase().split('-').shift();
      if (languages.indexOf(code) > -1) {
        select.value = code;
        console.log('found', code);
        break;
      }
    }
  }
  if (!select.value) select.value = 'de';

  select.onchange = () => {
    update(select.value);
    localStorage.density_lens_lang = select.value;
  }
  update(select.value);
};