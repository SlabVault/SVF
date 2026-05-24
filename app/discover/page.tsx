import { redirect } from "next/navigation";

/** Legacy discover lane — redirects via next.config.ts; this stub covers dev edge cases. */
export default function DiscoverPage() {
  redirect("/trade?from=discover");
}
