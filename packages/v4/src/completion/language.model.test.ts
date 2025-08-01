import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  mock
} from 'bun:test'
import type { LanguageModelV1Prompt } from '@ai-sdk/provider'
import { convertReadableStreamToArray } from '@ai-sdk/provider-utils/test'
import { createOpenRouter } from '../provider'
import { mapOpenRouterCompletionLogProbs } from '../utils/map/completion.logprobs'

const TEST_PROMPT: LanguageModelV1Prompt = [
  { role: 'user', content: [{ type: 'text', text: 'Hello' }] }
]

const TEST_LOGPROBS = {
  tokens: [' ever', ' after', '.\n\n', 'The', ' end', '.'],
  token_logprobs: [
    -0.0664508, -0.014520033, -1.3820221, -0.7890417, -0.5323165, -0.10247037
  ],
  top_logprobs: [
    {
      ' ever': -0.0664508
    },
    {
      ' after': -0.014520033
    },
    {
      '.\n\n': -1.3820221
    },
    {
      The: -0.7890417
    },
    {
      ' end': -0.5323165
    },
    {
      '.': -0.10247037
    }
  ] as Record<string, number>[]
}

const provider = createOpenRouter({
  apiKey: 'test-api-key',
  compatibility: 'strict'
})

const model = provider.completion('openai/gpt-3.5-turbo-instruct')

describe('doGenerate', () => {
  let mockFetch: Mock<typeof fetch>
  let lastRequest: { url: string; init?: RequestInit } | null = null
  let mockResponseData: Record<string, unknown> = {}
  let mockResponseHeaders: Record<string, string> = {}
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    lastRequest = null
    mockResponseData = {}
    mockResponseHeaders = {}

    mockFetch = mock(
      async (url: string | Request | URL, init?: RequestInit) => {
        const urlString = url.toString()
        lastRequest = { url: urlString, init }

        if (urlString.includes('openrouter.ai/api/v1/completions')) {
          return new Response(JSON.stringify(mockResponseData), {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'content-length':
                JSON.stringify(mockResponseData).length.toString(),
              ...mockResponseHeaders
            }
          })
        }

        return originalFetch(url, init)
      }
    ) as Mock<typeof fetch>

    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function prepareJsonResponse({
    content = '',
    usage = {
      prompt_tokens: 4,
      total_tokens: 34,
      completion_tokens: 30
    },
    logprobs = null,
    finish_reason = 'stop'
  }: {
    content?: string
    usage?: {
      prompt_tokens: number
      total_tokens: number
      completion_tokens: number
    }
    logprobs?: {
      tokens: string[]
      token_logprobs: number[]
      top_logprobs: Record<string, number>[]
    } | null
    finish_reason?: string
  }) {
    mockResponseData = {
      id: 'cmpl-96cAM1v77r4jXa4qb2NSmRREV5oWB',
      object: 'text_completion',
      created: 1711363706,
      model: 'openai/gpt-3.5-turbo-instruct',
      choices: [
        {
          text: content,
          index: 0,
          logprobs,
          finish_reason
        }
      ],
      usage
    }
  }

  function getRequestBodyJson() {
    if (!lastRequest?.init?.body) return undefined
    return JSON.parse(lastRequest.init.body as string)
  }

  function getRequestHeaders() {
    if (!lastRequest?.init?.headers) return undefined
    return lastRequest.init.headers
  }

  it('should extract text response', async () => {
    prepareJsonResponse({ content: 'Hello, World!' })

    const { text } = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(text).toStrictEqual('Hello, World!')
  })

  it('should extract usage', async () => {
    prepareJsonResponse({
      content: '',
      usage: { prompt_tokens: 20, total_tokens: 25, completion_tokens: 5 }
    })

    const { usage } = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(usage).toStrictEqual({
      promptTokens: 20,
      completionTokens: 5
    })
  })

  it('should extract logprobs', async () => {
    prepareJsonResponse({ logprobs: TEST_LOGPROBS })

    const provider = createOpenRouter({ apiKey: 'test-api-key' })

    const response = await provider
      .completion('openai/gpt-3.5-turbo', { logprobs: 1 })
      .doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      })
    expect(response.logprobs).toStrictEqual(
      mapOpenRouterCompletionLogProbs(TEST_LOGPROBS)!
    )
  })

  it('should extract finish reason', async () => {
    prepareJsonResponse({
      content: '',
      finish_reason: 'stop'
    })

    const { finishReason } = await provider
      .completion('openai/gpt-3.5-turbo-instruct')
      .doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      })

    expect(finishReason).toStrictEqual('stop')
  })

  it('should support unknown finish reason', async () => {
    prepareJsonResponse({
      content: '',
      finish_reason: 'eos'
    })

    const { finishReason } = await provider
      .completion('openai/gpt-3.5-turbo-instruct')
      .doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      })

    expect(finishReason).toStrictEqual('unknown')
  })

  it('should expose the raw response headers', async () => {
    prepareJsonResponse({ content: '' })
    mockResponseHeaders = {
      'test-header': 'test-value'
    }

    const { rawResponse } = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(rawResponse?.headers).toStrictEqual({
      // default headers:
      'content-length': '273',
      'content-type': 'application/json',

      // custom header
      'test-header': 'test-value'
    })
  })

  it('should pass the model and the prompt', async () => {
    prepareJsonResponse({ content: '' })

    await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(getRequestBodyJson()).toStrictEqual({
      model: 'openai/gpt-3.5-turbo-instruct',
      prompt: 'Hello'
    })
  })

  it('should pass the models array when provided', async () => {
    prepareJsonResponse({ content: '' })

    const customModel = provider.completion('openai/gpt-3.5-turbo-instruct', {
      models: ['openai/gpt-4', 'anthropic/claude-2']
    })

    await customModel.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(getRequestBodyJson()).toStrictEqual({
      model: 'openai/gpt-3.5-turbo-instruct',
      models: ['openai/gpt-4', 'anthropic/claude-2'],
      prompt: 'Hello'
    })
  })

  it('should pass headers', async () => {
    prepareJsonResponse({ content: '' })

    const provider = createOpenRouter({
      apiKey: 'test-api-key',
      headers: {
        'Custom-Provider-Header': 'provider-header-value'
      }
    })

    await provider.completion('openai/gpt-3.5-turbo-instruct').doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT,
      headers: {
        'Custom-Request-Header': 'request-header-value'
      }
    })

    const requestHeaders = getRequestHeaders()

    expect(requestHeaders).toMatchObject({
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
      'Custom-Provider-Header': 'provider-header-value',
      'Custom-Request-Header': 'request-header-value'
    })
  })
})

