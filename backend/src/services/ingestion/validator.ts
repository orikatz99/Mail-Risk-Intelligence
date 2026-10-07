export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_MIMETYPES = new Set(['text/plain', 'application/pdf', 'message/rfc822']);

export function validateFile(mimetype: string, buffer: Buffer): ValidationResult {
  if (!ALLOWED_MIMETYPES.has(mimetype)) {
    return { valid: false, error: `Unsupported file type: ${mimetype}` };
  }
  if (buffer.length === 0) {
    return { valid: false, error: 'Email content must not be empty' };
  }
  return { valid: true };
}
