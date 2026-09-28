import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env, features } from '@/lib/env';

export interface Email { to: string; subject: string; text: string; html?: string }

interface Driver { send(email: Email): Promise<{ id: string; delivered: boolean }> }

/**
 * Development driver. Writes each message to ./.mail and logs the path.
 * It never claims a message was delivered — `delivered` is false — so the
 * interface can tell the user honestly that email is not configured.
 */
const consoleDriver: Driver = {
  async send(email) {
    const dir = path.join(process.cwd(), '.mail');
    await fs.mkdir(dir, { recursive: true });
    const id = `${Date.now()}-${email.to.replace(/[^a-z0-9]/gi, '_')}`;
    const file = path.join(dir, `${id}.txt`);
    await fs.writeFile(file, `To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`, 'utf8');
    console.info(`[email:dev] ${email.subject} -> ${email.to}\n           written to ${file}`);
    return { id, delivered: false };
  },
};

const resendDriver: Driver = {
  async send(email) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!res.ok) throw new Error(`Email provider rejected the message (${res.status})`);
    const data = (await res.json()) as { id: string };
    return { id: data.id, delivered: true };
  },
};

const driver: Driver = features.realEmail ? resendDriver : consoleDriver;

export const emailConfigured = features.realEmail;

async function send(email: Email) {
  try {
    return await driver.send(email);
  } catch (err) {
    console.error('[email] send failed:', err);
    return { id: 'failed', delivered: false };
  }
}

const shell = (title: string, body: string, cta?: { label: string; url: string }) =>
  [
    title,
    '',
    body,
    cta ? `\n${cta.label}: ${cta.url}` : '',
    '',
    '— Doorkey',
    'You are receiving this because you have a Doorkey account.',
  ].join('\n');

export const emails = {
  welcome: (to: string, name: string) =>
    send({
      to,
      subject: 'Welcome to Doorkey',
      text: shell(
        `Welcome, ${name}.`,
        'Finish your profile and Doorkey can start showing you people who are actually relevant to what you are working on.',
        { label: 'Finish your profile', url: `${env.APP_URL}/onboarding` },
      ),
    }),

  verifyEmail: (to: string, token: string) =>
    send({
      to,
      subject: 'Confirm your email address',
      text: shell(
        'Confirm your email address',
        'This link is valid for 24 hours.',
        { label: 'Confirm email', url: `${env.APP_URL}/verify-email?token=${token}` },
      ),
    }),

  passwordReset: (to: string, token: string) =>
    send({
      to,
      subject: 'Reset your Doorkey password',
      text: shell(
        'Reset your password',
        'This link is valid for one hour. If you did not ask for it, you can ignore this message.',
        { label: 'Choose a new password', url: `${env.APP_URL}/reset-password?token=${token}` },
      ),
    }),

  connectionRequest: (to: string, fromName: string) =>
    send({
      to,
      subject: `${fromName} would like to connect on Doorkey`,
      text: shell(`${fromName} would like to connect`, 'Open Doorkey to see their profile and respond.', {
        label: 'View request',
        url: `${env.APP_URL}/connections`,
      }),
    }),

  connectionAccepted: (to: string, name: string) =>
    send({
      to,
      subject: `${name} accepted your connection request`,
      text: shell(`${name} accepted your request`, 'You can message each other now.', {
        label: 'Open messages',
        url: `${env.APP_URL}/messages`,
      }),
    }),

  introductionRequest: (to: string, fromName: string) =>
    send({
      to,
      subject: `${fromName} asked for an introduction`,
      text: shell(`${fromName} asked for an introduction`, 'Open Doorkey to read the request.', {
        label: 'View request',
        url: `${env.APP_URL}/connections`,
      }),
    }),

  notice: (to: string, subject: string, body: string) => send({ to, subject, text: shell(subject, body) }),
};
