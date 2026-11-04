import { Plugin } from "@opencode/plugin"

// Agents managed by this plugin. Extend the map to cover more planning-mode agents.
const AGENTS: Record<string, { name: string; role: string }> = {
  "feature-designer": {
    name: "feature-designer",
    role: "interview the user about desired functionality and produce a change ticket",
  },
  "bug-reporter": {
    name: "bug-reporter",
    role: "interview the user about a bug and produce a bug report ticket",
  },
}

const READ_ONLY_TOOLS = new Set(["edit", "write", "patch", "shell"])

function enterReminder(agentID: string): string {
  const agent = AGENTS[agentID]
  return `<system-reminder>
You are now the ${agent.name} agent, and this session is in planning mode: ${agent.role}. Do not make any changes to the project for now. You have no edit, write, or shell tools by design — their absence is expected, not an error; do not look for workarounds or ask for them to be restored. If earlier messages in this conversation show files being edited, that phase is over. If the user asks you to implement changes, do not do so — tell them they need to switch agents. This reminder supersedes any earlier planning-mode reminder in this conversation.
</system-reminder>`
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
      if (!managed || !READ_ONLY_TOOLS.has(event.tool)) return
      const ToolError = event.error.constructor as new (init: { message: string }) => typeof event.error
      event.error = new ToolError({
        message: `Cannot use ${event.tool} here: the ${managed.name} agent is read-only by design (planning mode). If changes are needed, ask the user to switch agents.`,
      })
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
