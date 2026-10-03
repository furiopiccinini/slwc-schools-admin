/**
 * Base URL pubblica dell'app (usata per QR e link di iscrizione).
 * Preferire NEXT_PUBLIC_APP_URL così i QR non puntano a localhost.
 */
export function getPublicAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "")
  }

  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return ""
}

export function getSchoolRegistrationUrl(slug: string): string {
  return `${getPublicAppUrl()}/register/${encodeURIComponent(slug)}`
}
