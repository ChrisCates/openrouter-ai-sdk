import { OpenRouterChatLanguageModel } from '../models/chat'
import { OpenRouterCompletionLanguageModel } from '../models/completion'
import type {
  OpenRouterChatSettings,
  OpenRouterCompletionSettings
} from '../types'

// Type for model IDs - using string for now, can be refined later
export type OpenRouterModelId = string

export interface OpenRouterProviderSettings {
  apiKey?: string
  baseURL?: string
  baseUrl?: string // alias for baseURL
  compatibility?: 'strict' | 'compatible'
  headers?: Record<string, string>
  fetch?: typeof fetch
  extraBody?: Record<string, unknown>
}

export interface OpenRouterProvider {
  (
    modelId: OpenRouterModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel
  (
    modelId: OpenRouterModelId,
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel

  languageModel(
    modelId: OpenRouterModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ): OpenRouterChatLanguageModel | OpenRouterCompletionLanguageModel

  /**
   * Creates an OpenRouter chat model for text generation.
   */
  chat(
    modelId: OpenRouterModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel

  /**
   * Creates an OpenRouter completion model for text generation.
   */
  completion(
    modelId: OpenRouterModelId,
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel
}

/**
 * Create an OpenRouter provider instance.
 */
export function createOpenRouter(
  options: OpenRouterProviderSettings = {}
): OpenRouterProvider {
  const baseURL =
    options.baseURL ?? options.baseUrl ?? 'https://openrouter.ai/api/v1'
  const compatibility = options.compatibility ?? 'strict'

  const getHeaders = (
    modelSettings: OpenRouterChatSettings | OpenRouterCompletionSettings = {}
  ) => {
    const apiKey =
      modelSettings.apiKey ?? options.apiKey ?? process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error(
        'OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or pass apiKey option.'
      )
    }

    return {
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
      ...modelSettings.headers
    }
  }

  const createChatModel = (
    modelId: OpenRouterModelId,
    settings: OpenRouterChatSettings = {}
  ) => {
    const config = {
      provider: 'openrouter',
      url: ({ path }: { path: string }) =>
        `${baseURL.replace(/\/$/, '')}${path}`,
      headers: () => getHeaders(settings),
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody
    }

    return new OpenRouterChatLanguageModel(modelId, settings, config)
  }

  const createCompletionModel = (
    modelId: OpenRouterModelId,
    settings: OpenRouterCompletionSettings = {}
  ) => {
    const config = {
      provider: 'openrouter',
      url: ({ path }: { path: string }) =>
        `${baseURL.replace(/\/$/, '')}${path}`,
      headers: () => getHeaders(settings),
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody
    }

    return new OpenRouterCompletionLanguageModel(modelId, settings, config)
  }

  const createLanguageModel = (
    modelId: OpenRouterModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ) => {
    if (new.target) {
      throw new Error(
        'The OpenRouter model function cannot be called with the new keyword.'
      )
    }

    // For completion models, we'll default to chat unless specific completion model is detected
    if (modelId === 'openai/gpt-3.5-turbo-instruct') {
      return createCompletionModel(
        modelId,
        settings as OpenRouterCompletionSettings
      )
    }

    return createChatModel(modelId, settings as OpenRouterChatSettings)
  }

  const provider = (
    modelId: OpenRouterModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ) => createLanguageModel(modelId, settings)

  provider.languageModel = createLanguageModel
  provider.chat = createChatModel
  provider.completion = createCompletionModel

  return provider as OpenRouterProvider
}

/**
 * Default OpenRouter provider instance. It uses 'strict' compatibility mode.
 */
export const openrouter = createOpenRouter({
  compatibility: 'strict' // strict for OpenRouter API
})
