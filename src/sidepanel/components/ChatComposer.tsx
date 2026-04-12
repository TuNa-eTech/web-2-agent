import * as React from "react";

type ChatComposerProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export const ChatComposer = ({ onSend, disabled }: ChatComposerProps) => {
  const [value, setValue] = React.useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <form className="ChatComposer" onSubmit={handleSubmit}>
      <textarea
        placeholder="Ask the assistant..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
};
