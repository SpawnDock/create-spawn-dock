import { describe, expect, it } from "vitest"
import { formatSuccess } from "../src/app/program.js"

describe("formatSuccess", () => {
  it("guides users to pnpm after bootstrap succeeds", () => {
    const output = formatSuccess({
      projectDir: "/tmp/demo-project",
      projectName: "Demo Project",
      previewOrigin: "https://api.example.com/preview/demo-project",
      mcpAgents: ["OpenCode", "Codex"],
    })

    expect(output).toContain("Dependencies already installed with pnpm.")
    expect(output).toContain('cd "/tmp/demo-project"')
    expect(output).toContain("pnpm run agent")
    expect(output).not.toContain("&&")
    expect(output).not.toContain("npm run dev")
  })
})
