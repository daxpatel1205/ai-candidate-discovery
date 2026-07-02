const deps = [
  './src/models/Resume.js',
  './src/models/Candidate.js',
  './src/services/parser.js',
  './src/services/gemini.js',
  './src/services/fraud.js',
  './src/services/i18n.js',
  './src/services/insights.js'
];

(async () => {
  for (const d of deps) {
    try {
      await import(d);
      console.log(`${d} OK`);
    } catch (e) {
      console.error(`${d} ERROR`);
      console.error(e);
      process.exit(1);
    }
  }
  console.log('All deps imported OK');
})();
