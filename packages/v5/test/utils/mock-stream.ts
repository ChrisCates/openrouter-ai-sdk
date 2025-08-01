/**
 * Utilities for creating compatible ReadableStreams for testing
 * that work with the AI SDK's streaming expectations
 */

/**
 * Creates a proper ReadableStream compatible with AI SDK
 * Uses the ReadableStream constructor directly with proper typing
 */
export function createCompatibleStream(
  data: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const chunks = encoder.encode(data)

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(chunks)
      controller.close()
    }
  })
}

/**
 * Creates a Response with a compatible body stream
 * Ensures proper Response body format
 */
export function createStreamResponse(
  data: string,
  headers: Record<string, string> = {}
): Response {
  // Create stream directly in Response constructor for better compatibility
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data))
      controller.close()
    }
  })

  const response = new Response(stream, {
    status: 200,
    headers: new Headers(headers)
  })

  return response
}

/**
 * Creates SSE (Server-Sent Events) formatted data
 */
export function createSSEData(chunks: Record<string, unknown>[]): string {
  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') +
    'data: [DONE]\n\n'
  )
}

/**
 * Creates a streaming response with SSE data
 * This creates a more realistic fetch Response that should be compatible with AI SDK
 */
export function createSSEResponse(chunks: Record<string, unknown>[]): Response {
  const sseData = createSSEData(chunks)

  // Create the ReadableStream manually to ensure it's correct
  // Use proper ReadableStream<Uint8Array> typing to match AI SDK expectations
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseData))
      controller.close()
    }
  })

  // Use the actual Response constructor to create a real Response object
  // This ensures compatibility with AI SDK's provider-utils
  const response = new Response(stream, {
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
  })

  return response
}