describe('doStream', () => {
  let mockFetch: Mock<typeof fetch>
  let lastRequest: { url: string; init?: RequestInit } | null = null
  let mockStreamChunks: string[] = []
  let mockResponseHeaders: Record<string, string> = {}
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    lastRequest = null
    mockStreamChunks = []
    mockResponseHeaders = {}

    mockFetch = mock(
      async (url: string | Request | URL, init?: RequestInit) => {
        const urlString = url.toString()
        lastRequest = { url: urlString, init }

        if (urlString.includes('openrouter.ai/api/v1/completions')) {
          const stream = new ReadableStream({
            start(controller) {
              for (const chunk of mockStreamChunks) {
                controller.enqueue(new TextEncoder().encode(chunk))
              }
              controller.close()
            }
          })

          return new Response(stream, {
            status: 200,
            headers: {
              'content-type': 'text/event-stream',
              'cache-control': 'no-cache',
              connection: 'keep-alive',
              ...mockResponseHeaders
            }
          })
        }

        return originalFetch(url, init)
      }
    ) as Mock<typeof fetch>

    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function prepareStreamResponse({
    content,
    finish_reason = 'stop',
    usage = {
      prompt_tokens: 10,
      total_tokens: 372,
      completion_tokens: 362
    },
    logprobs = null
  }: {
    content: string[]
    usage?: {
      prompt_tokens: number
      total_tokens: number
      completion_tokens: number
    }
    logprobs?: {
      tokens: string[]
      token_logprobs: number[]
      top_logprobs: Record<string, number>[]
    } | null
    finish_reason?: string
  }) {
    mockStreamChunks = [
      ...content.map((text) => {
        const chunk = {
          id: 'cmpl-96c64EdfhOw8pjFFgVpLuT8k2MtdT',
          object: 'text_completion',
          created: 1711363440,
          choices: [
            {
              text,
              index: 0,
              logprobs: null,
              finish_reason: null
            }
          ],
          model: 'openai/gpt-3.5-turbo-instruct'
        }
        return `data: ${JSON.stringify(chunk)}\n\n`
      }),
      (() => {
        const finishChunk = {
          id: 'cmpl-96c3yLQE1TtZCd6n6OILVmzev8M8H',
          object: 'text_completion',
          created: 1711363310,
          choices: [
            {
              text: '',
              index: 0,
              logprobs,
              finish_reason
            }
          ],
          model: 'openai/gpt-3.5-turbo-instruct'
        }
        return `data: ${JSON.stringify(finishChunk)}\n\n`
      })(),
      (() => {
        const usageChunk = {
          id: 'cmpl-96c3yLQE1TtZCd6n6OILVmzev8M8H',
          object: 'text_completion',
          created: 1711363310,
          model: 'openai/gpt-3.5-turbo-instruct',
          usage,
          choices: []
        }
        return `data: ${JSON.stringify(usageChunk)}\n\n`
      })(),
      'data: [DONE]\n\n'
    ]
  }

  function getRequestBodyJson() {
    if (!lastRequest?.init?.body) return undefined
    return JSON.parse(lastRequest.init.body as string)
  }

  function getRequestHeaders() {
    if (!lastRequest?.init?.headers) return undefined
    return lastRequest.init.headers
  }

  it('should stream text deltas', async () => {
    prepareStreamResponse({
      content: ['Hello', ', ', 'World!'],
      finish_reason: 'stop',
      usage: {
        prompt_tokens: 10,
        total_tokens: 372,
        completion_tokens: 362
      },
      logprobs: TEST_LOGPROBS
    })

    const { stream } = await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    // note: space moved to last chunk bc of trimming
    expect(await convertReadableStreamToArray(stream)).toStrictEqual([
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'text-delta', textDelta: ', ' },
      { type: 'text-delta', textDelta: 'World!' },
      { type: 'text-delta', textDelta: '' },
      {
        type: 'finish',
        finishReason: 'stop',
        logprobs: mapOpenRouterCompletionLogProbs(TEST_LOGPROBS),
        usage: { promptTokens: 10, completionTokens: 362 }
      }
    ])
  })

  it('should handle error stream parts', async () => {
    const errorChunk = {
      error: {
        message:
          'The server had an error processing your request. Sorry about that! You can retry your request, or contact us through our help center at help.openrouter.com if you keep seeing this error.',
        type: 'server_error',
        param: null,
        code: null
      }
    }
    mockStreamChunks = [
      `data: ${JSON.stringify(errorChunk)}\n\n`,
      'data: [DONE]\n\n'
    ]

    const { stream } = await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(await convertReadableStreamToArray(stream)).toStrictEqual([
      {
        type: 'error',
        error: {
          message:
            'The server had an error processing your request. Sorry about that! ' +
            'You can retry your request, or contact us through our help center at ' +
            'help.openrouter.com if you keep seeing this error.',
          type: 'server_error',
          code: null,
          param: null
        }
      },
      {
        finishReason: 'error',
        logprobs: undefined,
        type: 'finish',
        usage: {
          completionTokens: Number.NaN,
          promptTokens: Number.NaN
        }
      }
    ])
  })

  it('should handle unparsable stream parts', async () => {
    mockStreamChunks = ['data: {unparsable}\n\n', 'data: [DONE]\n\n']

    const { stream } = await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    const elements = await convertReadableStreamToArray(stream)

    expect(elements.length).toBe(2)
    expect(elements[0]?.type).toBe('error')
    expect(elements[1]).toStrictEqual({
      finishReason: 'error',
      logprobs: undefined,
      type: 'finish',
      usage: {
        completionTokens: Number.NaN,
        promptTokens: Number.NaN
      }
    })
  })

  it('should expose the raw response headers', async () => {
    prepareStreamResponse({ content: [] })

    mockResponseHeaders['test-header'] = 'test-value'

    const { rawResponse } = await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(rawResponse?.headers).toStrictEqual({
      // default headers:
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',

      // custom header
      'test-header': 'test-value'
    })
  })

  it('should pass the model and the prompt', async () => {
    prepareStreamResponse({ content: [] })

    await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(getRequestBodyJson()).toStrictEqual({
      stream: true,
      stream_options: { include_usage: true },
      model: 'openai/gpt-3.5-turbo-instruct',
      prompt: 'Hello'
    })
  })

  it('should pass headers', async () => {
    prepareStreamResponse({ content: [] })

    const provider = createOpenRouter({
      apiKey: 'test-api-key',
      headers: {
        'Custom-Provider-Header': 'provider-header-value'
      }
    })

    await provider.completion('openai/gpt-3.5-turbo-instruct').doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT,
      headers: {
        'Custom-Request-Header': 'request-header-value'
      }
    })

    const requestHeaders = getRequestHeaders()

    expect(requestHeaders).toMatchObject({
      Authorization: 'Bearer test-api-key',
      'Content-Type': 'application/json',
      'Custom-Provider-Header': 'provider-header-value',
      'Custom-Request-Header': 'request-header-value'
    })
  })

  it('should pass extra body', async () => {
    prepareStreamResponse({ content: [] })

    const provider = createOpenRouter({
      apiKey: 'test-api-key',
      extraBody: {
        custom_field: 'custom_value',
        providers: {
          anthropic: {
            custom_field: 'custom_value'
          }
        }
      }
    })

    await provider.completion('openai/gpt-4o').doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    const requestBody = getRequestBodyJson()

    expect(requestBody).toHaveProperty('custom_field', 'custom_value')
    expect(requestBody).toHaveProperty(
      'providers.anthropic.custom_field',
      'custom_value'
    )
  })
})
