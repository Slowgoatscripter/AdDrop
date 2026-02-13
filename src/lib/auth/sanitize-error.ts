type AuthErrorLike = { message: string } | string

const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Invalid email or password',
  'Email not confirmed': 'Please check your email to confirm your account',
  'User already registered': 'Unable to create account. Please try again or sign in.',
  'Signup requires a valid password': 'Please enter a valid password (minimum 8 characters)',
  'Password should be at least': 'Password must be at least 8 characters',
  'For security purposes, you can only request this after':
    'Please wait before requesting another reset email',
  'Email rate limit exceeded': 'Too many attempts. Please try again later.',
}

export function sanitizeAuthError(error: AuthErrorLike): string {
  const message = typeof error === 'string' ? error : error.message
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value
  }
  return 'Something went wrong. Please try again.'
}
