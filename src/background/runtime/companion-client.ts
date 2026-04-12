import { NativeBridgeClient } from "../../core/messaging/nativeBridgeClient";

export const createCompanionClient = () =>
  new NativeBridgeClient({
    hostId: "com.myworkflowext.native_bridge",
    defaultTimeoutMs: 20_000,
  });
