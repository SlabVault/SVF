"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const result = await signIn("credentials", {
          password: String(formData.get("password") ?? ""),
          redirect: false,
        });
        setPending(false);
        if (result?.error) {
          setError("Invalid password");
          return;
        }
        router.push("/admin");
        router.refresh();
      }}
    >
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vault-amber/70"
          placeholder="Enter admin password"
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
