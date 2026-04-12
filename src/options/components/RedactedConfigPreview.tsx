type RedactedConfigPreviewProps = {
  preview: string | null;
};

export const RedactedConfigPreview = ({ preview }: RedactedConfigPreviewProps) => {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <header>
        <h3 style={{ margin: 0, fontSize: 16 }}>Redacted Preview</h3>
        <p style={{ margin: 0, color: "#5f6368", fontSize: 12 }}>
          Sensitive header and env values are masked outside the editor.
        </p>
      </header>
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #e0e4ea",
          background: "#f4f6f9",
          maxHeight: 240,
          overflow: "auto",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {preview ?? "Preview available once JSON is valid."}
      </pre>
    </section>
  );
};
