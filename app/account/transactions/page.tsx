import { permanentRedirect } from "next/navigation";

/** Legacy route — purchases live at /trade/portfolio. */
export default function LegacyAccountTransactionsPage() {
  permanentRedirect("/trade/portfolio");
}
