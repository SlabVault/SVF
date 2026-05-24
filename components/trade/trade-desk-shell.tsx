"use client";

import {
  TensorCollectionDeskLayout,
  type TensorCollectionDeskLayoutProps,
} from "@/components/trade/tensor/collection-desk-layout";

type Props = TensorCollectionDeskLayoutProps;

/** @deprecated Prefer TensorCollectionDeskLayout — thin re-export for existing imports. */
export function TradeDeskShell(props: Props) {
  return <TensorCollectionDeskLayout {...props} />;
}

export type { Props as TradeDeskShellProps };
