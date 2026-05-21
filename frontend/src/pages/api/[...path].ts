import type { NextApiRequest, NextApiResponse } from "next"
import http from "http"

const BACKEND = process.env.BACKEND_INTERNAL_URL || "http://localhost:8000"

export const config = { api: { bodyParser: true, externalResolver: true } }

function proxyRequest(
  method: string,
  targetUrl: string,
  headers: Record<string, string>,
  body: string | undefined,
  res: NextApiResponse,
  resolve: () => void,
  depth = 0
) {
  if (depth > 5) {
    res.status(502).json({ detail: "Too many redirects" })
    return resolve()
  }

  const parsed = new URL(targetUrl)
  const proxyReq = http.request(
    {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers,
    },
    (proxyRes) => {
      // Follow redirects server-side (307, 308, 301, 302)
      if (proxyRes.statusCode && [301, 302, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
        const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString()
        // For 307/308, preserve method and body
        const newMethod = [307, 308].includes(proxyRes.statusCode) ? method : "GET"
        const newBody = [307, 308].includes(proxyRes.statusCode) ? body : undefined
        proxyRequest(newMethod, redirectUrl, headers, newBody, res, resolve, depth + 1)
        return
      }

      res.status(proxyRes.statusCode || 500)
      const ct = proxyRes.headers["content-type"]
      if (ct) res.setHeader("content-type", ct)

      const chunks: Buffer[] = []
      proxyRes.on("data", (chunk) => chunks.push(chunk))
      proxyRes.on("end", () => {
        res.send(Buffer.concat(chunks))
        resolve()
      })
    }
  )

  proxyReq.on("error", (err) => {
    res.status(502).json({ detail: `Proxy error: ${err.message}` })
    resolve()
  })

  if (body) proxyReq.write(body)
  proxyReq.end()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = req.query.path as string[]
  const backendPath = "/" + pathSegments.join("/")
  const targetUrl = BACKEND + backendPath

  const body = req.method !== "GET" && req.method !== "HEAD" && req.body
    ? JSON.stringify(req.body)
    : undefined

  const headers: Record<string, string> = {
    "content-type": "application/json",
  }
  if (req.headers.authorization) {
    headers["authorization"] = req.headers.authorization as string
  }

  return new Promise<void>((resolve) => {
    proxyRequest(req.method || "GET", targetUrl, headers, body, res, resolve)
  })
}
