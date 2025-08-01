/**
 * Polyfill for TextDecoderStream and TextEncoderStream in Bun
 * Based on https://github.com/oven-sh/bun/issues/5648
 */

// declare global {
//   class TextDecoderStream {
//     constructor(encoding?: string, options?: TextDecoderOptions)
//     readonly readable: ReadableStream<string>
//     readonly writable: WritableStream<Uint8Array>
//   }

//   class TextEncoderStream {
//     constructor()
//     readonly readable: ReadableStream<Uint8Array>
//     readonly writable: WritableStream<string>
//   }
// }

export function installTextStreamPolyfills() {
  if (typeof globalThis.TextDecoderStream === 'undefined') {
    globalThis.TextDecoderStream = class TextDecoderStream {
      readable: ReadableStream<string>
      writable: WritableStream<Uint8Array>

      constructor(encoding = 'utf-8', options: TextDecoderOptions = {}) {
        const decoder = new TextDecoder(encoding, options)
        let controller: ReadableStreamDefaultController<string>

        // Create a ReadableStream that has better compatibility with Bun's pipeThrough
        this.readable = new ReadableStream<string>({
          start(c) {
            controller = c
          }
        })

        this.writable = new WritableStream<Uint8Array>({
          write(chunk) {
            const decoded = decoder.decode(chunk, { stream: true })
            if (decoded) {
              controller.enqueue(decoded)
            }
          },
          close() {
            // Flush any remaining bytes
            const finalDecoded = decoder.decode()
            if (finalDecoded) {
              controller.enqueue(finalDecoded)
            }
            controller.close()
          },
          abort(reason: unknown) {
            controller.error(reason)
          }
        })

        // Override pipeThrough to work around Bun's chaining issues
        this.readable.pipeThrough = function <T>(
          this: ReadableStream<string>,
          transform: {
            writable: WritableStream<string>
            readable: ReadableStream<T>
          }
        ): ReadableStream<T> {
          // For Bun compatibility, manually handle the pipe operation
          const reader = this.getReader()
          const writer = transform.writable.getWriter()

          // Pipe data manually
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  await writer.close()
                  break
                }
                await writer.write(value)
              }
            } catch (error) {
              await writer.abort(error)
              throw error
            }
          }

          pump().catch((error) => {
            console.error('TextDecoderStream pipeThrough error:', error)
          })

          return transform.readable
        }
      }
    } as unknown as typeof TextDecoderStream
  }

  if (typeof globalThis.TextEncoderStream === 'undefined') {
    globalThis.TextEncoderStream = class TextEncoderStream {
      readable: ReadableStream<Uint8Array>
      writable: WritableStream<string>

      constructor() {
        const encoder = new TextEncoder()
        let controller: ReadableStreamDefaultController<Uint8Array>

        this.readable = new ReadableStream<Uint8Array>({
          start(c) {
            controller = c
          }
        })

        this.writable = new WritableStream<string>({
          write(chunk) {
            const encoded = encoder.encode(chunk)
            controller.enqueue(encoded)
          },
          close() {
            controller.close()
          },
          abort(reason: unknown) {
            controller.error(reason)
          }
        })
      }
    } as unknown as typeof TextEncoderStream
  }
}
