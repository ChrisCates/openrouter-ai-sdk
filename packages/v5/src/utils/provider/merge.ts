import type { OpenRouterProviderOptions } from '../../types'

/**
 * Merges provider options with defaults
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  if (!source) return target
  if (!target) return source

  const result = { ...target }

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      )
    } else {
      result[key] = source[key]
    }
  }

  return result
}

export function mergeProviderOptions(
  base: OpenRouterProviderOptions | undefined | null,
  override: OpenRouterProviderOptions | undefined | null
): OpenRouterProviderOptions {
  if (!base && !override) {
    return {}
  }

  if (!base) {
    return override || {}
  }

  if (!override) {
    return base || {}
  }

  return deepMerge(
    base as Record<string, unknown>,
    override as Record<string, unknown>
  ) as OpenRouterProviderOptions
}
