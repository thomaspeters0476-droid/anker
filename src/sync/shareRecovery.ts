/** Recovery code leave-device only via Share / mailto / clipboard — never our API. */

export async function shareRecoveryCode(params: {
  email: string
  recoveryCode: string
  subject: string
  body: string
}): Promise<'shared' | 'mailto' | 'copied' | 'failed'> {
  const text = params.body.replace('{{code}}', params.recoveryCode)

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: params.subject,
        text,
      })
      return 'shared'
    } catch {
      /* user cancel or unsupported — fall through */
    }
  }

  const mailto = `mailto:${encodeURIComponent(params.email)}?subject=${encodeURIComponent(params.subject)}&body=${encodeURIComponent(text)}`
  try {
    window.location.href = mailto
    return 'mailto'
  } catch {
    /* ignore */
  }

  try {
    await navigator.clipboard.writeText(params.recoveryCode)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
