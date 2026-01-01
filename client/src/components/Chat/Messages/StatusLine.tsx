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

  const toolStatusText = useMemo(() => {
    const toolName = statusLine?.tool ?? toolHint;
    if (!toolName) {
      return null;
    }
    if (toolName === Tools.web_search) {
      return localize('com_ui_web_searching');
    }
    if (toolName === Tools.execute_code || toolName === Tools.code_interpreter) {
      return localize('com_assistants_code_interpreter');
    }
    if (toolName === Tools.file_search || toolName === ToolCallTypes.FILE_SEARCH) {
      return localize('com_assistants_file_search');
    }
    if (toolName === Tools.retrieval || toolName === ToolCallTypes.RETRIEVAL) {
      return localize('com_assistants_retrieval');
    }
    return null;
  }, [localize, statusLine?.tool, toolHint]);

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

  const isActive = isSubmitting || statusLine != null || inProgressTool != null;

  const statusText = useMemo(() => {
    if (toolStatusText) {
      return toolStatusText;
    }

    if (statusLine?.key && statusLine.key !== 'com_ui_generating') {
      return localize(statusLine.key);
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
          <span className="status-beam">{statusText}</span>
          <span className="status-dim">
            ({formatDuration(elapsedSeconds)} - {localize('com_nav_stop_generating')})
          </span>
        </div>
      </div>
    </div>
  );
}
