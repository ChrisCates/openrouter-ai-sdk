import { generateText } from 'ai'
import { openrouter } from '@openrouter/sdk-v4'
import { heideggerTool } from '@tools/heidegger'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export async function POST(req: Request) {
  if (!OPENROUTER_API_KEY) {
    return Response.json(
      {
        error: 'OPENROUTER_API_KEY environment variable is required'
      },
      { status: 500 }
    )
  }

  try {
    const { messages, model, toolsEnabled = true } = await req.json()

    // Ensure messages is properly formatted
    const formattedMessages = Array.isArray(messages) ? messages.map(msg => ({
      role: msg.role,
      content: msg.content || ''
    })).filter(msg => msg.content && msg.role) : []

    const result = await generateText({
      model: openrouter(model, {
        apiKey: OPENROUTER_API_KEY,
        headers: {
          'HTTP-Referer': 'https://openrouter.ai',
          'X-Title': `OpenRouter SDK v4 React Demo`
        }
      }),
      messages: formattedMessages,
      temperature: 0.7,
      maxTokens: 500,
      toolChoice: toolsEnabled ? 'required' : 'none',
      tools: toolsEnabled ? {
        getHeideggerQuote: heideggerTool
      } : undefined
    })

    // Create tool invocations in the format expected by the UI
    const toolInvocations = []
    
    if (result.toolCalls && Array.isArray(result.toolCalls)) {
      for (const toolCall of result.toolCalls) {
        if (toolCall && toolCall.toolName) {
          toolInvocations.push({
            state: 'call',
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            args: toolCall.args
          })
        }
      }
    }

    if (result.toolResults && Array.isArray(result.toolResults)) {
      for (const toolResult of result.toolResults) {
        if (toolResult && toolResult.result) {
          toolInvocations.push({
            state: 'result',
            toolCallId: toolResult.toolCallId,
            result: toolResult.result
          })
        }
      }
    }

    // Extract content parts for reasoning
    let contentParts: any[] = []
    if (result.response?.messages && result.response.messages.length > 0) {
      const lastMessage = result.response.messages[result.response.messages.length - 1]
      if (lastMessage.content && Array.isArray(lastMessage.content)) {
        contentParts = lastMessage.content
      }
    }

    return Response.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: result.text || '',
            contentParts: contentParts.length > 0 ? contentParts : undefined,
            toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined
          },
          finish_reason: result.finishReason
        }
      ],
      usage: {
        prompt_tokens: result.usage?.promptTokens || 0,
        completion_tokens: result.usage?.completionTokens || 0,
        total_tokens: result.usage?.totalTokens || 0
      }
    })
  } catch (error) {
    console.error('Basic chat API error:', error)
    return Response.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
