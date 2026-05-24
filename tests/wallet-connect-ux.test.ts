import assert from "node:assert/strict";
import test from "node:test";

import {
  mapWalletErrorToMessage,
  shouldClearWalletUiMessage,
} from "../lib/wallet-connect-ux";

test("wallet selector message guides users to pick wallet first", () => {
  const message = mapWalletErrorToMessage({
    name: "WalletNotSelectedError",
    message: "Wallet not selected",
  });

  assert.equal(message, "Choose a wallet in the modal, then connect.");
});

test("wallet connect message handles popup close and rejection", () => {
  const popupClosed = mapWalletErrorToMessage({
    name: "WalletWindowClosedError",
    message: "Popup closed by user",
  });
  const rejected = mapWalletErrorToMessage({
    name: "WalletSignInError",
    message: "Request rejected",
  });

  assert.match(popupClosed, /closed before approval/i);
  assert.match(rejected, /rejected/i);
});

test("wallet connect fallback uses raw message when available", () => {
  const message = mapWalletErrorToMessage({
    name: "WalletConnectionError",
    message: "Unexpected wallet adapter timeout",
  });

  assert.equal(message, "Unexpected wallet adapter timeout");
});

test("wallet ui message clears once connecting starts", () => {
  assert.equal(shouldClearWalletUiMessage(false, false), false);
  assert.equal(shouldClearWalletUiMessage(true, false), true);
  assert.equal(shouldClearWalletUiMessage(false, true), true);
});
