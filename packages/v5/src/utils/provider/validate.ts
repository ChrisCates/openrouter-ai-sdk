import type { OpenRouterProviderOptions } from '../../types'

/**
 * Validates provider options format
 */
export function validateProviderOptions(providerOptions: unknown): void {
  if (!providerOptions) {
    return
  }

  if (typeof providerOptions !== 'object' || Array.isArray(providerOptions)) {
    throw new Error('Provider options must be an object')
  }

  const providerOptionsObj = providerOptions as Record<string, unknown>
  if (providerOptionsObj.openrouter) {
    validateOpenRouterOptions(
      providerOptionsObj.openrouter as OpenRouterProviderOptions['openrouter']
    )
  }
}

/**
 * Validates OpenRouter-specific options
 */
function validateOpenRouterOptions(
  options: OpenRouterProviderOptions['openrouter']
): void {
  if (!options || typeof options !== 'object') {
    return
  }

  // Validate cache control
  if (options.cacheControl) {
    if (typeof options.cacheControl !== 'object') {
      throw new Error('cacheControl must be an object')
    }

    const cacheControl = options.cacheControl as Record<string, unknown>
    if (
      cacheControl.type &&
      !['ephemeral', 'persistent'].includes(cacheControl.type as string)
    ) {
      throw new Error('cacheControl.type must be "ephemeral" or "persistent"')
    }
  }

  // Validate reasoning settings
  if (
    options.includeReasoning !== undefined &&
    typeof options.includeReasoning !== 'boolean'
  ) {
    throw new Error('includeReasoning must be a boolean')
  }

  // Note: reasoning can be boolean or object, so we don't validate its type strictly

  // Validate transforms
  if (options.transforms !== undefined) {
    if (!Array.isArray(options.transforms)) {
      throw new Error('transforms must be an array')
    }

    for (const transform of options.transforms) {
      if (typeof transform !== 'string') {
        throw new Error('transforms must be an array of strings')
      }
    }
  }

  // Validate fallbacks
  if (options.fallbacks !== undefined) {
    if (!Array.isArray(options.fallbacks)) {
      throw new Error('fallbacks must be an array')
    }

    for (const fallback of options.fallbacks) {
      if (typeof fallback !== 'string') {
        throw new Error('fallbacks must be an array of strings')
      }
    }
  }

  // Validate route
  if (options.route !== undefined && options.route !== 'fallback') {
    throw new Error('route must be "fallback" if specified')
  }
}
