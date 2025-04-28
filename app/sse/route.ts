import { createServerResponseAdapter } from '@/lib/server-response-adapter'
import { mcpHandler } from '../mcp'

export const maxDuration = 60

export async function GET(req: Request) {
  // Add the required Content-Type header for SSE
  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache')
  headers.set('Connection', 'keep-alive')

  return createServerResponseAdapter(req.signal, (res) => {
    // Set the headers on the response
    res.writeHead(200, Object.fromEntries(headers.entries()))
    mcpHandler(req, res)
  })
}
