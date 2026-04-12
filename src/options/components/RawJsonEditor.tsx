import { ChangeEvent } from "react";

type RawJsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onTestConnections: () => void;
  onReload: () => void;
  loading: boolean;
  saving: boolean;
  testing: boolean;
};

export const RawJsonEditor = ({
  value,
  onChange,
  onSave,
  onTestConnections,
  onReload,
  loading,
  saving,
  testing,
}: RawJsonEditorProps) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Raw MCP Config</h2>
          <p style={{ margin: 0, color: "#5f6368", fontSize: 13 }}>
            Paste or edit the full mcpServers document. Secrets are stored encrypted.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onReload} disabled={loading || saving || testing}>
            Reload
          </button>
          <button type="button" onClick={onSave} disabled={loading || saving || testing}>
            {saving ? "Saving..." : "Save Config"}
          </button>
          <button
            type="button"
            onClick={onTestConnections}
            disabled={loading || saving || testing}
          >
            {testing ? "Testing..." : "Test Connections"}
          </button>
        </div>
      </header>
      <textarea
        spellCheck={false}
        value={value}
        onChange={handleChange}
        style={{
          flex: 1,
          minHeight: 360,
          width: "100%",
          resize: "vertical",
          fontFamily: "ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.5,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #d0d4d9",
          background: "#f8f9fb",
        }}
      />
    </section>
  );
};
