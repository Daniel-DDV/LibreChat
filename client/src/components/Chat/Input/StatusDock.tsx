import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import {
  Constants,
  ContentTypes,
  Tools,
  getConfigDefaults,
  type TMessageContentParts,
} from 'librechat-data-provider';
import { useGetStartupConfig } from '~/data-provider';
import { useChatContext } from '~/Providers';
import store from '~/store';
import { ephemeralAgentByConvoId } from '~/store/agents';
import StatusLine from '~/components/Chat/Messages/StatusLine';

const defaultInterface = getConfigDefaults().interface;

type StatusDockProps = {
  index?: number;
};

export default function StatusDock({ index = 0 }: StatusDockProps) {
  const { data: startupConfig } = useGetStartupConfig();
  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );
  const statusLineEnabled = interfaceConfig?.statusLine === true;
  const statusLinePlacement = interfaceConfig?.statusLinePlacement ?? 'inline';

  const { latestMessage, isSubmitting, conversation } = useChatContext();
  const statusLineState = useRecoilValue(store.statusLineByIndex(index));
  const ephemeralAgent = useRecoilValue(
    ephemeralAgentByConvoId(conversation?.conversationId ?? Constants.NEW_CONVO),
  );

  const toolHint = useMemo(() => {
    if (!ephemeralAgent) {
      return null;
    }
    if (ephemeralAgent.file_search) {
      return Tools.file_search;
    }
    if (ephemeralAgent.web_search) {
      return Tools.web_search;
    }
    if (ephemeralAgent.execute_code) {
      return Tools.execute_code;
    }
    return null;
  }, [ephemeralAgent]);

  const hasActiveToolCall = useMemo(() => {
    const parts: TMessageContentParts[] = Array.isArray(latestMessage?.content)
      ? (latestMessage.content as TMessageContentParts[])
      : [];

    return parts.some((part) => {
      if (!part || part.type !== ContentTypes.TOOL_CALL) {
        return false;
      }
      const toolCall = part[ContentTypes.TOOL_CALL];
      const progress = toolCall?.progress ?? 0;
      return progress < 1;
    });
  }, [latestMessage?.content]);

  // Only render a docked line when it is active to avoid layout jitter.
  const isActive =
    statusLineEnabled &&
    statusLinePlacement === 'dock' &&
    (isSubmitting || statusLineState != null || hasActiveToolCall);

  if (!isActive) {
    return null;
  }

  return (
    <div className="status-dock">
      <StatusLine
        message={latestMessage}
        isSubmitting={isSubmitting}
        index={index}
        toolHint={toolHint}
        variant="dock"
      />
    </div>
  );
}
