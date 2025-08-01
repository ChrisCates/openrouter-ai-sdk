export interface OpenRouterConfig {
  apiKey: string
  baseURL?: string
  defaultParams?: Record<string, unknown>
}

export interface OpenRouterResponse<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
}

export interface ErrorResponse {
  error: {
    message: string
    type: string
    code?: string
  }
}

export interface ModelInfo {
  id: string
  name: string
  description?: string
  pricing: {
    prompt: number
    completion: number
  }
  context_length: number
  architecture: {
    modality: string
    tokenizer: string
  }
  top_provider: {
    max_completion_tokens?: number
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: ErrorResponse
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

export class HttpClient {
  private readonly baseURL: string
  private readonly apiKey: string
  private readonly defaultHeaders: Record<string, string>

  constructor(config: OpenRouterConfig) {
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1'
    this.apiKey = config.apiKey
    this.defaultHeaders = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/openrouter/openrouter-ai-sdk',
      'X-Title': 'OpenRouter AI SDK'
    }
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<OpenRouterResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const requestHeaders = { ...this.defaultHeaders, ...headers }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: data ? JSON.stringify(data) : undefined
      })

      const responseData: unknown = await response.json()

      if (!response.ok) {
        const errorResponse = responseData as ErrorResponse
        throw new OpenRouterError(
          errorResponse.error?.message || 'Request failed',
          response.status,
          errorResponse
        )
      }

      return {
        data: responseData as T,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error
      }
      throw new OpenRouterError(
        error instanceof Error ? error.message : 'Unknown error',
        0
      )
    }
  }

  async get<T>(
    endpoint: string,
    headers?: Record<string, string>
  ): Promise<OpenRouterResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, headers)
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<OpenRouterResponse<T>> {
    return this.request<T>('POST', endpoint, data, headers)
  }
}

export function validateApiKey(apiKey: string): void {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key is required and must be a string')
  }
  if (!apiKey.startsWith('sk-or-')) {
    throw new Error(
      'Invalid API key format. OpenRouter API keys should start with "sk-or-"'
    )
  }
}

export function createDefaultConfig(apiKey: string): OpenRouterConfig {
  validateApiKey(apiKey)
  return {
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1'
  }
}
