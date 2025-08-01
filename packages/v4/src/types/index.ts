export interface OpenRouterSharedSettings {
  /**
  OpenRouter API key. If not provided, will use OPENROUTER_API_KEY environment variable.
   */
  apiKey?: string

  /**
  Base URL for the OpenRouter API.
   */
  baseURL?: string

  /**
  Additional headers to send with requests.
   */
  headers?: Record<string, string>

  /**
  Maximum number of tokens to generate.
   */
  maxTokens?: number

  /**
  Sampling temperature to use. We generally recommend altering this or top_p but not both.
   */
  temperature?: number

  /**
  An alternative to sampling with temperature, called nucleus sampling, where the model 
  considers the results of the tokens with top_p probability mass. So 0.1 means only the 
  tokens comprising the top 10% probability mass are considered.
   */
  topP?: number

  /**
  Number between -2.0 and 2.0. Positive values penalize new tokens based on their 
  existing frequency in the text so far, decreasing the model's likelihood to repeat 
  the same line verbatim.
   */
  frequencyPenalty?: number

  /**
  Number between -2.0 and 2.0. Positive values penalize new tokens based on whether 
  they appear in the text so far, increasing the model's likelihood to talk about new topics.
   */
  presencePenalty?: number

  /**
  Random seed for deterministic generation.
   */
  seed?: number

  /**
  Up to 4 sequences where the API will stop generating further tokens. The returned text 
  will not contain the stop sequence.
   */
  stop?: string | string[]

  /**
  A unique identifier representing your end-user, which can help OpenRouter to monitor 
  and detect abuse.
   */
  user?: string

  /**
  List of model names in order of preference. The first available model will be used.
   */
  models?: string[]
}

export interface OpenRouterUsageAccounting {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  promptTokensDetails?: Record<string, unknown>
  completionTokensDetails?: Record<string, unknown>
  cost?: number
}
