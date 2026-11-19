import { Plugin } from "@opencode/plugin"

/** A planning-mode agent and the deliverable it may save, if any. */
type AgentConfig = {
  name: string
  role: string
  /** Folder the agent may write to when saving its deliverable. */
  writes?: string
  /** Read-only shell access, limited to inspection and running existing programs. */
  shell?: "inspect"
}

// Agents managed by this plugin. Extend the map to cover more planning-mode agents.
const AGENTS: Record<string, AgentConfig> = {
  "feature-designer": {
    name: "feature-designer",
    role: "turn settled requirements or a described change into a build-ready implementation spec with concrete technology and architecture decisions",
    writes: "docs/specs/",
    shell: "inspect",
  },
  "bug-reporter": {
    name: "bug-reporter",
    role: "diagnose and reproduce a reported bug and produce a bug report with a build-ready fix spec",
    writes: "docs/bugs/",
    shell: "inspect",
  },
  "product-designer": {
    name: "product-designer",
    role: "interview the user about product-level functionality and produce a requirements brief with no technical or architectural decisions",
    writes: "docs/requirements/",
    shell: "inspect",
  },
}

const WRITE_TOOLS = new Set(["edit", "write", "patch"])

/** Explains what an agent may change in planning mode, including its shell policy. */
function boundary(agent: AgentConfig): string {
  const shell =
    agent.shell === "inspect"
      ? "You may use shell only for read-only inspection: environment and version probes, repository inspection, and running existing programs or tests. Never build, install, or change files, and never mutate git state."
      : "You have no shell tools by design — their absence is expected, not an error; do not look for workarounds or ask for them to be restored."
  if (agent.writes === undefined) {
    return `Do not make any changes to the project for now. ${shell}`
  }
  return `Do not change the project beyond saving the finished deliverable to \`${agent.writes}\` when the user asks. Your only write access is that folder — never edit source, configuration, or anything outside it; denials are by design, not an error, so do not look for workarounds. ${shell}`
}

function enterReminder(agentID: string): string {
  const agent = AGENTS[agentID]
  return `<system-reminder>
You are now the ${agent.name} agent, and this session is in planning mode: ${agent.role}. ${boundary(agent)} If earlier messages in this conversation show files being edited, that phase is over. If the user asks you to implement changes, do not do so — tell them they need to switch agents. This reminder supersedes any earlier planning-mode reminder in this conversation.
</system-reminder>`
}

/** Explains why a blocked tool call was denied for this agent, or undefined if it was not a blocked action. */
function blockedMessage(agent: AgentConfig, tool: string, original: string): string | undefined {
  if (tool === "shell") {
    if (agent.shell === "inspect") return undefined
    return `Cannot use shell here: the ${agent.name} agent has no shell access by design (planning mode). If changes are needed, ask the user to switch agents.`
  }
  if (!WRITE_TOOLS.has(tool)) return undefined
  if (agent.writes === undefined) {
    return `Cannot use ${tool} here: the ${agent.name} agent is read-only by design (planning mode). If changes are needed, ask the user to switch agents.`
  }
  return `Cannot use ${tool} here: the ${agent.name} agent may only write to \`${agent.writes}\` (planning mode). If the change belongs elsewhere, ask the user to switch agents.\n\nOriginal error: ${original}`
}

function leaveReminder(previous?: string): string {
  const name = previous !== undefined && AGENTS[previous] ? `the ${AGENTS[previous].name} agent` : undefined
  return `<system-reminder>
${name !== undefined ? `You are no longer ${name}. Its planning-mode restrictions` : "The session is no longer in planning mode. The planning-mode restrictions"} no longer apply. Any planning-mode instructions from earlier in this conversation are no longer active.
</system-reminder>`
}

const ENTER_REMINDERS = new Set(Object.keys(AGENTS).map(enterReminder))
const KNOWN_REMINDERS = new Set([
  ...ENTER_REMINDERS,
  ...Object.keys(AGENTS).map((id) => leaveReminder(id)),
  leaveReminder(),
])

export default Plugin.define({
  id: "planning-mode",
  setup(ctx) {
    // Switch-time reminders: plant the mode change in the conversation timeline
    // at the exact point the agent changes, mirroring the built-in Plan plugin.
    const controller = new AbortController()
    void (async () => {
      for await (const event of ctx.event.subscribe({
        types: ["session.created", "session.agent.selected"],
        signal: controller.signal,
      })) {
        const data = event.data as { sessionID: string; agent?: string; previous?: string }
        const text = switchReminder(event.type, data)
        if (!text) continue
        await ctx.session.synthetic({ sessionID: data.sessionID, text, resume: false }).catch((error) => {
          console.error("planning-mode: failed to persist reminder", error)
        })
      }
    })()

    // Per-request reconciliation: compaction or reverts can strip reminders from
    // history. If the mode message is missing or stale, re-add it as a system
    // instruction for this request.
    void ctx.session.hook("context", (event) => {
      let found: string | undefined
      for (const message of event.messages) {
        if (message.role !== "user" || message.content.length !== 1) continue
        const part = message.content[0]
        if (part.type !== "text" || !KNOWN_REMINDERS.has(part.text)) continue
        found = part.text
      }
      const managed = AGENTS[event.agent]
      if (managed) {
        const desired = enterReminder(event.agent)
        if (found !== desired) event.system.push({ type: "text", text: desired })
        return
      }
      if (found !== undefined && ENTER_REMINDERS.has(found)) {
        event.system.push({ type: "text", text: leaveReminder() })
      }
    })

    // Blocked-tool rewriting: when the model reaches for edit/write/patch/shell,
    // make the failure explain the mode boundary instead of looking broken.
    void ctx.tool.hook("execute.after", (event) => {
      if (event.status !== "error") return
      const managed = AGENTS[event.agent]
      if (!managed) return
      const message = blockedMessage(managed, event.tool, event.error.message)
      if (message === undefined) return
      const ToolError = event.error.constructor as new (init: { message: string }) => typeof event.error
      event.error = new ToolError({ message })
    })

    return () => controller.abort()
  },
})

function switchReminder(
  type: string,
  data: { agent?: string; previous?: string },
): string | undefined {
  if (type === "session.created") {
    return data.agent !== undefined && AGENTS[data.agent] ? enterReminder(data.agent) : undefined
  }
  if (data.agent === data.previous) return undefined
  if (data.agent !== undefined && AGENTS[data.agent]) return enterReminder(data.agent)
  if (data.previous !== undefined && AGENTS[data.previous]) return leaveReminder(data.previous)
  return undefined
}
