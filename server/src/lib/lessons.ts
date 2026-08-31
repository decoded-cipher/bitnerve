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

function write(lessons: string[]): void {
  writeFileSync(LESSONS_PATH, lessons.map(line => `- ${line}`).join('\n') + '\n');
}

function findIndex(lessons: string[], needle: string): number {
  const trimmed = needle.trim();
  if (!trimmed) return -1;
  const exact = lessons.findIndex(line => line.startsWith(trimmed));
  if (exact !== -1) return exact;
  const lowered = trimmed.toLowerCase();
  return lessons.findIndex(line => line.toLowerCase().includes(lowered));
}

export function addLesson(
  lesson: string,
  replaces?: string,
): { kept: string[]; dropped: number; replaced: string | null } {
  const cleaned = lesson.replace(/\s+/g, ' ').trim();
  if (!cleaned) throw new Error('A lesson cannot be empty');
  if (cleaned.length > 400) throw new Error(`A lesson must be 400 characters or fewer (got ${cleaned.length})`);

  const existing = readLessons();
  let replaced: string | null = null;

  if (replaces) {
    const index = findIndex(existing, replaces);
    if (index === -1) throw new Error(`No existing lesson matches "${replaces}" — quote its timestamp or a distinctive phrase`);
    replaced = existing[index];
    existing.splice(index, 1);
  }

  const stamped = `${new Date().toISOString().slice(0, 16).replace('T', ' ')}  ${cleaned}`;
  const all = [...existing, stamped];
  const kept = all.slice(-MAX_LESSONS);

  write(kept);
  return { kept, dropped: all.length - kept.length, replaced };
}

export function retireLesson(target: string): { kept: string[]; retired: string } {
  const existing = readLessons();
  const index = findIndex(existing, target);
  if (index === -1) throw new Error(`No existing lesson matches "${target}" — quote its timestamp or a distinctive phrase`);
  const [retired] = existing.splice(index, 1);
  write(existing);
  return { kept: existing, retired };
}
