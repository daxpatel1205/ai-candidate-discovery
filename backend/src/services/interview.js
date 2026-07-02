import { generateJson } from './gemini.js';

const fallbacks = {
  technical: [
    'Describe a challenging technical problem you solved and the steps you took.',
    'How do you structure a React application for scalability and maintainability?',
    'Explain your approach to debugging a race condition in production.',
  ],
  behavioral: [
    'Tell me about a time you had to influence a team decision without formal authority.',
    'How do you prioritize multiple competing deadlines?',
    'Describe a time when you received constructive feedback and how you responded.',
  ],
  situational: [
    'How would you handle a stakeholder who keeps changing feature requirements?',
    'If a project is falling behind schedule, what is your first action?',
    'How do you ensure quality while delivering work quickly?',
  ],
};

export async function generateInterviewQuestions({ candidate, job, difficulty, count, categories, language, topic }) {
  const summary = candidate.summary || `${candidate.name} has experience with ${candidate.skills?.slice(0, 5).join(', ') || 'multiple technologies'}.`;
  const prompt = `Create ${count} interview questions for a ${difficulty} difficulty level.
${topic ? `The primary focus / topic of these questions must be: ${topic}.` : ''}
Candidate summary: ${summary}
Skills: ${(candidate.skills || []).join(', ')}
Experience years: ${candidate.experience_years || 'unknown'}
Job: ${job ? `${job.title} - ${job.description}` : 'General candidate profile.'}
Categories: ${categories.join(', ')}
Language: ${language}

Return JSON: { "questions": [ { "id": 1, "category": "technical|behavioral|situational", "question": "...", "follow_ups": ["..."], "evaluation_criteria": ["..."], "difficulty": "${difficulty}" } ] }`;

  const fallback = {
    questions: categories.flatMap((category) => {
      const bucket = fallbacks[category] || fallbacks.technical;
      return bucket.slice(0, Math.ceil(count / categories.length)).map((question, index) => ({
        id: category.charCodeAt(0) * 100 + index,
        category,
        question: topic ? `[${topic}] ${question}` : question,
        follow_ups: ['Why did you choose that approach?', 'How would you improve your solution?'],
        evaluation_criteria: ['Technical clarity', 'Domain knowledge', 'Communication'],
        difficulty,
      }));
    }).slice(0, count),
  };

  const result = await generateJson(prompt, fallback, { maxTokens: 450 });
  return {
    questions: result.questions?.slice(0, count) || fallback.questions.slice(0, count),
    summary: result.summary || `Interview questions generated for ${candidate.name}${topic ? ` focused on ${topic}` : ''}.`,
    recommended_duration_minutes: result.recommended_duration_minutes || Math.max(20, Math.min(90, count * 5)),
  };
}
