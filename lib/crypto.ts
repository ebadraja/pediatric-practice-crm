const SECRET = process.env.ENCRYPTION_SECRET || 'default-secret-key';

export function encrypt(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    out += String.fromCharCode(value.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length));
  }
  return Buffer.from(out).toString('base64');
}

export function decrypt(encoded: string): string {
  try {
    const raw = Buffer.from(encoded, 'base64').toString();
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length));
    }
    return out;
  } catch {
    return '';
  }
}
