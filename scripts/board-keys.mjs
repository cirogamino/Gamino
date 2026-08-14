#!/usr/bin/env node
/**
 * Prints the ten per-seat write keys derived from the master BOARD_TOKEN.
 *
 *   node scripts/board-keys.mjs <token>
 *
 * Keys are derived, never stored, so rotating the master revokes all ten at
 * once. Hand each seat only its own key.
 */
import { webcrypto } from "node:crypto";

const SEATS = [
  "chair", "product", "research", "verify", "ops",
  "engineering", "distribution", "community", "volume", "execution",
];

const token = process.argv[2];
if (!token) {
  console.error("Usage: node scripts/board-keys.mjs <BOARD_TOKEN>");
  process.exit(1);
}

const digest = async (seat) => {
  const bytes = new TextEncoder().encode(`gamino-board:${token}:${seat}`);
  const hash = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

for (const seat of SEATS) {
  console.log(`${seat.padEnd(14)} ${await digest(seat)}`);
}
