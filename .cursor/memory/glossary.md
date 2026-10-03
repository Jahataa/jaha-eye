# Glossary

| Term | Definition |
|------|------------|
| **Agent** | Saved definition: name, model, system prompt, tools. Not a running process. |
| **Run** | One execution of an agent definition. Has status, input, output, events. |
| **Event** | AG-UI protocol message (RUN_STARTED, TOOL_CALL_START, etc.) stored in `AgentRunEvent`. |
| **Control plane** | UI, API, database — manages definitions and runs. |
| **Data plane** | Strands runtime, models, tools — executes agents. Phase 1 runs in-process inside API. |
| **StrandsRuntime** | Implements `AgentRuntime`; wraps StrandsAgent adapter. |
| **AgentFactory** | Builds Strands Agent instances from DB agent rows. |
