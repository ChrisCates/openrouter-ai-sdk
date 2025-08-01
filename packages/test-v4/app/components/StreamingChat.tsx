'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { type TestModel } from '@util/models'

interface StreamingChatProps {
  model: TestModel
  toolsEnabled: boolean
}

export default function StreamingChat({ model, toolsEnabled }: StreamingChatProps) {
  const [streamingStats, setStreamingStats] = useState({
    tokensPerSecond: 0,
    totalTokens: 0,
    streamDuration: 0,
    isStreaming: false
  })

  const streamStartTime = useRef<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop
  } = useChat({
    api: '/api/chat',
    body: {
      model: model.slug,
      toolsEnabled
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm ${model.name} using SDK v4 with streaming enabled. Watch me type in real-time! 🌊\n\nI have access to a Heidegger quotes tool! Try asking me to "give me a Heidegger quote about being" or "get a random philosophical quote". Tools can be toggled using the controls above.`
      }
    ],
    onResponse: () => {
      streamStartTime.current = Date.now()
      setStreamingStats((prev) => ({
        ...prev,
        isStreaming: true,
        tokensPerSecond: 0
      }))
    },
    onFinish: (message) => {
      const duration = (Date.now() - streamStartTime.current) / 1000
      const tokens = message.content.split(/\s+/).length // Rough token estimation
      const tokensPerSecond = Math.round(tokens / duration)

      setStreamingStats({
        tokensPerSecond,
        totalTokens: tokens,
        streamDuration: duration,
        isStreaming: false
      })

      // Log reasoning availability for debugging
      if (message.reasoning) {
        console.log('Reasoning received:', message.reasoning.substring(0, 100) + '...')
      }
    }
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              margin: '0 0 0.5rem 0',
              color: '#1e293b'
            }}
          >
            🌊 {model.name} - Streaming Chat
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
            <strong> Streaming:</strong>{' '}
            {model.streaming ? '✅ Enabled' : '❌ Not Supported'}
          </div>
        </div>

        {/* Streaming Stats */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#64748b',
            backgroundColor: '#f1f5f9',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid #cbd5e1',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontWeight: '600' }}>
            ⚡ {streamingStats.tokensPerSecond} tok/sec
          </span>
          <span style={{ fontWeight: '600' }}>
            📊 {streamingStats.totalTokens} tokens
          </span>
          <span style={{ fontWeight: '600' }}>
            ⏱️ {streamingStats.streamDuration.toFixed(1)}s
          </span>
          {streamingStats.isStreaming && (
            <span style={{ color: '#10b981', fontWeight: '600' }}>🔴 LIVE</span>
          )}
        </div>
      </div>

      <div
        style={{
          height: '450px',
          overflowY: 'auto',
          border: '2px solid #e2e8f0',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fafbfc'
        }}
      >
        {messages.map((message, index) => (
          <div
            key={message.id}
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              borderRadius: '0.75rem',
              backgroundColor: message.role === 'user' ? '#dbeafe' : '#f3e8ff',
              border:
                message.role === 'user'
                  ? '2px solid #3b82f6'
                  : '2px solid #8b5cf6'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}
            >
              <div
                style={{
                  fontWeight: '600',
                  color: message.role === 'user' ? '#1e40af' : '#7c3aed'
                }}
              >
                {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
              </div>

              {/* Show streaming indicator for the last assistant message */}
              {message.role === 'assistant' &&
                index === messages.length - 1 &&
                isLoading && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#10b981',
                        borderRadius: '50%',
                        animation: 'pulse 1s infinite'
                      }}
                    />
                    streaming...
                  </div>
                )}
            </div>

            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: '#374151'
              }}
            >
              {/* Show reasoning if present - AI SDK v5 pattern */}
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
                  
                  {toolInvocation.state === 'partial-call' && (
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
                        🔧 Tool Call (Partial): {toolInvocation.toolName}
                      </div>
                      <div style={{ color: '#78350f' }}>
                        Processing...
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show cursor while streaming */}
              {message.role === 'assistant' &&
                index === messages.length - 1 &&
                isLoading && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '20px',
                      backgroundColor: '#374151',
                      marginLeft: '2px',
                      animation: 'blink 1s infinite'
                    }}
                  />
                )}
            </div>
          </div>
        ))}

        {error && (
          <div
            style={{
              padding: '1rem',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              borderRadius: '0.75rem',
              marginBottom: '1rem',
              border: '2px solid #fecaca'
            }}
          >
            ❌ Error: {error.message}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid #dc2626',
                color: '#dc2626',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask something and watch it stream in real-time..."
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
          onFocus={(e) => (e.target.style.borderColor = '#8b5cf6')}
          onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              minWidth: '100px'
            }}
          >
            ⏹️ Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || !model.streaming}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor:
                !input.trim() || !model.streaming ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              cursor:
                !input.trim() || !model.streaming ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'background-color 0.2s',
              minWidth: '100px'
            }}
          >
            🚀 Send
          </button>
        )}
      </form>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
