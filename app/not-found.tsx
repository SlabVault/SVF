import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md space-y-6 p-8 text-center">
        <h1 className="font-display text-6xl font-semibold text-vault-amber">404</h1>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Return home</Link>
        </Button>
      </Card>
    </div>
  );
}
