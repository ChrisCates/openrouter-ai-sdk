export interface TestModel {
  name: string
  slug: string
  provider: string
  capabilities: string[]
  toolCalling: boolean
  streaming: boolean
}

export const models: TestModel[] = [
  {
    name: 'GPT-4o Mini',
    slug: 'openai/gpt-4o-mini',
    provider: 'OpenAI',
    capabilities: ['text', 'image'],
    toolCalling: true,
    streaming: true
  },
  {
    name: 'Claude 3.5 Haiku',
    slug: 'anthropic/claude-3.5-haiku',
    provider: 'Anthropic',
    capabilities: ['text'],
    toolCalling: true,
    streaming: true
  },
  {
    name: 'Kimi K2',
    slug: 'moonshotai/kimi-k2',
    provider: 'MoonshotAI',
    capabilities: ['text'],
    toolCalling: true,
    streaming: true
  },
  {
    name: 'Kimi K2 Free',
    slug: 'moonshotai/kimi-k2:free',
    provider: 'MoonshotAI',
    capabilities: ['text'],
    toolCalling: true,
    streaming: true
  },
  {
    name: 'DeepSeek R1-0528',
    slug: 'deepseek/deepseek-r1-0528',
    provider: 'DeepSeek',
    capabilities: ['text', 'reasoning'],
    toolCalling: true,
    streaming: true
  }
]
