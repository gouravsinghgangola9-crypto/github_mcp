/**
 * Sanitizes error messages to ensure GitHub tokens, secrets, or internal paths
 * are never leaked back to the AI client or model context.
 */
export function sanitizeErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';

  let message = '';
  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  } else {
    try {
      message = JSON.stringify(error);
    } catch {
      message = String(error);
    }
  }

  // Redact GitHub Personal Access Tokens (classic: ghp_, fine-grained: github_pat_)
  message = message.replace(/ghp_[A-Za-z0-9_]{36,}/g, '[REDACTED_GITHUB_TOKEN]');
  message = message.replace(/github_pat_[A-Za-z0-9_]{82,}/g, '[REDACTED_GITHUB_TOKEN]');
  message = message.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  message = message.replace(/token\s+[A-Za-z0-9_\-\.]+/gi, 'token [REDACTED]');

  return message;
}
