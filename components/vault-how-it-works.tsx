import { Card } from "@/components/ui/card";

const VAULT_STEPS = [
  {
    step: "01",
    title: "Creator fees",
    body: "$SVF trading fees flow into the community treasury — funding the next pull without diluting holders.",
  },
  {
    step: "02",
    title: "Live gacha",
    body: "Treasury SOL goes to graded pack pulls on Collector Crypt, Phygitals, Beezie, and more — streamed for transparency.",
  },
  {
    step: "03",
    title: "Vault & multisig",
    body: "Hits land in the multisig vault. Track slabs on Vaulted and Collectr; verify treasury moves on Squads.",
  },
] as const;

export function VaultHowItWorks() {
  return (
    <section
      className="relative -mx-4 border-y border-line bg-vault-panel/80 px-4 py-14 sm:-mx-5 sm:px-5 sm:py-16"
      aria-labelledby="vault-how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="max-w-2xl">
          <h2
            id="vault-how-it-works-heading"
            className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
          >
            How the vault works
          </h2>
          <p className="mt-2 text-muted">
            From on-chain fees to physical slabs in the multisig — every step is public.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {VAULT_STEPS.map((item) => (
            <li key={item.step}>
              <Card className="h-full space-y-4 border-line/80 bg-vault-deep/60 p-6 transition-[border-color,box-shadow] hover:border-vault-violet/30">
                <span className="font-mono text-sm font-semibold text-vault-amber">
                  {item.step}
                </span>
                <h3 className="font-heading text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{item.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
