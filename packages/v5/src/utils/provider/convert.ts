import type { OpenRouterProviderOptions } from '../../types'

/**
 * Converts v4 providerMetadata to providerOptions
 * Handles the property rename from providerMetadata to providerOptions
 */
export function convertProviderMetadata(
  providerMetadata: unknown
): OpenRouterProviderOptions | undefined {
  if (!providerMetadata || typeof providerMetadata !== 'object') {
    return {}
  }

  const metadataObj = providerMetadata as Record<string, unknown>

  // Handle empty object case
  if (Object.keys(metadataObj).length === 0) {
    return {}
  }

  // If it already has proper structure, preserve it completely
  if (metadataObj.openrouter || metadataObj.anthropic || metadataObj.openai) {
    return { ...metadataObj } as OpenRouterProviderOptions
  }

  // Handle legacy direct options format
  return {
    openrouter: convertOpenRouterOptions(metadataObj)
  }
}

/**
 * Converts OpenRouter-specific options from v4 format
 */
function convertOpenRouterOptions(
  options: unknown
): OpenRouterProviderOptions['openrouter'] {
  if (!options || typeof options !== 'object') {
    return undefined
  }

  // For v5 provider options, pass through all properties to preserve flexibility
  // The type system will enforce what's valid
  return { ...options } as OpenRouterProviderOptions['openrouter']
}
