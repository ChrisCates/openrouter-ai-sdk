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
export interface OpenRouterProviderSettings {
  /**
Base URL for the OpenRouter API calls.
     */
  baseURL?: string

  /**
@deprecated Use `baseURL` instead.
     */
  baseUrl?: string

  /**
API key for authenticating requests.
     */
  apiKey?: string

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>

  /**
OpenRouter compatibility mode. Should be set to `strict` when using the OpenRouter API,
and `compatible` when using 3rd party providers. In `compatible` mode, newer
information such as streamOptions are not being sent. Defaults to 'compatible'.
   */
  compatibility?: 'strict' | 'compatible'

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: typeof fetch

  /**
A JSON object to send as the request body to access OpenRouter features & upstream provider features.
  */
  extraBody?: Record<string, unknown>
}

/**
@deprecated Use `createOpenRouter` instead.
 */
export class OpenRouter {
  /**
Use a different URL prefix for API calls, e.g. to use proxy servers.
The default prefix is `https://openrouter.ai/api/v1`.
   */
  readonly baseURL: string

  /**
API key that is being send using the `Authorization` header.
It defaults to the `OPENROUTER_API_KEY` environment variable.
 */
  readonly apiKey?: string

  /**
Custom headers to include in the requests.
   */
  readonly headers?: Record<string, string>

  /**
   * Creates a new OpenRouter provider instance.
   */
  constructor(options: OpenRouterProviderSettings = {}) {
    this.baseURL =
      withoutTrailingSlash(options.baseURL ?? options.baseUrl) ??
      'https://openrouter.ai/api/v1'
    this.apiKey = options.apiKey
    this.headers = options.headers
  }

  private get baseConfig() {
    return {
      baseURL: this.baseURL,
      headers: () => ({
        Authorization: `Bearer ${loadApiKey({
          apiKey: this.apiKey,
          environmentVariableName: 'OPENROUTER_API_KEY',
          description: 'OpenRouter'
        })}`,
        ...this.headers
      })
    }
  }

  chat(modelId: OpenRouterChatModelId, settings: OpenRouterChatSettings = {}) {
    return new OpenRouterChatLanguageModel(modelId, settings, {
      provider: 'openrouter.chat',
      ...this.baseConfig,
      compatibility: 'strict',
      url: ({ path }) => `${this.baseURL}${path}`
    })
  }

  completion(
    modelId: OpenRouterCompletionModelId,
    settings: OpenRouterCompletionSettings = {}
  ) {
    return new OpenRouterCompletionLanguageModel(modelId, settings, {
      provider: 'openrouter.completion',
      ...this.baseConfig,
      compatibility: 'strict',
      url: ({ path }) => `${this.baseURL}${path}`
    })
  }
}
