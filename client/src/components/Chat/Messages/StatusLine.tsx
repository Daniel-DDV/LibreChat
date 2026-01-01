import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import {
  ContentTypes,
  ToolCallTypes,
  Tools,
  type TMessageContentParts,
  type TMessage,
} from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

const MAX_STATUS_DETAIL_CHARS = 48;

function truncateDetail(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= MAX_STATUS_DETAIL_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_STATUS_DETAIL_CHARS - 3).trimEnd()}...`;
}

function parseToolArgs(args?: unknown): Record<string, unknown> | null {
  if (args == null) {
    return null;
  }
  if (typeof args === 'object') {
    return args as Record<string, unknown>;
  }
  if (typeof args === 'string') {
    const trimmed = args.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { query: trimmed };
    }
  }
  return null;
}

function pickString(value?: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string');
    return typeof first === 'string' ? first : null;
  }
  return null;
}

function extractQuery(args?: Record<string, unknown> | null): string | null {
  if (!args) {
    return null;
  }
  const candidate =
    pickString(args.query) ||
    pickString(args.q) ||
    pickString(args.search) ||
    pickString(args.text) ||
    pickString(args.prompt) ||
    pickString(args.question) ||
    pickString(args.topic);
  return candidate ? truncateDetail(candidate) : null;
}

function extractUrlHost(args?: Record<string, unknown> | null): string | null {
  if (!args) {
    return null;
  }
  const candidate =
    pickString(args.url) ||
    pickString(args.urls) ||
    pickString(args.link) ||
    pickString(args.href) ||
    pickString(args.page);
  if (!candidate) {
    return null;
  }
  try {
    const parsed = new URL(candidate);
    return parsed.host;
  } catch {
    return truncateDetail(candidate);
  }
}

function buildStatusLine(base: string, detail?: string | null) {
  if (!detail) {
    return base;
  }
  return `${base}: ${detail}`;
}

type StatusLineProps = {
  message: TMessage;
  isSubmitting: boolean;
  index: number;
  toolHint?: string | null;
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}m ${paddedSeconds}s`;
}

export default function StatusLine({ message, isSubmitting, index, toolHint }: StatusLineProps) {
  const localize = useLocalize();
  const startRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const statusLine = useRecoilValue(store.statusLineByIndex(index));

  const inProgressTool = useMemo(() => {
    const parts: TMessageContentParts[] = Array.isArray(message?.content)
      ? (message.content as TMessageContentParts[])
      : [];

    return (
      parts.find((part) => {
        if (!part || part.type !== ContentTypes.TOOL_CALL) {
          return false;
        }
        const toolCall = part[ContentTypes.TOOL_CALL];
        const progress = toolCall?.progress ?? 0;
        return progress < 1;
      }) ?? null
    );
  }, [message?.content]);

  const toolStatusText = useMemo(() => {
    const toolCall =
      inProgressTool?.type === ContentTypes.TOOL_CALL
        ? inProgressTool[ContentTypes.TOOL_CALL]
        : null;
    const toolName = statusLine?.tool ?? toolHint ?? toolCall?.name;
    if (!toolName) {
      return null;
    }

    const normalized = String(toolName).trim().toLowerCase();
    const args = parseToolArgs(toolCall?.args);
    const queryDetail = extractQuery(args);
    const urlHost = extractUrlHost(args);

    if (
      toolName === Tools.web_search ||
      normalized === 'search_web' ||
      normalized.includes('search_web') ||
      normalized.includes('searxng_search') ||
      normalized.includes('perplexity_search')
    ) {
      return buildStatusLine(localize('com_ui_web_searching'), queryDetail);
    }
    if (
      toolName === Tools.file_search ||
      toolName === ToolCallTypes.FILE_SEARCH ||
      normalized.includes('file_search') ||
      normalized.includes('search_docs')
    ) {
      return buildStatusLine(localize('com_assistants_file_search'), queryDetail);
    }
    if (toolName === Tools.retrieval || toolName === ToolCallTypes.RETRIEVAL) {
      return buildStatusLine(localize('com_assistants_retrieval'), queryDetail);
    }
    if (toolName === Tools.execute_code || toolName === Tools.code_interpreter) {
      return localize('com_assistants_code_interpreter');
    }
    if (
      normalized.includes('search_images') ||
      normalized.includes('search_icons') ||
      normalized.includes('search_illustrations') ||
      normalized.includes('search_diagrams')
    ) {
      return buildStatusLine('Searching images', queryDetail);
    }
    if (
      normalized.includes('search_ads') ||
      normalized.includes('search_reddit') ||
      normalized.startsWith('search_')
    ) {
      return buildStatusLine('Searching the web', queryDetail);
    }
    if (
      normalized.includes('scrape') ||
      normalized.includes('crawl') ||
      normalized.includes('fetch')
    ) {
      const detail = urlHost ? `from ${urlHost}` : null;
      return buildStatusLine('Fetching page content', detail);
    }
    if (normalized.includes('research')) {
      return buildStatusLine('Running research', queryDetail);
    }
    if (
      normalized.includes('document') ||
      normalized.includes('report') ||
      normalized.includes('write')
    ) {
      return 'Drafting document';
    }
    if (normalized.includes('image') && normalized.includes('generate')) {
      return 'Generating image';
    }

    return null;
  }, [inProgressTool, localize, statusLine?.tool, toolHint]);

  const isActive = isSubmitting || statusLine != null || inProgressTool != null;

  const statusText = useMemo(() => {
    if (statusLine?.key && statusLine.key !== 'com_ui_generating') {
      return localize(statusLine.key);
    }

    if (toolStatusText) {
      return toolStatusText;
    }

    if (statusLine?.text && statusLine.source === 'server') {
      return statusLine.text;
    }

    if (statusLine?.text) {
      return statusLine.text;
    }

    if (inProgressTool?.type === ContentTypes.TOOL_CALL) {
      const toolCall = inProgressTool[ContentTypes.TOOL_CALL];
      if (toolCall?.name === Tools.web_search) {
        return localize('com_ui_web_searching');
      }
      if (toolCall?.name === Tools.execute_code || toolCall?.name === Tools.code_interpreter) {
        return localize('com_assistants_code_interpreter');
      }
      if (toolCall?.name === Tools.file_search || toolCall?.type === ToolCallTypes.FILE_SEARCH) {
        return localize('com_assistants_file_search');
      }
      if (toolCall?.name === Tools.retrieval || toolCall?.type === ToolCallTypes.RETRIEVAL) {
        return localize('com_assistants_retrieval');
      }
    }

    return localize(statusLine?.key ?? 'com_ui_generating');
  }, [inProgressTool, localize, statusLine?.key, statusLine?.text, toolStatusText]);

  const interruptLabel = 'esc to interrupt';

  useEffect(() => {
    if (isActive && startRef.current == null) {
      startRef.current = Date.now();
    }
    if (!isActive) {
      startRef.current = null;
      setElapsedSeconds(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const tick = () => {
      if (startRef.current == null) {
        return;
      }
      const diffSeconds = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsedSeconds(diffSeconds);
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="mt-2 w-full">
      <div className="status-terminal">
        <div className="status-line">
          <span className="status-beam">&bull; {statusText}</span>
          <span className="status-dim">
            ({formatDuration(elapsedSeconds)} &bull; {interruptLabel})
          </span>
        </div>
      </div>
    </div>
  );
}
