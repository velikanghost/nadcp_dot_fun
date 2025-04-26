import fetch from 'node-fetch'
import { EventEmitter } from 'events'

/**
 * Simple EventSource implementation for Node.js
 * Based on the EventSource standard
 */
export function createEventSource(url) {
  const emitter = new EventEmitter()
  let source = null

  // Parse data from SSE response
  function parseEvent(chunk) {
    const lines = chunk.toString().split('\n')
    let event = {
      type: 'message',
      data: '',
      lastEventId: '',
    }

    for (const line of lines) {
      if (line.trim() === '') {
        // Empty line means the event is complete, dispatch it
        if (event.data) {
          emitter.emit(event.type, {
            data: event.data,
            lastEventId: event.lastEventId,
            type: event.type,
          })
          event = {
            type: 'message',
            data: '',
            lastEventId: '',
          }
        }
        continue
      }

      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) {
        continue // Malformed line, skip
      }

      const field = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()

      if (field === 'event') {
        event.type = value
      } else if (field === 'data') {
        event.data += value
      } else if (field === 'id') {
        event.lastEventId = value
      } else if (field === 'retry') {
        // Retry time handling could be implemented here
      }
    }
  }

  // Connect to the SSE endpoint
  async function connect() {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      // Store the full URL (might include session ID)
      source.url = response.url

      // Signal that the connection is open
      emitter.emit('open')

      // Start reading the stream
      const reader = response.body.getReader()

      const textDecoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log('Stream closed by server')
          emitter.emit('error', new Error('Stream closed by server'))
          break
        }

        buffer += textDecoder.decode(value, { stream: true })

        // Process complete events
        const events = buffer.split('\n\n')
        buffer = events.pop() || '' // Keep the incomplete event in the buffer

        for (const event of events) {
          if (event.trim()) {
            parseEvent(event + '\n\n') // Add back the event delimiter
          }
        }
      }
    } catch (error) {
      console.error('EventSource error:', error)
      emitter.emit('error', error)
    }
  }

  // Create EventSource-like object
  source = {
    url,
    readyState: 0, // 0 = CONNECTING
    close: function () {
      // Close the connection
      this.readyState = 2 // 2 = CLOSED
      // More cleanup would be needed for a real implementation
    },
    // Event handlers will be set by the user
    onopen: null,
    onmessage: null,
    onerror: null,
  }

  // Connect event handlers
  emitter.on('open', () => {
    source.readyState = 1 // 1 = OPEN
    if (source.onopen) {
      source.onopen()
    }
  })

  emitter.on('message', (event) => {
    if (source.onmessage) {
      source.onmessage(event)
    }
  })

  emitter.on('error', (error) => {
    if (source.onerror) {
      source.onerror(error)
    }
  })

  // Start the connection
  connect()

  return source
}
