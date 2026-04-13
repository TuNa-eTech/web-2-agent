// ---------------------------------------------------------------------------
// Toast notification — shows tool execution status inside Shadow DOM
// ---------------------------------------------------------------------------

import React, { useEffect } from "react";

export type ToastState = {
  visible: boolean;
  type: "loading" | "success" | "error";
  message: string;
};

export const EMPTY_TOAST: ToastState = { visible: false, type: "loading", message: "" };

type Props = {
  toast: ToastState;
  onDismiss: () => void;
};

export const Toast: React.FC<Props> = ({ toast, onDismiss }) => {
  // Auto-dismiss success/error after 4s
  useEffect(() => {
    if (!toast.visible || toast.type === "loading") return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast.visible) return null;

  const icon = toast.type === "loading" ? "⏳" : toast.type === "success" ? "✅" : "❌";

  return (
    <div className={`toast toast--${toast.type}`}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{toast.message}</span>
      {toast.type !== "loading" && (
        <button className="toast-dismiss" onClick={onDismiss}>
          ✕
        </button>
      )}
    </div>
  );
};
