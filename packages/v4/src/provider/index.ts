import { loadApiKey, withoutTrailingSlash } from '@ai-sdk/provider-utils'
import { OpenRouterChatLanguageModel } from '../chat/language.model'
import { OpenRouterCompletionLanguageModel } from '../completion/language.model'
import type {
  OpenRouterCompletionModelId,
  OpenRouterCompletionSettings
} from '../completion/settings'
import type {
  OpenRouterChatModelId,
  OpenRouterChatSettings
} from '../types/chat.settings'
import type { OpenRouterProviderSettings } from './facade'

export type { OpenRouterCompletionSettings }

export interface OpenRouterProvider {
  (
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel
  (
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel

  languageModel(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel
  languageModel(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel

  /**
Creates an OpenRouter chat model for text generation.
   */
  chat(
    modelId: OpenRouterChatModelId,
    settings?: OpenRouterChatSettings
  ): OpenRouterChatLanguageModel

  /**
Creates an OpenRouter completion model for text generation.
   */
  completion(
    modelId: OpenRouterCompletionModelId,
    settings?: OpenRouterCompletionSettings
  ): OpenRouterCompletionLanguageModel
}

/**
Create an OpenRouter provider instance.
 */
export function createOpenRouter(
  options: OpenRouterProviderSettings = {}
): OpenRouterProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? options.baseUrl) ??
    'https://openrouter.ai/api/v1'

  // we default to compatible, because strict breaks providers like Groq:
  const compatibility = options.compatibility ?? 'compatible'

  const getHeaders = (
    modelSettings: OpenRouterChatSettings | OpenRouterCompletionSettings = {}
  ) => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: modelSettings.apiKey || options.apiKey,
      environmentVariableName: 'OPENROUTER_API_KEY',
      description: 'OpenRouter'
    })}`,
    ...options.headers,
    ...modelSettings.headers
  })

  const createChatModel = (
    modelId: OpenRouterChatModelId,
    settings: OpenRouterChatSettings = {}
  ) => {
    const modelBaseURL = settings.baseURL
      ? withoutTrailingSlash(settings.baseURL)
      : baseURL

    return new OpenRouterChatLanguageModel(modelId, settings, {
      provider: 'openrouter.chat',
      url: ({ path }) => `${modelBaseURL}${path}`,
      headers: () => getHeaders(settings),
      compatibility,
      fetch: options.fetch,
      extraBody: { ...options.extraBody, ...settings.extraBody }
    })
  }

  const createCompletionModel = (
    modelId: OpenRouterCompletionModelId,
    settings: OpenRouterCompletionSettings = {}
  ) => {
    const modelBaseURL = settings.baseURL
      ? withoutTrailingSlash(settings.baseURL)
      : baseURL

    return new OpenRouterCompletionLanguageModel(modelId, settings, {
      provider: 'openrouter.completion',
      url: ({ path }) => `${modelBaseURL}${path}`,
      headers: () => getHeaders(settings),
      compatibility,
      fetch: options.fetch,
      extraBody: { ...options.extraBody, ...settings.extraBody }
    })
  }

  const createLanguageModel = (
    modelId: OpenRouterChatModelId | OpenRouterCompletionModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ) => {
    if (new.target) {
      throw new Error(
        'The OpenRouter model function cannot be called with the new keyword.'
      )
    }

    if (modelId === 'openai/gpt-3.5-turbo-instruct') {
      return createCompletionModel(
        modelId,
        settings as OpenRouterCompletionSettings
      )
    }

    return createChatModel(modelId, settings as OpenRouterChatSettings)
  }

  const provider = (
    modelId: OpenRouterChatModelId | OpenRouterCompletionModelId,
    settings?: OpenRouterChatSettings | OpenRouterCompletionSettings
  ) => createLanguageModel(modelId, settings)

  provider.languageModel = createLanguageModel
  provider.chat = createChatModel
  provider.completion = createCompletionModel

  return provider as OpenRouterProvider
}

/**
Default OpenRouter provider instance. It uses 'strict' compatibility mode.
 */
export const openrouter = createOpenRouter({
  compatibility: 'strict' // strict for OpenRouter API
})
