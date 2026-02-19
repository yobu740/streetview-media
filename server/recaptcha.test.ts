import { describe, it, expect } from 'vitest';

describe('reCAPTCHA Configuration', () => {
  it('should have reCAPTCHA secret key configured', () => {
    expect(process.env.RECAPTCHA_SECRET_KEY).toBeDefined();
    expect(process.env.RECAPTCHA_SECRET_KEY).not.toBe('');
    expect(process.env.RECAPTCHA_SECRET_KEY?.length).toBeGreaterThan(20);
  });

  it('should have reCAPTCHA site key configured', () => {
    expect(process.env.VITE_RECAPTCHA_SITE_KEY).toBeDefined();
    expect(process.env.VITE_RECAPTCHA_SITE_KEY).not.toBe('');
    expect(process.env.VITE_RECAPTCHA_SITE_KEY?.length).toBeGreaterThan(20);
  });
});
