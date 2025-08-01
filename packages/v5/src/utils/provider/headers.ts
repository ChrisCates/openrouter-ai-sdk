import type { OpenRouterProviderOptions } from '../../types'

/**
 * Converts camelCase to kebab-case for header names
 */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').replace(/^-/, '')
}

/**
 * Converts provider options to headers for API requests
 */
export function providerOptionsToHeaders(
  providerOptions?: OpenRouterProviderOptions | null
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (!providerOptions?.openrouter) {
    return headers
  }

  const openrouterOptions = providerOptions.openrouter

  // Non-header properties that should be ignored
  const nonHeaderFields = new Set([
    'reasoning',
    'models',
    'fallbacks',
    'route',
    'extraBody',
    'transforms',
    'cacheControl',
    'provider',
    'metadata',
    'streamOptions',
    'cost'
  ])

  // Known header fields that should be processed
  const headerFields = new Set([
    'httpReferer',
    'xTitle',
    'customHeader',
    'anotherLongHeaderName'
  ])

  // Process all properties in openrouter options
  for (const [field, value] of Object.entries(openrouterOptions)) {
    // Skip non-header fields and non-string values
    if (
      nonHeaderFields.has(field) ||
      typeof value !== 'string' ||
      value.length === 0
    ) {
      continue
    }

    // Only process known header fields or fields ending with 'Header'
    if (!headerFields.has(field) && !field.endsWith('Header')) {
      continue
    }

    let headerName: string
    if (field === 'httpReferer') {
      headerName = 'HTTP-Referer'
    } else if (field === 'xTitle') {
      headerName = 'X-Title'
    } else {
      // Convert camelCase to kebab-case with proper capitalization
      headerName = camelToKebab(field)
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-')
    }
    headers[headerName] = value
  }

  return headers
}
