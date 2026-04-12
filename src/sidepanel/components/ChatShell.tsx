import * as React from "react";
import type {
  AiSurfaceError,
  ChatState,
  ConfirmationDecision,
  ToolActivity,
} from "../../core/ai";
import { ChatComposer } from "./ChatComposer";
import { ChatTranscript } from "./ChatTranscript";
import { ConfirmationGateCard } from "./ConfirmationGateCard";
import { ToolActivityCard } from "./ToolActivityCard";

type ChatShellProps = {
  state: ChatState;
  onSend: (message: string) => void;
  onConfirmTool: (decision: ConfirmationDecision) => void;
};

const ErrorNotice = ({ error }: { error: AiSurfaceError }) => (
  <div className={`ChatError ChatError--${error.source}`}>
    <strong>{error.source}</strong>
    <span>{error.message}</span>
  </div>
);

const ToolActivityList = ({ items }: { items: ToolActivity[] }) => (
  <div className="ToolActivityList">
    {items.length === 0 ? (
      <div className="ToolActivityList__empty">No tool activity yet.</div>
    ) : null}
    {items.map((activity) => (
      <ToolActivityCard key={activity.id} activity={activity} />
    ))}
  </div>
);

export const ChatShell = ({
  state,
  onSend,
  onConfirmTool,
}: ChatShellProps) => {
  return (
    <div className="ChatShell">
      <header className="ChatShell__header">
        <div>
          <h2>AI Workspace</h2>
          <div className="ChatShell__sub">
            {state.providerId ?? "No provider"}{" "}
            {state.model ? `• ${state.model}` : ""}
          </div>
        </div>
        <div className={`ChatShell__status ChatShell__status--${state.streaming.status}`}>
          {state.streaming.status}
        </div>
      </header>

      {state.errors.length ? (
        <div className="ChatShell__errors">
          {state.errors.map((error, index) => (
            <ErrorNotice key={`${error.source}-${index}`} error={error} />
          ))}
        </div>
      ) : null}

      <ChatTranscript messages={state.messages} />

      <section className="ChatShell__activity">
        <h3>Tool Activity</h3>
        <ToolActivityList items={state.toolActivity} />
      </section>

      {state.pendingConfirmation ? (
        <ConfirmationGateCard
          request={state.pendingConfirmation}
          onDecision={onConfirmTool}
        />
      ) : null}

      <ChatComposer
        onSend={onSend}
        disabled={state.streaming.status === "streaming"}
      />
    </div>
  );
};
