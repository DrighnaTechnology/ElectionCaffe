export function PageLoader() {
  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-muted border-t-brand rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
