import * as React from "react";
import type { ConfirmationDecision, ConfirmationRequest } from "../../core/ai";

type ConfirmationGateCardProps = {
  request: ConfirmationRequest;
  onDecision: (decision: ConfirmationDecision) => void;
};

export const ConfirmationGateCard = ({
  request,
  onDecision,
}: ConfirmationGateCardProps) => {
  return (
    <div className="ConfirmationGate">
      <div className="ConfirmationGate__header">
        <strong>Confirm tool execution</strong>
        <span className="ConfirmationGate__risk">{request.risk}</span>
      </div>
      <div className="ConfirmationGate__body">
        <div>
          Tool: <strong>{request.toolName}</strong>
        </div>
        <div>Server: {request.serverId}</div>
        <div className="ConfirmationGate__reason">{request.reason}</div>
        <pre className="ConfirmationGate__payload">
          {JSON.stringify(request.input, null, 2)}
        </pre>
      </div>
      <div className="ConfirmationGate__actions">
        <button type="button" onClick={() => onDecision("approved")}>
          Allow
        </button>
        <button type="button" onClick={() => onDecision("denied")}>
          Deny
        </button>
      </div>
    </div>
  );
};
