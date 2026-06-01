import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

// ─── Public types (kept for caller compatibility) ─────────────────────────────

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ─── Implementation ────────────────────────────────────────────────────────────

function extractText(content: MessageContent | MessageContent[]): string {
  const parts = Array.isArray(content) ? content : [content];
  return parts
    .map(p => (typeof p === "string" ? p : p.type === "text" ? p.text : ""))
    .join("\n");
}

function toAnthropicContent(
  content: MessageContent | MessageContent[]
): string | Anthropic.ContentBlockParam[] {
  const parts = Array.isArray(content) ? content : [content];
  const blocks: Anthropic.ContentBlockParam[] = parts.map(p => {
    if (typeof p === "string") return { type: "text", text: p };
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.type === "image_url") {
      return {
        type: "image",
        source: { type: "url", url: p.image_url.url },
      } as Anthropic.ImageBlockParam;
    }
    return { type: "text", text: JSON.stringify(p) };
  });
  if (blocks.length === 1 && blocks[0].type === "text") {
    return (blocks[0] as Anthropic.TextBlockParam).text;
  }
  return blocks;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const systemMsg = params.messages.find(m => m.role === "system");
  const dialogMessages = params.messages.filter(m => m.role !== "system");

  const anthropicMessages: Anthropic.MessageParam[] = dialogMessages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: toAnthropicContent(m.content),
  }));

  const maxTokens = params.maxTokens ?? params.max_tokens ?? 4096;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: maxTokens,
    ...(systemMsg
      ? { system: extractText(systemMsg.content) }
      : {}),
    messages: anthropicMessages,
  });

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("\n");

  return {
    id: response.id,
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: textContent },
        finish_reason: response.stop_reason ?? null,
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
