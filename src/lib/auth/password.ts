import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    // Constant-ish work even when the account has no password, so timing
    // does not reveal whether an email exists.
    await bcrypt.compare(plain, '$2a$12$1234567890123456789012uGZ8bqxJb1Q4Y1o9gk8Xp1kF0Yy5Ky');
    return false;
  }
  return bcrypt.compare(plain, hash);
}

/** Rejects the obvious failures; the UI mirrors these rules. */
export function passwordProblems(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length < 10) problems.push('Use at least 10 characters');
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) problems.push('Mix upper and lower case');
  if (!/[0-9]/.test(pw) && !/[^A-Za-z0-9]/.test(pw)) problems.push('Include a number or symbol');
  if (/^(password|doorkey|12345678)/i.test(pw)) problems.push('Too easy to guess');
  return problems;
}
