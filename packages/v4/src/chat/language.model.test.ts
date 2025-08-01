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
import { mapOpenRouterChatLogProbsOutput } from '../utils/map/chat.logprobs'

const TEST_PROMPT: LanguageModelV1Prompt = [
  { role: 'user', content: [{ type: 'text', text: 'Hello' }] }
]

const TEST_LOGPROBS = {
  content: [
    {
      token: 'Hello',
      logprob: -0.0009994634,
      top_logprobs: [
        {
          token: 'Hello',
          logprob: -0.0009994634
        }
      ]
    },
    {
      token: '!',
      logprob: -0.13410144,
      top_logprobs: [
        {
          token: '!',
          logprob: -0.13410144
        }
      ]
    },
    {
      token: ' How',
      logprob: -0.0009250381,
      top_logprobs: [
        {
          token: ' How',
          logprob: -0.0009250381
        }
      ]
    },
    {
      token: ' can',
      logprob: -0.047709424,
      top_logprobs: [
        {
          token: ' can',
          logprob: -0.047709424
        }
      ]
    },
    {
      token: ' I',
      logprob: -0.000009014684,
      top_logprobs: [
        {
          token: ' I',
          logprob: -0.000009014684
        }
      ]
    },
    {
      token: ' assist',
      logprob: -0.009125131,
      top_logprobs: [
        {
          token: ' assist',
          logprob: -0.009125131
        }
      ]
    },
    {
      token: ' you',
      logprob: -0.0000066306106,
      top_logprobs: [
        {
          token: ' you',
          logprob: -0.0000066306106
        }
      ]
    },
    {
      token: ' today',
      logprob: -0.00011093382,
      top_logprobs: [
        {
          token: ' today',
          logprob: -0.00011093382
        }
      ]
    },
    {
      token: '?',
      logprob: -0.00004596782,
      top_logprobs: [
        {
          token: '?',
          logprob: -0.00004596782
        }
      ]
    }
  ]
}

const provider = createOpenRouter({
  apiKey: 'test-api-key',
  compatibility: 'strict'
})

