let editor;
let currentFile = null;

require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '',
    language: 'javascript',
    theme: 'vs-dark',
  });
  refreshFileList();
});

document.getElementById('saveBtn').addEventListener('click', saveFile);
document.getElementById('loadBtn').addEventListener('click', loadFile);
document.getElementById('deleteBtn').addEventListener('click', deleteFile);
document.getElementById('changeLangBtn').addEventListener('click', changeLanguage);

function saveFile() {
  const name = getFilename();
  if (!name) return;
  const content = editor.getValue();
  const lang = editor.getModel().getLanguageId();
  localStorage.setItem(`codevault-${name}`, JSON.stringify({ content, lang }));
  currentFile = name;
  refreshFileList();
}

function loadFile() {
  const name = getFilename();
  const data = localStorage.getItem(`codevault-${name}`);
  if (!data) return alert('File not found');
  const file = JSON.parse(data);
  const model = monaco.editor.createModel(file.content, file.lang);
  editor.setModel(model);
  currentFile = name;
  document.getElementById('language').value = file.lang;
}

function deleteFile() {
  const name = getFilename();
  if (!name) return;
  localStorage.removeItem(`codevault-${name}`);
  if (currentFile === name) {
    editor.setValue('');
    currentFile = null;
  }
  refreshFileList();
}

function changeLanguage() {
  const lang = document.getElementById('language').value;
  const content = editor.getValue();
  const model = monaco.editor.createModel(content, lang);
  editor.setModel(model);
}

function refreshFileList() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  Object.keys(localStorage)
    .filter(key => key.startsWith('codevault-'))
    .forEach(key => {
      const name = key.replace('codevault-', '');
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `<span>${name}</span> <button onclick="loadNamedFile('${name}')">Open</button>`;
      list.appendChild(item);
    });
}

window.loadNamedFile = function(name) {
  document.getElementById('filename').value = name;
  loadFile();
};

function getFilename() {
  return document.getElementById('filename').value.trim();
}
