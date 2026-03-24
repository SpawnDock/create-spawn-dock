import { spawn } from "node:child_process"

import { readSpawndockConfig, resolveConfiguredLocalPort } from "./config.mjs"
import { findAvailablePort, waitForPort } from "./port.mjs"

const config = readSpawndockConfig()
const requestedLocalPort = resolveConfiguredLocalPort(config)
const localPort = await findAvailablePort(requestedLocalPort)

if (localPort !== requestedLocalPort) {
  console.warn(
    `SpawnDock local port ${requestedLocalPort} is busy, using ${localPort} instead.`
  )
}

const sharedEnv = {
  ...process.env,
  SPAWNDOCK_PORT: String(localPort),
}

const children = []
let shuttingDown = false

const stopChildren = (signal = "SIGTERM") => {
  shuttingDown = true
  for (const child of [...children].reverse()) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

const onSignal = (signal) => {
  stopChildren(signal)
  process.exit(signal === "SIGINT" ? 130 : 143)
}

process.once("SIGINT", () => onSignal("SIGINT"))
process.once("SIGTERM", () => onSignal("SIGTERM"))

const spawnChild = (command, args, env = sharedEnv) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  })

  children.push(child)

  child.on("exit", (code) => {
    if (shuttingDown) {
      return
    }
    if (typeof code === "number" && code !== 0) {
      stopChildren()
      process.exit(code)
    }
  })

  return child
}

const nextChild = spawnChild("node", ["spawndock/next.mjs"])

try {
  await waitForPort(localPort, {
    isCancelled: () => shuttingDown || nextChild.exitCode !== null,
  })
} catch (error) {
  stopChildren()
  throw error
}

spawnChild("node", ["spawndock/tunnel.mjs"])

const agentChild = spawnChild("node", ["spawndock/session.mjs"], {
  ...process.env,
  SPAWNDOCK_PORT: String(localPort),
})

const exitCode = await new Promise((resolve, reject) => {
  agentChild.once("error", reject)
  agentChild.once("exit", (code) => resolve(typeof code === "number" ? code : 1))
})

stopChildren()
process.exit(exitCode)
