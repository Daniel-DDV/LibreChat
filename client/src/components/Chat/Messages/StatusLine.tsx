import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ContentTypes,
  ToolCallTypes,
  Tools,
  type TMessageContentParts,
  type TMessage,
} from 'librechat-data-provider';
import { useLocalize } from '~/hooks';

type StatusLineProps = {
  message: TMessage;
  isSubmitting: boolean;
};

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${minutes}m ${paddedSeconds}s`;
}

export default function StatusLine({ message, isSubmitting }: StatusLineProps) {
  const localize = useLocalize();
  const startRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const statusText = useMemo(() => {
    const parts: TMessageContentParts[] = Array.isArray(message?.content)
      ? (message.content as TMessageContentParts[])
      : [];

    const inProgressTool = parts.find((part) => {
      if (!part || part.type !== ContentTypes.TOOL_CALL) {
        return false;
      }
      const toolCall = part[ContentTypes.TOOL_CALL];
      const progress = toolCall?.progress ?? 0;
      return progress < 1;
    });

    if (inProgressTool?.type === ContentTypes.TOOL_CALL) {
      const toolCall = inProgressTool[ContentTypes.TOOL_CALL];
      if (toolCall?.name === Tools.web_search) {
        return localize('com_ui_web_searching');
      }
      if (toolCall?.name === Tools.execute_code) {
        return localize('com_assistants_code_interpreter');
      }
      if (toolCall?.type === ToolCallTypes.FILE_SEARCH) {
        return localize('com_assistants_file_search');
      }
      if (toolCall?.type === ToolCallTypes.RETRIEVAL) {
        return localize('com_assistants_retrieval');
      }
    }

    return localize('com_ui_generating');
  }, [message, localize]);

  useEffect(() => {
    if (isSubmitting && startRef.current == null) {
      startRef.current = Date.now();
    }
    if (!isSubmitting) {
      startRef.current = null;
      setElapsedSeconds(0);
    }
  }, [isSubmitting]);

  useEffect(() => {
    if (!isSubmitting) {
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
  }, [isSubmitting]);

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
