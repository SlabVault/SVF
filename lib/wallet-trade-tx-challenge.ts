export type TradeTxChallengePayload = {
  challengeId: string;
  walletSignature: string;
};

type TradeTxChallengeError = {
  error: string;
};

export async function buildTradeTxChallengePayload(
  wallet: string,
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined,
): Promise<TradeTxChallengePayload | TradeTxChallengeError | null> {
  if (!signMessage) return null;

  const challengeResponse = await fetch(
    `/api/trade/tx/challenge?wallet=${encodeURIComponent(wallet)}`,
  );

  if (!challengeResponse.ok) {
    const body = (await challengeResponse.json().catch(() => ({}))) as {
      error?: string;
    };
    return {
      error:
        body.error ??
        "Failed to load trade tx wallet challenge. Refresh and try again.",
    };
  }

  const challenge = (await challengeResponse.json()) as {
    challengeId: string;
    message: string;
  };

  const encodedMessage = new TextEncoder().encode(challenge.message);
  const signature = await signMessage(encodedMessage);

  return {
    challengeId: challenge.challengeId,
    walletSignature: Buffer.from(signature).toString("base64"),
  };
}
