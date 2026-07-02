import { describe, expect, it } from 'vitest';
import { parseRssXml, normalizeCompanyName, normalizeJobTitle } from '../services/liveJobsSync.js';

// ─── RSS Parser Tests ─────────────────────────────────────────────────────────
describe('parseRssXml', () => {
  it('parses standard RSS item tags', () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>Senior React Developer</title>
            <link>https://remoteok.com/jobs/101</link>
            <description>Build awesome React apps.</description>
            <pubDate>Mon, 29 Jun 2026 00:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>`;

    const items = parseRssXml(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Senior React Developer');
    expect(items[0].link).toBe('https://remoteok.com/jobs/101');
    expect(items[0].description).toBe('Build awesome React apps.');
  });

  it('parses CDATA wrapped content', () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA[Backend Engineer: Python & AWS]]></title>
            <link><![CDATA[https://jobs.example.com/201]]></link>
            <description><![CDATA[We are building <b>scalable</b> systems.]]></description>
          </item>
        </channel>
      </rss>`;

    const items = parseRssXml(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Backend Engineer: Python & AWS');
    expect(items[0].description).toContain('We are building');
  });

  it('returns empty array for empty input', () => {
    expect(parseRssXml('')).toHaveLength(0);
    expect(parseRssXml('<rss><channel></channel></rss>')).toHaveLength(0);
  });

  it('handles multiple items correctly', () => {
    const xml = `
      <rss>
        <channel>
          <item><title>Job A</title><link>https://a.com</link><description>Desc A</description></item>
          <item><title>Job B</title><link>https://b.com</link><description>Desc B</description></item>
          <item><title>Job C</title><link>https://c.com</link><description>Desc C</description></item>
        </channel>
      </rss>`;

    const items = parseRssXml(xml);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Job A');
    expect(items[2].title).toBe('Job C');
  });
});

// ─── Normalization Function Tests ─────────────────────────────────────────────
describe('normalizeCompanyName', () => {
  it('strips legal suffixes', () => {
    expect(normalizeCompanyName('Acme Corp')).toBe('acme');
    expect(normalizeCompanyName('TechSolutions Ltd')).toBe('techsolutions');
    expect(normalizeCompanyName('Cloud Systems Inc')).toBe('cloud');
  });

  it('lowercases and removes non-alphanumeric characters', () => {
    expect(normalizeCompanyName('Big Blue & Red, Inc.')).toBe('bigbluered');
  });

  it('handles empty and null input gracefully', () => {
    expect(normalizeCompanyName('')).toBe('');
    expect(normalizeCompanyName(null)).toBe('');
    expect(normalizeCompanyName(undefined)).toBe('');
  });
});

describe('normalizeJobTitle', () => {
  it('strips seniority and employment type prefixes', () => {
    // normalizeJobTitle removes spaces for deduplication comparison purposes
    expect(normalizeJobTitle('Senior Software Engineer')).toBe('softwareengineer');
    expect(normalizeJobTitle('Junior React Developer')).toBe('reactdeveloper');
    expect(normalizeJobTitle('Staff Machine Learning Engineer')).toBe('machinelearningengineer');
  });

  it('normalizes intern title correctly', () => {
    expect(normalizeJobTitle('Intern Full Stack Developer')).toBe('fullstackdeveloper');
  });

  it('handles empty strings and nulls gracefully', () => {
    expect(normalizeJobTitle('')).toBe('');
    expect(normalizeJobTitle(null)).toBe('');
  });
});
