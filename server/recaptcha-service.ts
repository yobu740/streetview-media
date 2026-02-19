interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error('[reCAPTCHA] Secret key not configured');
    throw new Error('reCAPTCHA not configured');
  }

  // In development mode, bypass reCAPTCHA verification for easier testing
  if (process.env.NODE_ENV === 'development') {
    console.log('[reCAPTCHA] Development mode: bypassing verification');
    return true;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data: RecaptchaResponse = await response.json();
    
    console.log('[reCAPTCHA] Verification result:', {
      success: data.success,
      score: data.score,
      action: data.action,
    });

    // reCAPTCHA v3 returns a score from 0.0 to 1.0
    // 1.0 is very likely a good interaction, 0.0 is very likely a bot
    // We'll accept scores above 0.5
    if (data.success && data.score && data.score >= 0.5) {
      return true;
    }

    console.warn('[reCAPTCHA] Verification failed or low score:', data);
    return false;
  } catch (error) {
    console.error('[reCAPTCHA] Verification error:', error);
    throw new Error('reCAPTCHA verification failed');
  }
}
