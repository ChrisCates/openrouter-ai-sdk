'use client'

import React, { useState } from 'react'
import { type TestModel } from '@util/models'

interface BasicChatProps {
  model: TestModel
  toolsEnabled: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolInvocations?: any[]
}

export default function BasicChat({ model, toolsEnabled }: BasicChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm ${model.name} using SDK v4. Ask me anything!\n\nI have access to a Heidegger quotes tool! Try asking me to "give me a Heidegger quote about being" or "get a random philosophical quote". Tools can be toggled using the controls above.`
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content
          })),
          model: model.slug,
          toolsEnabled
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      let reasoning: string | undefined
      let textContent = data.choices[0].message.content

      // Extract reasoning if present in the response
      if (data.choices[0].message.contentParts) {
        const reasoningPart = data.choices[0].message.contentParts.find(
          (part: any) => part.type === 'reasoning'
        )
        const textPart = data.choices[0].message.contentParts.find(
          (part: any) => part.type === 'text'
        )
        
        if (reasoningPart?.text) {
          reasoning = reasoningPart.text
        }
        if (textPart?.text) {
          textContent = textPart.text
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: textContent,
        reasoning,
        toolInvocations: data.choices[0].message.toolInvocations
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

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
              {/* Show reasoning if present */}
              {message.reasoning && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#f0f9ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem' }}>
                    🧠 Reasoning Trace:
                  </div>
                  <div
                    style={{
                      color: '#075985',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem'
                    }}
                  >
                    {message.reasoning}
                  </div>
                </div>
              )}
              
              {message.content}
              
              {/* Show tool calls and results */}
              {message.toolInvocations && message.toolInvocations.map((toolInvocation, toolIndex) => (
                <div key={toolIndex} style={{ marginTop: '0.5rem' }}>
                  {toolInvocation.state === 'call' && (
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
                        🔧 Tool Call: {toolInvocation.toolName}
                      </div>
                      <div style={{ color: '#78350f' }}>
                        Arguments: {JSON.stringify(toolInvocation.args, null, 2)}
                      </div>
                    </div>
                  )}
                  
                  {toolInvocation.state === 'result' && (
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#dcfce7',
                        border: '2px solid #22c55e',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '0.25rem' }}>
                        📖 Tool Result:
                      </div>
                      {toolInvocation.result && typeof toolInvocation.result === 'object' && 'quote' in toolInvocation.result ? (
                        <>
                          <div style={{ color: '#166534', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                            "{toolInvocation.result.quote}"
                          </div>
                          <div style={{ color: '#166534', fontSize: '0.75rem' }}>
                            — {toolInvocation.result.author} ({toolInvocation.result.category} category)
                          </div>
                        </>
                      ) : (
                        <div style={{ color: '#166534' }}>
                          {JSON.stringify(toolInvocation.result, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {toolInvocation.state === 'error' && (
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#fef2f2',
                        border: '2px solid #ef4444',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '0.25rem' }}>
                        ❌ Tool Error:
                      </div>
                      <div style={{ color: '#dc2626' }}>
                        {toolInvocation.error || 'Unknown error occurred'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
            ❌ Error: {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
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
