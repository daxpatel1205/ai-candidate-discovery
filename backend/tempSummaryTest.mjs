import { extractSummary } from './src/services/parser.js';
const sample = `John Doe
Email: john@example.com
Phone: +1 (555) 123-4567
Experience: 5 years in software development
Skills: JavaScript, React, Node.js
University of Technology`;
console.log(JSON.stringify(extractSummary(sample)));
console.log(extractSummary(sample));
