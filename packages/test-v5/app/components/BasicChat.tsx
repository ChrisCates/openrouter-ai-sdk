'use client'
import React, { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { type TestModel } from '@util/models'

interface BasicChatProps {
  model: TestModel
  toolsEnabled: boolean
}

export default function BasicChat({ model, toolsEnabled }: BasicChatProps) {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat-basic',
      body: {
        model: model.slug,
        toolsEnabled
      }
    }),
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: `Hello! I'm ${model.name} using SDK v5. Ask me anything!\n\nI have access to a Heidegger quotes tool! Try asking me to "give me a Heidegger quote about being" or "get a random philosophical quote". Tools can be toggled using the controls above.` }]
      }
    ] as UIMessage[]
  })

  const [input, setInput] = useState('')
  const isLoading = status !== 'ready' && status !== 'error'

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: '0 0 0.5rem 0',
            color: '#1e293b'
          }}
        >
          💬 {model.name} - Basic Chat
        </h2>
        <div
          style={{
            fontSize: '0.875rem',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}
        >
          <strong>Provider:</strong> {model.provider} |
          <strong> Capabilities:</strong> {model.capabilities.join(', ')}
        </div>
      </div>

      <div
        style={{
          height: '400px',
          overflowY: 'auto',
          border: '2px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fafbfc'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: message.role === 'user' ? '#dbeafe' : '#f3e8ff',
              border:
                message.role === 'user'
                  ? '1px solid #3b82f6'
                  : '1px solid #8b5cf6'
            }}
          >
            <div
              style={{
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: message.role === 'user' ? '#1e40af' : '#7c3aed'
              }}
            >
              {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
            </div>
            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: '#374151'
              }}
            >
              {(message.parts || []).map((part, partIndex) => {
                if (part.type === 'text') {
                  return <span key={partIndex}>{part.text}</span>
                } else if (part.type?.startsWith('tool-')) {
                  return (
                    <div
                      key={partIndex}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
                        🔧 Tool Call: {part.type}
                      </div>
                    </div>
                  )
                } else if (part.type === 'tool-result') {
                  try {
                    const result = typeof (part as any).result === 'string' ? JSON.parse((part as any).result) : (part as any).result;
                    return (
                      <div
                        key={partIndex}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: '#dcfce7',
                          border: '2px solid #22c55e',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '0.25rem' }}>
                          📖 Tool Result:
                        </div>
                        {result && typeof result === 'object' && 'quote' in result ? (
                          <>
                            <div style={{ color: '#166534', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                              "{result.quote}"
                            </div>
                            <div style={{ color: '#166534', fontSize: '0.75rem' }}>
                              — {result.author} ({result.category} category)
                            </div>
                          </>
                        ) : (
                          <div style={{ color: '#166534' }}>
                            {JSON.stringify(result, null, 2)}
                          </div>
                        )}
                      </div>
                    )
                  } catch {
                    return (
                      <div key={partIndex} style={{ color: '#dc2626' }}>
                        Tool result: {JSON.stringify((part as any).result)}
                      </div>
                    )
                  }
                }
                return null
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              padding: '1rem',
              fontStyle: 'italic',
              color: '#6b7280',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              border: '1px dashed #d1d5db'
            }}
          >
            🔄 Thinking...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '1rem',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              border: '1px solid #fecaca'
            }}
          >
            ❌ Error: {error?.message}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (input.trim() && !isLoading) {
            sendMessage({ text: input })
            setInput('')
          }
        }}
        style={{ display: 'flex', gap: '0.75rem' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: '2px solid #d1d5db',
            borderRadius: '0.75rem',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            backgroundColor: isLoading ? '#f9fafb' : 'white'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
          onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: isLoading || !input.trim() ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            transition: 'background-color 0.2s',
            minWidth: '100px'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
