/** The error passed to /auth/error in the query string (rendered as text, so it can't inject markup). */
export async function AuthErrorMessage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <p className="text-sm text-muted-foreground">
      {error ? `Code error: ${error}` : "An unspecified error occurred."}
    </p>
  );
}
