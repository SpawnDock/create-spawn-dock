import { spawn } from "node:child_process"
import { setTimeout } from "node:timers"

import { readSpawndockConfig, resolveConfiguredLocalPort } from "./config.mjs"
import { findAvailablePort, waitForPort } from "./port.mjs"

const children = []
let shuttingDown = false

const config = readSpawndockConfig()
const requestedLocalPort = resolveConfiguredLocalPort(config)
const localPort = await findAvailablePort(requestedLocalPort)
const sharedEnv = {
  ...process.env,
  SPAWNDOCK_PORT: String(localPort),
}

if (localPort !== requestedLocalPort) {
  console.warn(
    `SpawnDock local port ${requestedLocalPort} is busy, using ${localPort} instead.`
  )
}

const stopChildren = (signal) => {
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal ?? "SIGTERM")
    }
  }
}

process.on("SIGINT", () => {
  stopChildren("SIGINT")
  process.exit(0)
})

process.on("SIGTERM", () => {
  stopChildren("SIGTERM")
  process.exit(0)
})

const spawnChild = (command, args) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: sharedEnv,
    stdio: "inherit",
  })

  children.push(child)

  child.on("exit", (code) => {
    if (typeof code === "number" && code !== 0) {
      stopChildren()
      process.exit(code)
    }
  })

  return child
}

const nextChild = spawnChild("node", ["spawndock/next.mjs"])

await waitForPort(localPort, {
  isCancelled: () => shuttingDown || nextChild.exitCode !== null,
})

spawnChild("node", ["spawndock/tunnel.mjs"])

setTimeout(() => {
  console.log("SpawnDock dev session is ready.")
}, 0)
