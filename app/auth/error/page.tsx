import { Suspense } from "react";
import { AuthErrorMessage } from "@/components/auth-error-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page({ searchParams }: PageProps<"/auth/error">) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Sorry, something went wrong.</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <AuthErrorMessage searchParams={searchParams as Promise<{ error?: string }>} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
