export const StreamingMessage = () => {
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      <span>Streaming response...</span>
    </div>
  );
};
