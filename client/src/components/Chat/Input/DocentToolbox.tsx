import { memo, useMemo } from 'react';
import { Button } from '@librechat/client';
import type { TConversation } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const AI_RESILIENT_ASSESSMENT_PROMPT = [
  'Maak een AI-resilient assessment template.',
  'Context:',
  '- Vak/onderwerp:',
  '- Niveau/leeftijd:',
  '- Duur:',
  '- Leerdoelen:',
  '- Inlevervorm:',
  '',
  'Lever op:',
  '1) Opdrachtbeschrijving (authentieke taak + context).',
  '2) Procesbewijsvereisten (logboek, tussenversies, bronnen).',
  '3) Reflectievragen (metacognitie + AI-gebruik).',
  '4) AI-gebruikregels (wat mag wel/niet, transparantie).',
  '5) Beoordelingsrubric (criteria + niveaus).',
  '6) Korte verdediging/check (mondeling of korte quiz).',
  'Schrijf studentinstructies + docentrubric. Kort, direct, klaar voor gebruik.',
].join('\n');

const AI_LITERACY_WORKFLOW_PROMPT = [
  'Ontwerp een AI-literacy workflow voor docenten en studenten.',
  'Context:',
  '- Vak/onderwerp:',
  '- Niveau/leeftijd:',
  '- Doel (vaardigheden):',
  '- Duur/lesvorm:',
  '',
  'Lever op:',
  '1) Doelen en succescriteria (student + docent).',
  '2) Klasafspraken over AI (transparantie, bronvermelding, grenzen).',
  '3) Lesroutine in 3 fasen (intro, begeleide oefening, reflectie).',
  '4) Micro-activiteiten: kritiek op AI-output, verificatie, bias-check.',
  '5) Checklist voor docenten.',
  '6) Korte policy-samenvatting (100-150 woorden).',
  'Schrijf in concreet, uitvoerbaar format.',
].join('\n');

type DocentToolboxProps = {
  conversation: TConversation | null;
  submitPrompt: (text: string) => void;
};

const DocentToolbox = memo(({ conversation, submitPrompt }: DocentToolboxProps) => {
  const localize = useLocalize();
  const isDocent = useMemo(() => {
    const marker = [conversation?.model, conversation?.modelLabel, conversation?.endpoint]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return marker.includes('docent');
  }, [conversation?.endpoint, conversation?.model, conversation?.modelLabel]);

  if (!isDocent) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        {localize('com_ui_docent_toolbox')}
      </span>
      <Button
        type="button"
        className={cn(
          'border border-gray-300/60 bg-transparent px-2 py-1 text-xs font-normal text-text-primary',
          'hover:bg-gray-100 dark:border-gray-600/60 dark:hover:bg-gray-700',
        )}
        onClick={() => submitPrompt(AI_RESILIENT_ASSESSMENT_PROMPT)}
      >
        {localize('com_ui_ai_resilient_assessment')}
      </Button>
      <Button
        type="button"
        className={cn(
          'border border-gray-300/60 bg-transparent px-2 py-1 text-xs font-normal text-text-primary',
          'hover:bg-gray-100 dark:border-gray-600/60 dark:hover:bg-gray-700',
        )}
        onClick={() => submitPrompt(AI_LITERACY_WORKFLOW_PROMPT)}
      >
        {localize('com_ui_ai_literacy_workflow')}
      </Button>
    </div>
  );
});

export default DocentToolbox;
