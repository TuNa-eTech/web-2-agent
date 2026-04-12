# Technical Decisions

Key architectural and product decisions for the MCP-first version of the extension.

---

## 1. MCP Client / Broker vs Reimplementing Atlassian APIs

**Decision: Build the extension as an MCP client and tool broker**

**Why**
- Reusing mature MCP servers is less work than rebuilding their logic
- It keeps the extension open to non-Atlassian servers
- It avoids tracking every upstream API nuance inside extension code
- It makes presets additive instead of foundational

**Trade-off**
- The extension now depends on external MCP servers for domain logic
- Some UX quality depends on the connected server’s correctness and stability

---

## 2. Streamable HTTP First, `stdio` Later

**Decision: MVP supports HTTP MCP servers first**

**Why**
- MV3 works naturally with HTTP transports
- Host permissions can be requested per origin
- Connection testing is straightforward
- This matches the easiest onboarding path for browser-only users

**Trade-off**
- Local `stdio` servers are not available in the first release
- IDE-style `command` configs require a later desktop companion

---

## 3. Desktop Companion for Local `stdio`

**Decision: Support local commands only through a separate native companion**

**Why**
- The extension runtime cannot safely or directly spawn local processes
- Native Messaging is the browser-approved bridge for desktop processes
- This keeps MV3 boundaries explicit and auditable

**Trade-off**
- Supporting full IDE parity requires an extra install step
- Support and packaging complexity increases in later phases

---

## 4. Official MCP TypeScript SDK vs Custom Protocol Client

**Decision: Use the official TypeScript MCP SDK where it fits**

**Why**
- Avoids rebuilding protocol details by hand
- Reduces risk around lifecycle and transport correctness
- Makes future MCP feature support easier

**Trade-off**
- We inherit SDK constraints and bugs
- Some wrapper code is still required for MV3 and product-specific policy

---

## 5. Presets + Generic Server Config

**Decision: Offer guided presets on top of a generic MCP server model**

**Why**
- Presets reduce setup friction for popular integrations
- A generic model keeps the product extensible
- The same storage and broker code works for all servers

**Trade-off**
- Preset logic must avoid hard-coding assumptions that break generic servers
- Capability detection has to stay runtime-driven

---

## 6. IDE-Like Config Import with Honest Runtime Limits

**Decision: Accept config shapes similar to IDE MCP settings**

**Why**
- Familiar mental model for technical users
- Easier migration from existing MCP-enabled tools
- Supports future `stdio` expansion without redesigning storage

**Trade-off**
- Some imported configs will be only partially usable in the MVP
- The UI must clearly explain why HTTP works now and `stdio` requires the companion later

---

## 7. Dynamic Host Permissions for Custom Servers

**Decision: Request host access per server origin instead of broad host access**

**Why**
- Better user trust
- Better store-review posture
- Cleaner security model for arbitrary custom MCP endpoints

**Trade-off**
- Users may see extra permission prompts during setup
- Local development and self-hosted servers need explicit origin handling

---

## 8. Auth Stored Per Server Profile

**Decision: Store auth at the MCP connection layer**

**Why**
- The extension should not understand every backend’s native auth semantics
- HTTP headers and OAuth state belong naturally to the server profile
- The same pattern works for Atlassian and non-Atlassian servers

**Trade-off**
- Some servers may need custom auth UX later
- Token refresh and OAuth recovery may differ across servers

---

## 9. Tool Namespacing and Policy Layer

**Decision: Normalize all tools and namespace them by server**

**Why**
- Prevents collisions between different servers
- Gives one place to apply safety rules
- Makes AI integration provider-agnostic

**Trade-off**
- Adds translation complexity between UI, AI, and raw server tool names
- Debugging requires showing both namespaced and original tool ids when useful

---

## 10. Popup + Side Panel Only

**Decision: Keep UI in popup, options, and side panel**

**Why**
- Matches existing extension direction
- Avoids content-script complexity and CSP issues
- Keeps the product focused on companion workflows instead of page injection

**Trade-off**
- The extension remains a separate workspace rather than an in-page product layer

---

## 11. `chrome.storage` + Encryption for Secrets

**Decision: Continue using `chrome.storage` with encrypted secrets**

**Why**
- Fits the size and persistence needs of server profiles and auth data
- Works well across popup, side panel, and background contexts
- Keeps implementation simpler than IndexedDB for the MVP

**Trade-off**
- Not ideal for very large local caches
- Encryption improves security posture but is not a perfect boundary

---

## 12. Direct AI Provider HTTP Calls

**Decision: Keep AI provider integrations inside the extension**

**Why**
- Users can bring their own keys
- No mandatory backend is needed for chat
- Tool orchestration stays local to the user session

**Trade-off**
- Provider adapters must each handle streaming and tool-call quirks
- Errors from providers and errors from MCP servers must be separated carefully

---

## 13. No Mandatory Managed Backend in MVP

**Decision: Do not require a product-owned relay to make the core workflow useful**

**Why**
- Reduces operational cost early
- Preserves privacy for users who run their own MCP servers
- Keeps the architecture honest about what the extension itself does

**Trade-off**
- Some users will still need help hosting or finding an HTTP MCP endpoint
- Certain advanced auth and origin-allowlist scenarios may justify optional managed infrastructure later

---

## 14. Atlassian as First-Class Preset, Not a Special Protocol

**Decision: Treat Atlassian as the best initial preset, not as a unique architecture**

**Why**
- Atlassian is the main launch use case
- The UX can still be highly optimized for Jira and Confluence
- The underlying runtime remains generic

**Trade-off**
- Preset quality must be achieved through capability detection and good UX, not by bypassing MCP

---

## Summary Table

| Topic | Choice | Reason |
|-------|--------|--------|
| Core architecture | MCP client / broker | minimize reinvention, maximize extensibility |
| MVP transport | Streamable HTTP | best fit for MV3 |
| Local servers | native companion later | required for `stdio` |
| Protocol layer | official MCP SDK + wrappers | reduce protocol risk |
| Server UX | presets + generic configs | good onboarding without losing flexibility |
| Security | dynamic host permissions + encrypted auth | least privilege |
| AI integration | direct provider adapters + brokered tools | local, flexible orchestration |
