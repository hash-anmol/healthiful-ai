type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type StreamAiTextArgs = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  onChunk?: (chunk: string) => void;
};

export async function streamAiText({
  messages,
  model,
  temperature,
  onChunk,
}: StreamAiTextArgs): Promise<string> {
  const res = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model,
      temperature,
    }),
  });

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => "Failed to stream AI response");
    throw new Error(errorText || "Failed to stream AI response");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk?.(chunk);
  }

  fullText += decoder.decode();
  return fullText.trim();
}
