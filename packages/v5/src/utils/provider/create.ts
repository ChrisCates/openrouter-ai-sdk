import type { JSONValue } from '@ai-sdk/provider'
import type { OpenRouterProviderOptions } from '../../types'

/**
 * Creates default provider options for OpenRouter
 */
export function createDefaultProviderOptions(
  openrouterOptions?: unknown
): OpenRouterProviderOptions {
  if (!openrouterOptions) {
    return {} as OpenRouterProviderOptions
  }

  return {
    openrouter: openrouterOptions as Record<string, JSONValue>
  }
}

/**
 * Extracts OpenRouter-specific options from provider options
 */
export function extractOpenRouterOptions(
  providerOptions?: OpenRouterProviderOptions | null
): Record<string, unknown> {
  if (!providerOptions?.openrouter) {
    return {}
  }

  // Return a copy to avoid modifying the original
  return { ...providerOptions.openrouter }
}
