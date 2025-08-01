'use client'

import React, { useState } from 'react'
import { models, type TestModel } from '@util/models'
import BasicChat from './components/BasicChat'
import StreamingChat from './components/StreamingChat'

type ChatMode = 'basic' | 'streaming'

export default function Home() {
  const [selectedMode, setChatMode] = useState<ChatMode>('basic')
  const [selectedModel, setSelectedModel] = useState<TestModel>(models[0])
  const [toolsEnabled, setToolsEnabled] = useState(true)

  return (
    <>
      <title>OpenRouter AI SDK - React Demo</title>
      <meta
        name="description"
        content="Test both v4 and v5 OpenRouter AI SDK with React"
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <main
        style={{
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#f8fafc'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1
              style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              🚀 OpenRouter AI SDK v5 - React Demo
            </h1>
            <p
              style={{
                fontSize: '1.25rem',
                color: '#64748b',
                maxWidth: '600px',
                margin: '0 auto'
              }}
            >
              Test OpenRouter AI SDK v5 with basic and streaming chat
              functionality using Next.js App Router and AI SDK v5
            </p>
          </div>

          {/* Control Panel */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}
          >
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#1e293b'
              }}
            >
              🎛️ Configuration
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem'
              }}
            >
              {/* SDK Version Display */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#374151'
                  }}
                >
                  SDK Version:
                </label>
                <div
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '2px solid #8b5cf6',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}
                >
                  V5 (AI SDK v5)
                </div>
              </div>

              {/* Chat Mode and Tools Selection */}
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      color: '#374151'
                    }}
                  >
                    Chat Mode:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['basic', 'streaming'] as ChatMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setChatMode(mode)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: '2px solid',
                          borderColor:
                            selectedMode === mode ? '#8b5cf6' : '#d1d5db',
                          backgroundColor:
                            selectedMode === mode ? '#8b5cf6' : 'white',
                          color: selectedMode === mode ? 'white' : '#374151',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {mode === 'basic' ? '⚡ Generate' : '🌊 Stream'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: '600',
                      marginBottom: '0.5rem',
                      color: '#374151'
                    }}
                  >
                    Tools:
                  </label>
                  <button
                    onClick={() => setToolsEnabled(!toolsEnabled)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '2px solid',
                      borderColor: toolsEnabled ? '#22c55e' : '#ef4444',
                      backgroundColor: toolsEnabled ? '#22c55e' : '#ef4444',
                      color: 'white',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {toolsEnabled ? '🔧 Enabled' : '❌ Disabled'}
                  </button>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#374151'
                  }}
                >
                  Model:
                </label>
                <select
                  value={selectedModel.slug}
                  onChange={(e) => {
                    const model = models.find((m) => m.slug === e.target.value)
                    if (model) setSelectedModel(model)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: '2px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                >
                  {models.map((model) => (
                    <option key={model.slug} value={model.slug}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Configuration Display */}
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1'
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#475569'
                }}
              >
                Current Configuration:
              </h3>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                <span style={{ fontWeight: '600' }}>Mode:</span> {selectedMode}{' '}
                |<span style={{ fontWeight: '600' }}> Model:</span>{' '}
                {selectedModel.name}
                {selectedMode === 'streaming' && !selectedModel.streaming && (
                  <span style={{ color: '#ef4444', fontWeight: '600' }}>
                    {' '}
                    ⚠️ Model doesn&apos;t support streaming
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {selectedMode === 'basic' ? (
              <BasicChat
                model={selectedModel}
                toolsEnabled={toolsEnabled}
                key={`${selectedModel.slug}-basic`}
              />
            ) : (
              <StreamingChat
                model={selectedModel}
                toolsEnabled={toolsEnabled}
                key={`${selectedModel.slug}-streaming`}
              />
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '3rem',
              padding: '2rem',
              color: '#64748b',
              fontSize: '0.875rem'
            }}
          >
            <p>
              🔑 Make sure to set your{' '}
              <code
                style={{
                  backgroundColor: '#f1f5f9',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontFamily: 'monospace'
                }}
              >
                OPENROUTER_API_KEY
              </code>{' '}
              environment variable
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Get your API key from{' '}
              <a
                href="https://openrouter.ai/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'underline' }}
              >
                OpenRouter Settings
              </a>
            </p>
            <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
              Using AI SDK v5 with Next.js App Router! 🎉
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
