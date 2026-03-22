import { createServer, createConnection } from "node:net"

const PORT_CHECK_TIMEOUT_MS = 500
const PORT_READY_TIMEOUT_MS = 30_000
const PORT_READY_POLL_MS = 200
const MAX_PORT_ATTEMPTS = 20

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })

export const isPortAvailable = (port) =>
  new Promise((resolve, reject) => {
    const server = createServer()

    server.unref()

    server.once("error", (error) => {
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "EADDRINUSE" || error.code === "EACCES") {
          resolve(false)
          return
        }
      }

      reject(error)
    })

    server.listen(port, () => {
      server.close(() => resolve(true))
    })
  })

export const findAvailablePort = async (preferredPort) => {
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset += 1) {
    const candidate = preferredPort + offset
    if (await isPortAvailable(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `Could not find a free local port starting from ${preferredPort} after ${MAX_PORT_ATTEMPTS} attempts`
  )
}

export const isPortReachable = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({
      host: "127.0.0.1",
      port,
    })

    socket.setTimeout(PORT_CHECK_TIMEOUT_MS)

    const finalize = (result) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(result)
    }

    socket.once("connect", () => finalize(true))
    socket.once("timeout", () => finalize(false))
    socket.once("error", () => finalize(false))
  })

export const waitForPort = async (port, options = {}) => {
  const timeoutMs = options.timeoutMs ?? PORT_READY_TIMEOUT_MS
  const pollMs = options.pollMs ?? PORT_READY_POLL_MS
  const isCancelled = options.isCancelled ?? (() => false)
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (isCancelled()) {
      throw new Error(`Local dev server exited before port ${port} became ready`)
    }

    if (await isPortReachable(port)) {
      return
    }

    await wait(pollMs)
  }

  throw new Error(`Timed out waiting for local dev server on port ${port}`)
}
