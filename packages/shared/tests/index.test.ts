import { describe, expect, it } from 'bun:test'
import {
  createDefaultConfig,
  HttpClient,
  OpenRouterError,
  validateApiKey
} from '../src/index'

describe('Shared utilities', () => {
  describe('validateApiKey', () => {
    it('should accept valid API key', () => {
      expect(() => validateApiKey('sk-or-v1-test-key')).not.toThrow()
    })

    it('should reject invalid API key format', () => {
      expect(() => validateApiKey('invalid-key')).toThrow(
        'Invalid API key format'
      )
    })

    it('should reject empty API key', () => {
      expect(() => validateApiKey('')).toThrow('API key is required')
    })
  })

  describe('createDefaultConfig', () => {
    it('should create config with valid API key', () => {
      const config = createDefaultConfig('sk-or-v1-test-key')
      expect(config.apiKey).toBe('sk-or-v1-test-key')
      expect(config.baseURL).toBe('https://openrouter.ai/api/v1')
    })
  })

  describe('OpenRouterError', () => {
    it('should create error with message and status', () => {
      const error = new OpenRouterError('Test error', 400)
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(400)
      expect(error.name).toBe('OpenRouterError')
    })
  })

  describe('HttpClient', () => {
    it('should initialize with config', () => {
      const config = { apiKey: 'sk-or-v1-test-key' }
      const client = new HttpClient(config)
      expect(client).toBeInstanceOf(HttpClient)
    })
  })
})
