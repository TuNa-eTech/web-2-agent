export type LogEntry = {
  ts: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
};

export class LogBuffer {
  private entries: LogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  push(entry: LogEntry) {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  snapshot(): LogEntry[] {
    return [...this.entries];
  }
}
