import { RawJsonEditor } from "../components/RawJsonEditor";
import { RedactedConfigPreview } from "../components/RedactedConfigPreview";
import { ServerSummaryList } from "../components/ServerSummaryList";
import { useConfigConsole } from "../../shared/hooks/useConfigConsole";

const ErrorBanner = ({
  errors,
}: {
  errors: { code: string; message: string; serverId?: string; path?: string }[];
}) => {
  if (errors.length === 0) return null;
  return (
    <section
      style={{
        border: "1px solid #ffb4b4",
        background: "#fff5f5",
        padding: 12,
        borderRadius: 10,
        color: "#7a1f1f",
        fontSize: 13,
      }}
    >
      <strong style={{ display: "block", marginBottom: 6 }}>Validation errors</strong>
      {errors.map((error, index) => {
        const location = error.serverId ? `(${error.serverId})` : "";
        return (
          <div key={`${error.code}-${index}`}>
            {error.message} {location}
          </div>
        );
      })}
    </section>
  );
};

const NoticeBanner = ({
  notice,
}: {
  notice: {
    tone: "neutral" | "success" | "error";
    message: string;
  } | null;
}) => {
  if (!notice) return null;

  const palette =
    notice.tone === "success"
      ? { border: "#a7f3d0", background: "#ecfdf3", color: "#166534" }
      : notice.tone === "error"
        ? { border: "#fecaca", background: "#fef2f2", color: "#991b1b" }
        : { border: "#cbd5e1", background: "#f8fafc", color: "#334155" };

  return (
    <section
      style={{
        border: `1px solid ${palette.border}`,
        background: palette.background,
        padding: 12,
        borderRadius: 10,
        color: palette.color,
        fontSize: 13,
      }}
    >
      {notice.message}
    </section>
  );
};

export const ConfigConsolePage = () => {
  const {
    loading,
    saving,
    testing,
    rawJson,
    serverIndex,
    healthMap,
    toolCatalog,
    errors,
    redactedPreview,
    runtimeNotice,
    updateRawJson,
    save,
    testConnections,
    reload,
  } = useConfigConsole();

  return (
    <main
      style={{
        padding: "32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f7f7fa 0%, #ffffff 100%)",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>MCP Config Console</h1>
        <p style={{ margin: 0, color: "#5f6368", fontSize: 14 }}>
          Manage MCP servers with a raw JSON document. Server summaries are rendered from a safe
          index without decrypting secrets.
        </p>
      </header>

      <ErrorBanner errors={errors} />
      <NoticeBanner notice={runtimeNotice} />

      <section style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
        <RawJsonEditor
          value={rawJson}
          onChange={updateRawJson}
          onSave={save}
          onTestConnections={testConnections}
          onReload={reload}
          loading={loading}
          saving={saving}
          testing={testing}
        />
        <aside style={{ width: 360, display: "flex", flexDirection: "column", gap: 20 }}>
          <ServerSummaryList
            serverIndex={serverIndex}
            healthMap={healthMap}
            toolCatalog={toolCatalog}
          />
          <RedactedConfigPreview preview={redactedPreview} />
        </aside>
      </section>
    </main>
  );
};
