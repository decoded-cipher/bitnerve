import {
  UnsupportedFunctionalityError,
  type LanguageModelV2,
  type LanguageModelV2CallOptions,
  type LanguageModelV2Content,
  type LanguageModelV2FunctionTool,
  type LanguageModelV2Message,
  type LanguageModelV2Prompt,
  type LanguageModelV2ReasoningPart,
  type LanguageModelV2TextPart,
  type LanguageModelV2ToolCallPart,
  type LanguageModelV2ToolChoice,
  type LanguageModelV2ToolResultPart,
  type LanguageModelV2Usage,
} from '@ai-sdk/provider';
import { generateId } from '@ai-sdk/provider-utils';
import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type Part,
  FinishReason,
} from '@google/genai';

type GeminiConfig = {
  apiKey: string;
  model: string;
  apiVersion?: string;
};

export function createGeminiLanguageModel({
  apiKey,
  model,
  apiVersion,
}: GeminiConfig): LanguageModelV2 {
  const client = new GoogleGenAI({
    apiKey,
    apiVersion,
  });

  return new GeminiLanguageModel(client, model);
}

class GeminiLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly provider = 'google-genai';
  readonly defaultObjectGenerationMode = 'tool' as const;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  private readonly modelIdentifier: string;

  constructor(
    private readonly client: GoogleGenAI,
    modelId: string,
  ) {
    this.modelIdentifier = modelId;
  }

  get modelId(): string {
    return this.modelIdentifier;
  }

  async doGenerate(
    options: LanguageModelV2CallOptions,
  ): Promise<{
    content: LanguageModelV2Content[];
    finishReason:
      | 'stop'
      | 'length'
      | 'content-filter'
      | 'tool-calls'
      | 'error'
      | 'other'
      | 'unknown';
    usage: LanguageModelV2Usage;
    warnings: never[];
  }> {
    const { systemInstruction, contents } = convertPrompt(options.prompt);
    const tools = convertTools(options.tools);
    const toolConfig = convertToolChoice(options.toolChoice);

    const response = await this.client.models.generateContent({
      model: this.modelIdentifier,
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      config: buildGenerationConfig(options, tools, toolConfig),
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error('Gemini returned no content.');
    }

    return {
      content: convertResponseParts(candidate.content.parts ?? []),
      finishReason: mapFinishReason(candidate.finishReason),
      usage: {
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: undefined,
      },
      warnings: [],
    };
  }

  async doStream(): Promise<{
    stream: ReadableStream<never>;
    request?: { body?: unknown };
    response?: { headers?: Record<string, string> };
  }> {
    throw new UnsupportedFunctionalityError({
      functionality: 'streaming',
    });
  }
}

function buildGenerationConfig(
  options: LanguageModelV2CallOptions,
  tools: ReturnType<typeof convertTools>,
  toolConfig: ReturnType<typeof convertToolChoice>,
) {
  return {
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.topP !== undefined ? { topP: options.topP } : {}),
    ...(options.topK !== undefined ? { topK: options.topK } : {}),
    ...(options.maxOutputTokens !== undefined
      ? { maxOutputTokens: options.maxOutputTokens }
      : {}),
    ...(options.stopSequences && options.stopSequences.length > 0
      ? { stopSequences: options.stopSequences }
      : {}),
    ...(options.presencePenalty !== undefined
      ? { presencePenalty: options.presencePenalty }
      : {}),
    ...(options.frequencyPenalty !== undefined
      ? { frequencyPenalty: options.frequencyPenalty }
      : {}),
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
    ...(tools ? { tools } : {}),
    ...(toolConfig ? { toolConfig } : {}),
  };
}

function convertPrompt(prompt: LanguageModelV2Prompt) {
  let systemInstruction: string | undefined;
  const contents: Content[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system': {
        if (typeof message.content === 'string') {
          systemInstruction = systemInstruction
            ? `${systemInstruction}\n${message.content}`
            : message.content;
        }
        break;
      }
      case 'user': {
        const parts = (message.content as LanguageModelV2TextPart[])
          .filter((part) => part.type === 'text')
          .map((part) => ({ text: part.text }));

        if (parts.length > 0) {
          contents.push({ role: 'user', parts });
        }
        break;
      }
      case 'assistant': {
        const parts = convertAssistantParts(message);
        if (parts.length > 0) {
          contents.push({ role: 'model', parts });
        }
        break;
      }
      case 'tool': {
        const parts = convertToolParts(message.content as LanguageModelV2ToolResultPart[]);
        if (parts.length > 0) {
          contents.push({ role: 'user', parts });
        }
        break;
      }
      default:
        break;
    }
  }

  return { systemInstruction, contents };
}

