import { extractText as extractPdfText } from 'unpdf';
import { simpleParser } from 'mailparser';

export async function extractText(mimetype: string, buffer: Buffer): Promise<string> {
  switch (mimetype) {
    case 'text/plain':
      return buffer.toString();

    case 'application/pdf': {
      try {
        const { text } = await extractPdfText(new Uint8Array(buffer), { mergePages: true });
        return text;
      } catch {
        return '';
      }
    }

    case 'message/rfc822': {
      const parsed = await simpleParser(buffer);
      if (parsed.text) return parsed.text;
      if (typeof parsed.html === 'string') {
        return parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
      return '';
    }

    default:
      return '';
  }
}
