#!/usr/bin/env node
import { Effect } from "effect"
import { program } from "./program.js"

Effect.runPromise(program).catch((error) => {
  console.error(error)
  process.exit(1)
})