function convertAssistantParts(message: LanguageModelV2Message): Part[] {
  const result: Part[] = [];

  for (const part of message.content as Array<
    LanguageModelV2TextPart | LanguageModelV2ReasoningPart | LanguageModelV2ToolCallPart
  >) {
    if (part.type === 'text') {
      result.push({ text: part.text });
    } else if (part.type === 'reasoning') {
      result.push({ text: part.text, thought: true });
    } else if (part.type === 'tool-call') {
      result.push({
        functionCall: {
          id: part.toolCallId ?? generateId(),
          name: part.toolName,
          args: parseToolArgs(part.input),
        },
      });
    }
  }

  return result;
}

function convertToolParts(parts: LanguageModelV2ToolResultPart[]): Part[] {
  return parts.map((part) => ({
    functionResponse: {
      id: part.toolCallId,
      name: part.toolName,
      response: convertToolResultOutput(part.output),
    },
  }));
}

function convertResponseParts(parts: Part[]): LanguageModelV2Content[] {
  const result: LanguageModelV2Content[] = [];

  for (const part of parts) {
    if (typeof part.text === 'string') {
      result.push(
        part.thought
          ? { type: 'reasoning', text: part.text }
          : { type: 'text', text: part.text },
      );
    }

    if (part.functionCall) {
      result.push({
        type: 'tool-call',
        toolCallId: part.functionCall.id ?? generateId(),
        toolName: part.functionCall.name ?? 'unknown_tool',
        input: JSON.stringify(part.functionCall.args ?? {}),
      });
    }

    if (part.functionResponse) {
      result.push({
        type: 'tool-result',
        toolCallId: part.functionResponse.id ?? generateId(),
        toolName: part.functionResponse.name ?? 'unknown_tool',
        result: part.functionResponse.response,
      });
    }
  }

  return result;
}

function convertTools(tools: LanguageModelV2CallOptions['tools']) {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  const functionDeclarations: FunctionDeclaration[] = tools
    .filter((tool): tool is LanguageModelV2FunctionTool => tool.type === 'function')
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: tool.inputSchema,
    }));

  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined;
}

function convertToolChoice(toolChoice: LanguageModelV2ToolChoice | undefined) {
  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice.type === 'auto') {
    return {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.AUTO,
      },
    };
  }

  if (toolChoice.type === 'none') {
    return {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.NONE,
      },
    };
  }

  if (toolChoice.type === 'required') {
    return {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.ANY,
      },
    };
  }

  if (toolChoice.type === 'tool') {
    return {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: [toolChoice.toolName],
      },
    };
  }

  return undefined;
}

function convertToolResultOutput(output: LanguageModelV2ToolResultPart['output']) {
  switch (output.type) {
    case 'json':
      return { output: output.value };
    case 'text':
      return { output: output.value };
    case 'error-text':
      return { error: output.value };
    case 'error-json':
      return { error: output.value };
    case 'content':
      return { output: output.value };
    default:
      return { output };
  }
}

function parseToolArgs(input: unknown) {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return { raw: input };
    }
  }

  if (input && typeof input === 'object') {
    return input;
  }

  return {};
}

function mapFinishReason(
  finishReason: FinishReason | undefined,
):
  | 'stop'
  | 'length'
  | 'content-filter'
  | 'tool-calls'
  | 'error'
  | 'other'
  | 'unknown' {
  switch (finishReason) {
    case FinishReason.FINISH_REASON_UNSPECIFIED:
      return 'unknown';
    case FinishReason.STOP:
      return 'stop';
    case FinishReason.MAX_TOKENS:
      return 'length';
    case FinishReason.SAFETY:
    case FinishReason.BLOCKLIST:
    case FinishReason.PROHIBITED_CONTENT:
    case FinishReason.SPII:
    case FinishReason.IMAGE_SAFETY:
    case FinishReason.IMAGE_PROHIBITED_CONTENT:
    case FinishReason.LANGUAGE:
    case FinishReason.RECITATION:
      return 'content-filter';
    case FinishReason.MALFORMED_FUNCTION_CALL:
    case FinishReason.UNEXPECTED_TOOL_CALL:
      return 'tool-calls';
    case FinishReason.OTHER:
    case FinishReason.NO_IMAGE:
      return 'other';
    default:
      return 'stop';
  }
}