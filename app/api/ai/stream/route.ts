import OpenAI from "openai";
import { GoogleAuth } from "google-auth-library";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type StreamRequestBody = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
};

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

const getVertexAccessToken = async () => {
  const auth = new GoogleAuth({
    scopes: [CLOUD_PLATFORM_SCOPE],
  });
  const client = await auth.getClient();
  const response = await client.getAccessToken();

  if (!response.token) {
    throw new Error("Could not acquire Google Cloud access token");
  }

  return response.token;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StreamRequestBody;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
    const model = body.model || process.env.VERTEX_GEMINI_MODEL || "google/gemini-3-flash-preview";
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!body.messages?.length) {
      return new Response("messages are required", { status: 400 });
    }

    let stream: ReadableStream<Uint8Array>;
    try {
      // Preferred path: Vertex OpenAI-compatible Chat Completions streaming.
      if (!projectId) {
        throw new Error("Missing GOOGLE_CLOUD_PROJECT_ID");
      }
      const token = await getVertexAccessToken();
      const client = new OpenAI({
        baseURL: `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/endpoints/openapi`,
        apiKey: token,
      });

      const completion = await client.chat.completions.create({
        model,
        messages: body.messages,
        temperature: body.temperature ?? 0.5,
        stream: true,
      });

      stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of completion) {
              const delta = chunk.choices?.[0]?.delta?.content ?? "";
              if (!delta) continue;
              controller.enqueue(encoder.encode(delta));
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
    } catch (vertexError) {
      // Fallback path: Gemini API key streaming, used when ADC/Vertex auth is unavailable.
      if (!apiKey) {
        throw vertexError;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const sdkModelName = model.startsWith("google/") ? model.slice("google/".length) : model;
      const geminiModel = genAI.getGenerativeModel({ model: sdkModelName });
      const prompt = body.messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
      const result = await geminiModel.generateContentStream(prompt);

      stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (!text) continue;
              controller.enqueue(encoder.encode(text));
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Vertex stream API error:", error);
    return new Response("Failed to stream AI response", { status: 500 });
  }
}
