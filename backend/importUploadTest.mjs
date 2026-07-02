import('./src/routes/upload.js')
  .then(() => console.log('upload module OK'))
  .catch((e) => { console.error(e); process.exit(1); });
