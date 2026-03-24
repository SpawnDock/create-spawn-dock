import { spawn } from "node:child_process"

import { readSpawndockConfig, resolveAgentRuntime } from "./config.mjs"

const config = readSpawndockConfig()
const runtime = resolveAgentRuntime(config)
const projectDir = process.cwd()

const buildRuntimeCommand = (selectedRuntime, cwd) => {
  if (selectedRuntime === "codex") {
    return {
      command: "codex",
      args: ["-C", cwd, "-s", "workspace-write", "-a", "on-request"],
    }
  }

  if (selectedRuntime === "claude") {
    return {
      command: "codex",
      args: ["sandbox", "linux", "claude"],
    }
  }

  return {
    command: "codex",
    args: ["sandbox", "linux", "opencode", cwd],
  }
}

const spec = buildRuntimeCommand(runtime, projectDir)
console.log(`Launching ${runtime} in ${projectDir}`)
console.log("Filesystem access is constrained to the project working directory on a best-effort basis.")

const child = spawn(spec.command, spec.args, {
  cwd: projectDir,
  env: process.env,
  stdio: "inherit",
})

child.on("exit", (code) => {
  process.exit(typeof code === "number" ? code : 1)
})

child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})
