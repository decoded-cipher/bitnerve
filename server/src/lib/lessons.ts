import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LESSONS_PATH = process.env.LESSONS_FILE || fileURLToPath(new URL('../../prompts/lessons.md', import.meta.url));
const MAX_LESSONS = 25;

export function readLessons(): string[] {
  try {
    return readFileSync(LESSONS_PATH, 'utf8')
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function addLesson(lesson: string): { kept: string[]; dropped: number } {
  const cleaned = lesson.replace(/\s+/g, ' ').trim();
  if (!cleaned) throw new Error('A lesson cannot be empty');
  if (cleaned.length > 400) throw new Error(`A lesson must be 400 characters or fewer (got ${cleaned.length})`);

  const existing = readLessons();
  const stamped = `${new Date().toISOString().slice(0, 16).replace('T', ' ')}  ${cleaned}`;
  const all = [...existing, stamped];
  const kept = all.slice(-MAX_LESSONS);

  writeFileSync(LESSONS_PATH, kept.map(line => `- ${line}`).join('\n') + '\n');
  return { kept, dropped: all.length - kept.length };
}
