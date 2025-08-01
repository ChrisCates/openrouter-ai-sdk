/**
 * Parses tool call input from JSON string
 */
export function parseToolCallInput<T = unknown>(input: string): T {
  try {
    return JSON.parse(input)
  } catch {
    throw new Error('Invalid JSON in tool call input')
  }
}
