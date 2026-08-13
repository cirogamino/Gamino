/**
 * The Buzzroom cast.
 *
 * This file is the single source of truth for who lives in the room. The 3D
 * view reads it to place desks and cutouts, the event ingest validates
 * `agentId` against it, and the voice layer reads `voice` to pick an
 * ElevenLabs agent. n8n workflows should send the same `id` values.
 *
 * Renaming an agent is a one-line change here. Nothing else should hardcode
 * a name or a color.
 */

export type AgentId =
  | "vera"
  | "sol"
  | "marco"
  | "nyla"
  | "kai"
  | "rio"
  | "penny"
  | "atlas";

/** Where a desk sits on the floor plan, in metres, origin at room centre. */
export interface DeskPlacement {
  /** Left/right across the room. Negative is camera-left. */
  x: number;
  /** Depth into the room. Negative is nearer the camera. */
  z: number;
  /** Degrees the desk (and its occupant) is turned from facing camera. */
  rotationY: number;
}

export interface Agent {
  id: AgentId;
  /** Display name on the placard, the shirt, and the sidebar. */
  name: string;
  /** One line, shown on hover. Keep it to what they actually do. */
  role: string;
  /** Shirt color. Also drives the desk glow, the status dot, and the
   *  color of the job object while this agent is holding it. */
  color: string;
  /** How the voice should read. Feeds the ElevenLabs voice choice and the
   *  system prompt tone. */
  voiceDirection: string;
  /** ElevenLabs agent id, filled in during Phase 4. */
  elevenLabsAgentId?: string;
  /** Cutout PNG (alpha), produced from the lineup render. */
  cutout: string;
  desk: DeskPlacement;
  /** What this agent's monitor shows when idle, so empty desks still read. */
  idleScreen: "call-queue" | "routing-board" | "pipeline" | "timeline" | "canvas" | "calendar" | "ledger" | "documents";
}

export const ROSTER: Agent[] = [
  {
    id: "vera",
    name: "Vera",
    role: "Reception — answers the phone, takes the order",
    color: "#4FB3A9",
    voiceDirection: "Warm, bright, unflappable. Never rushed.",
    cutout: "/buzzroom/cutouts/vera.png",
    desk: { x: -4.2, z: -1.2, rotationY: 25 },
    idleScreen: "call-queue",
  },
  {
    id: "sol",
    name: "Sol",
    role: "Dispatch — routes every job to the right desk",
    color: "#3F7D4F",
    voiceDirection: "Calm, steady, air-traffic-control. Short sentences.",
    cutout: "/buzzroom/cutouts/sol.png",
    desk: { x: -2.1, z: -2.6, rotationY: 12 },
    idleScreen: "routing-board",
  },
  {
    id: "marco",
    name: "Marco",
    role: "Sales — quotes, follow-ups, closes",
    color: "#26406E",
    voiceDirection: "Confident and quick, a little swagger.",
    cutout: "/buzzroom/cutouts/marco.png",
    desk: { x: 0, z: -3.2, rotationY: 0 },
    idleScreen: "pipeline",
  },
  {
    id: "nyla",
    name: "Nyla",
    role: "Video — cuts, renders, publishes",
    color: "#C4571F",
    voiceDirection: "Energetic, creative, thinks out loud.",
    cutout: "/buzzroom/cutouts/nyla.png",
    desk: { x: 2.1, z: -2.6, rotationY: -12 },
    idleScreen: "timeline",
  },
  {
    id: "kai",
    name: "Kai",
    role: "Design — images, layouts, thumbnails",
    color: "#D6A32E",
    voiceDirection: "Soft-spoken and precise. Answers in specifics.",
    cutout: "/buzzroom/cutouts/kai.png",
    desk: { x: 4.2, z: -1.2, rotationY: -25 },
    idleScreen: "canvas",
  },
  {
    id: "rio",
    name: "Rio",
    role: "Marketing — posts, captions, scheduling",
    color: "#E2705C",
    voiceDirection: "Punchy and playful. Talks in hooks.",
    cutout: "/buzzroom/cutouts/rio.png",
    desk: { x: 3.4, z: 1.4, rotationY: -150 },
    idleScreen: "calendar",
  },
  {
    id: "penny",
    name: "Penny",
    role: "Finance — invoices, payments, reconciliation",
    color: "#7C4A72",
    voiceDirection: "Dry, exact, deadpan. Gives you the number.",
    cutout: "/buzzroom/cutouts/penny.png",
    desk: { x: 0, z: 2.2, rotationY: 180 },
    idleScreen: "ledger",
  },
  {
    id: "atlas",
    name: "Atlas",
    role: "Research — pulls data, checks facts, briefs the room",
    color: "#4A6285",
    voiceDirection: "Measured, professorial. Cites where it came from.",
    cutout: "/buzzroom/cutouts/atlas.png",
    desk: { x: -3.4, z: 1.4, rotationY: 150 },
    idleScreen: "documents",
  },
];

export const ROSTER_BY_ID: Record<AgentId, Agent> = Object.fromEntries(
  ROSTER.map((a) => [a.id, a]),
) as Record<AgentId, Agent>;

export function isAgentId(value: string): value is AgentId {
  return value in ROSTER_BY_ID;
}
