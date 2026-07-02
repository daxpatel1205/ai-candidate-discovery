import { parseResume } from './src/services/parser.js';
import { analyzeFraud } from './src/services/fraud.js';
import path from 'path';

async function main() {
  const filePath = path.resolve('../mock_resume.txt');
  console.log('Parsing file:', filePath);
  const parsed = await parseResume(filePath, 'text/plain');
  
  const fraud = await analyzeFraud({
    resume_text: parsed.raw_text,
    structured: parsed.structured
  });
  
  console.log("=== Extracted Data ===");
  console.log(JSON.stringify(parsed.structured, null, 2));
  
  console.log("\n=== Fraud Analysis ===");
  console.log(JSON.stringify(fraud, null, 2));
}

main().catch(console.error);
