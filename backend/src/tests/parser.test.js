import { describe, expect, it } from 'vitest';
import { normalizeText, extractEmail, extractPhone, extractSkills, extractExperience, extractEducation, extractSummary } from '../services/parser.js';

const sample = `John Doe\nEmail: john@example.com\nPhone: +1 (555) 123-4567\nExperience: 5 years in software development\nSkills: JavaScript, React, Node.js\nUniversity of Technology`;

describe('parser service helpers', () => {
  it('normalizes text correctly', () => {
    expect(normalizeText('Hello  \n  World')).toBe('Hello \n World');
  });

  it('extracts email and phone', () => {
    expect(extractEmail(sample)).toBe('john@example.com');
    expect(extractPhone(sample)).toBe('+1 (555) 123-4567');
  });

  it('extracts skills and experience', () => {
    expect(extractSkills(sample)).toContain('javascript');
    expect(extractExperience(sample)).toBe(5);
  });

  it('extracts education and summary', () => {
    expect(extractEducation(sample).length).toBeGreaterThan(0);
    expect(extractSummary(sample)).toContain('John Doe');
  });
});
