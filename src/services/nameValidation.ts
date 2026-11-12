// Basic call-sign validation: 2–16 characters and a simple profanity filter.
// Substring words that commonly appear inside real names (e.g. 'Dickens', 'Essex') are left out.
const BLOCKED = [
  'fuck',
  'shit',
  'cunt',
  'bitch',
  'pussy',
  'asshole',
  'bastard',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'retard',
  'nazi',
  'penis',
  'vagina',
  'wank',
  'twat',
];

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

export function normaliseForFilter(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .replace(/[^a-z]/g, '');
}

export interface NameCheck {
  ok: boolean;
  error?: string;
  value: string;
}

export function validateName(input: string): NameCheck {
  const value = input.trim().replace(/\s+/g, ' ');
  if (value.length < 2)
    return { ok: false, value, error: 'Call-sign must be at least 2 characters.' };
  if (value.length > 16)
    return { ok: false, value, error: 'Call-sign must be 16 characters or fewer.' };
  if (!/^[\p{L}\p{N} ._-]+$/u.test(value))
    return {
      ok: false,
      value,
      error: 'Use letters, numbers, spaces, dots, dashes or underscores.',
    };
  const flat = normaliseForFilter(value);
  if (BLOCKED.some((w) => flat.includes(w)))
    return { ok: false, value, error: 'Please choose a different call-sign.' };
  return { ok: true, value };
}
