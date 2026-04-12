import * as React from "react";
import type { ToolActivity } from "../../core/ai";

type ToolActivityCardProps = {
  activity: ToolActivity;
};

export const ToolActivityCard = ({ activity }: ToolActivityCardProps) => {
  return (
    <div className={`ToolActivity ToolActivity--${activity.status}`}>
      <div className="ToolActivity__header">
        <div>
          <strong>{activity.toolName}</strong>
          <div className="ToolActivity__sub">
            {activity.namespacedToolName}
          </div>
        </div>
        <div className="ToolActivity__status">{activity.status}</div>
      </div>
      {activity.error ? (
        <div className="ToolActivity__error">
          <strong>{activity.error.source}</strong>
          <span>{activity.error.message}</span>
        </div>
      ) : null}
      {activity.output ? (
        <pre className="ToolActivity__output">
          {JSON.stringify(activity.output, null, 2)}
        </pre>
      ) : null}
    </div>
  );
};
