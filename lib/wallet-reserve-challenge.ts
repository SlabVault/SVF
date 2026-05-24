export type ReserveChallengePayload = {
  challengeId: string;
  walletSignature: string;
};

type ReserveChallengeError = {
  error: string;
};

export async function buildReserveChallengePayload(
  buyerWallet: string,
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined,
): Promise<ReserveChallengePayload | ReserveChallengeError | null> {
  if (!signMessage) return null;

  const challengeResponse = await fetch(
    `/api/marketplace/reserve/challenge?buyerWallet=${encodeURIComponent(buyerWallet)}`,
  );

  if (!challengeResponse.ok) {
    const body = (await challengeResponse.json().catch(() => ({}))) as {
      error?: string;
    };
    return {
      error:
        body.error ??
        "Failed to load wallet reserve challenge. Refresh and try again.",
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
