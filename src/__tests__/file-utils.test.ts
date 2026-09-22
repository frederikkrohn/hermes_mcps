import { describe, expect, it } from 'vitest';
import { fileSourceToWahaFile } from '../utils/file-utils.js';

describe('fileSourceToWahaFile', () => {
  it('converts base64 data URLs to WAHA data payloads', () => {
    expect(fileSourceToWahaFile('data:text/plain;base64,SGVsbG8=', { filename: 'hello.txt' })).toEqual({
      data: 'SGVsbG8=',
      mimetype: 'text/plain',
      filename: 'hello.txt',
    });
  });

  it('encodes non-base64 data URLs', () => {
    expect(fileSourceToWahaFile('data:text/plain,Hello%20world')).toEqual({
      data: Buffer.from('Hello world').toString('base64'),
      mimetype: 'text/plain',
    });
  });

  it('keeps remote URLs as URLs and derives their MIME type', () => {
    expect(fileSourceToWahaFile('https://example.test/photo.jpg')).toEqual({
      url: 'https://example.test/photo.jpg',
      mimetype: 'image/jpeg',
    });
  });
});
