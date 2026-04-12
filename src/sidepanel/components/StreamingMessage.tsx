import * as React from "react";

export const StreamingMessage = () => {
  return (
    <div className="ChatMessage__streaming">
      <span className="ChatMessage__streaming-dot">•</span>
      <span>Streaming...</span>
    </div>
  );
};
