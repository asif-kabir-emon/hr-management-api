import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey() {
  const encryptionKey = process.env.EMPLOYEE_PII_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('EMPLOYEE_PII_ENCRYPTION_KEY is required');
  }

  return createHash('sha256').update(encryptionKey).digest();
}

function encryptValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const cipherInitializationVector = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    cipherInitializationVector,
  );
  const normalizedValue = JSON.stringify(value);
  const encryptedValue = Buffer.concat([
    cipher.update(normalizedValue, 'utf8'),
    cipher.final(),
  ]);
  const authenticationTag = cipher.getAuthTag();

  return `${cipherInitializationVector.toString('base64')}:${authenticationTag.toString(
    'base64',
  )}:${encryptedValue.toString('base64')}`;
}

function decryptValue(value: string | null) {
  if (!value) {
    return {};
  }

  const [initializationVectorBase64, authenticationTagBase64, encryptedValueBase64] =
    value.split(':');

  if (!initializationVectorBase64 || !authenticationTagBase64 || !encryptedValueBase64) {
    return {};
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(initializationVectorBase64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authenticationTagBase64, 'base64'));
  const decryptedValue = Buffer.concat([
    decipher.update(Buffer.from(encryptedValueBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(decryptedValue);
}

export const encryptedJsonTransformer: ValueTransformer = {
  to: (value?: Record<string, unknown>) => encryptValue(value ?? {}),
  from: (value?: string | null) => decryptValue(value ?? null),
};