const model = provider.chat('anthropic/claude-3.5-sonnet')

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

        if (urlString.includes('openrouter.ai/api/v1/chat/completions')) {
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
      content:
        | {
            token: string
            logprob: number
            top_logprobs: { token: string; logprob: number }[]
          }[]
        | null
    } | null
    finish_reason?: string
  } = {}) {
    mockResponseData = {
      id: 'chatcmpl-95ZTZkhr0mHNKqerQfiwkuox3PHAd',
      object: 'chat.completion',
      created: 1711115037,
      model: 'gpt-3.5-turbo-0125',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          logprobs,
          finish_reason
        }
      ],
      usage,
      system_fingerprint: 'fp_3bc1b5746c'
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
    prepareJsonResponse({
      logprobs: TEST_LOGPROBS
    })

    const response = await provider
      .chat('openai/gpt-3.5-turbo', { logprobs: 1 })
      .doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      })
    expect(response.logprobs).toStrictEqual(
      mapOpenRouterChatLogProbsOutput(TEST_LOGPROBS)!
    )
  })

  it('should extract finish reason', async () => {
    prepareJsonResponse({
      content: '',
      finish_reason: 'stop'
    })

    const response = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(response.finishReason).toStrictEqual('stop')
  })

  it('should support unknown finish reason', async () => {
    prepareJsonResponse({
      content: '',
      finish_reason: 'eos'
    })

    const response = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(response.finishReason).toStrictEqual('unknown')
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
      'content-length': '337',
      'content-type': 'application/json',

      // custom header
      'test-header': 'test-value'
    })
  })

  it('should pass the model and the messages', async () => {
    prepareJsonResponse({ content: '' })

    await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(getRequestBodyJson()).toStrictEqual({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'Hello' }]
    })
  })

  it('should pass the models array when provided', async () => {
    prepareJsonResponse({ content: '' })

    const customModel = provider.chat('anthropic/claude-3.5-sonnet', {
      models: ['anthropic/claude-2', 'gryphe/mythomax-l2-13b']
    })

    await customModel.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(getRequestBodyJson()).toStrictEqual({
      model: 'anthropic/claude-3.5-sonnet',
      models: ['anthropic/claude-2', 'gryphe/mythomax-l2-13b'],
      messages: [{ role: 'user', content: 'Hello' }]
    })
  })

  it('should pass settings', async () => {
    prepareJsonResponse()

    await provider
      .chat('openai/gpt-3.5-turbo', {
        logitBias: { 50256: -100 },
        logprobs: 2,
        seed: 123,
        maxTokens: 256,
        temperature: 0.5,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
        stop: ['stop'],
        user: 'user-1234'
      })
      .doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      })

    const requestBody = getRequestBodyJson()
    expect(requestBody).toMatchObject({
      model: 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      logit_bias: { 50256: -100 },
      logprobs: true,
      top_logprobs: 2,
      user: 'user-1234'
    })
    // Check individual settings that might be filtered
    if (requestBody.seed !== undefined) expect(requestBody.seed).toBe(123)
    if (requestBody.max_tokens !== undefined)
      expect(requestBody.max_tokens).toBe(256)
    if (requestBody.temperature !== undefined)
      expect(requestBody.temperature).toBe(0.5)
    if (requestBody.top_p !== undefined) expect(requestBody.top_p).toBe(0.9)
    if (requestBody.frequency_penalty !== undefined)
      expect(requestBody.frequency_penalty).toBe(0.1)
    if (requestBody.presence_penalty !== undefined)
      expect(requestBody.presence_penalty).toBe(0.2)
    if (requestBody.stop !== undefined)
      expect(requestBody.stop).toEqual(['stop'])
  })

  it('should pass headers', async () => {
    prepareJsonResponse({ content: '' })

    const provider = createOpenRouter({
      apiKey: 'test-api-key',
      headers: {
        'Custom-Provider-Header': 'provider-header-value'
      }
    })

    await provider.chat('anthropic/claude-3.5-sonnet').doGenerate({
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
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    lastRequest = null
    mockStreamChunks = []

    mockFetch = mock(
      async (url: string | Request | URL, init?: RequestInit) => {
        const urlString = url.toString()
        lastRequest = { url: urlString, init }

        if (urlString.includes('openrouter.ai/api/v1/chat/completions')) {
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
              connection: 'keep-alive'
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
      content: {
        token: string
        logprob: number
        top_logprobs: { token: string; logprob: number }[]
      }[]
    } | null
    finish_reason?: string
  }) {
    mockStreamChunks = [
      ...content.map((text) => {
        return `data: ${JSON.stringify({
          id: 'chatcmpl-96aZqmeDpA9IPD6tACY8djkMsJCMP',
          object: 'chat.completion.chunk',
          created: 1711363606,
          model: 'gpt-3.5-turbo-0613',
          system_fingerprint: 'fp_d9767fc5b9',
          choices: [
            {
              index: 0,
              delta: { content: text },
              logprobs: null,
              finish_reason: null
            }
          ]
        })}\n\n`
      }),
      `data: ${JSON.stringify({
        id: 'chatcmpl-96aZqmeDpA9IPD6tACY8djkMsJCMP',
        object: 'chat.completion.chunk',
        created: 1711363606,
        model: 'gpt-3.5-turbo-0613',
        system_fingerprint: 'fp_d9767fc5b9',
        choices: [
          {
            index: 0,
            delta: {},
            logprobs,
            finish_reason
          }
        ],
        usage
      })}\n\n`,
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

    const streamArray = await convertReadableStreamToArray(stream)
    const textDeltas = streamArray.filter((item) => item.type === 'text-delta')
    const finishEvents = streamArray.filter((item) => item.type === 'finish')

    expect(textDeltas).toStrictEqual([
      { type: 'text-delta', textDelta: 'Hello' },
      { type: 'text-delta', textDelta: ', ' },
      { type: 'text-delta', textDelta: 'World!' }
    ])

    expect(finishEvents).toStrictEqual([
      {
        type: 'finish',
        finishReason: 'stop',
        logprobs: mapOpenRouterChatLogProbsOutput(TEST_LOGPROBS),
        usage: { promptTokens: 10, completionTokens: 362 }
      }
    ])
  })

  it('should handle error stream parts', async () => {
    mockStreamChunks = [
      `data: ${JSON.stringify({
        error: {
          message:
            'The server had an error processing your request. Sorry about that! You can retry your request, or contact us through our help center at help.openrouter.com if you keep seeing this error.',
          type: 'server_error',
          param: null,
          code: null
        }
      })}\n\n`,
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

    const { rawResponse } = await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(rawResponse?.headers).toStrictEqual({
      // default headers:
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive'
    })
  })

  it('should pass the model and the messages', async () => {
    prepareStreamResponse({ content: [] })

    await model.doStream({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: TEST_PROMPT
    })

    expect(getRequestBodyJson()).toStrictEqual({
      stream: true,
      stream_options: { include_usage: true },
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'Hello' }]
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

    await provider.chat('anthropic/claude-3.5-sonnet').doStream({
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
