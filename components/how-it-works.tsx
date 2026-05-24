import { Card } from "@/components/ui/card";
import { TRADE_HOW_IT_WORKS_STEPS } from "@/lib/trade-landing";

export function HowItWorks() {
  return (
    <section
      className="relative -mx-4 border-y border-line bg-vault-panel/80 px-4 py-14 sm:-mx-5 sm:px-5 sm:py-16"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="max-w-2xl">
          <h2
            id="how-it-works-heading"
            className="font-heading text-2xl font-bold tracking-tight sm:text-3xl"
          >
            How the aggregator works
          </h2>
          <p className="mt-2 text-muted">
            One desk for graded-card liquidity — from browse to on-chain fill.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {TRADE_HOW_IT_WORKS_STEPS.map((item) => (
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
