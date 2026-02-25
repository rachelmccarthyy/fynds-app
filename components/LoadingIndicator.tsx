export default function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
