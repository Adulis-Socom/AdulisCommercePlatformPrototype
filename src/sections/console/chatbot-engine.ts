/**
 * A Seller's supplementary approved answer (topic and answer). The answering engine is src/chatbot/engine.ts (BOT-001..003): it reads
 * these only after canonical Product facts and configured policy, and never lets one override them.
 */
export interface Knowledge { id: string; topic: string; answer: string }
