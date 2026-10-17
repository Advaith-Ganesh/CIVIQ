import { classify } from "./rules";
export interface AIAdapter {
  classifyText(text: string): Promise<ReturnType<typeof classify>>;
  analyzeVision(image: Uint8Array): Promise<unknown>;
  embed(text: string): Promise<number[]>;
  compareMultimodal(a: Uint8Array, b: Uint8Array): Promise<unknown>;
  assessRepair(before: Uint8Array, after: Uint8Array): Promise<unknown>;
  summarize(text: string): Promise<string>;
}
export class DemoAdapter implements AIAdapter {
  async classifyText(text: string) {
    return classify(text);
  }
  async analyzeVision() {
    return {
      supported: false,
      explanation: "No image analysis in demo mode; human review required.",
    };
  }
  async embed(): Promise<number[]> {
    throw new Error("Semantic embeddings are Phase 2 work.");
  }
  async compareMultimodal() {
    return { supported: false };
  }
  async assessRepair() {
    return { supported: false, method: "Manual verification only" };
  }
  async summarize(text: string) {
    return `Rule-based excerpt: ${text.slice(0, 160)}`;
  }
}
export function getAdapter(): AIAdapter {
  if (process.env.AI_PROVIDER === "openai")
    throw new Error(
      "OpenAI adapter is not implemented. Set AI_PROVIDER=demo. No simulated live results are returned.",
    );
  return new DemoAdapter();
}
