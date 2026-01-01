const MAX_STATUS_CHARS = 96;

export function formatStatusLineText(input?: string | null): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= MAX_STATUS_CHARS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_STATUS_CHARS - 3).trimEnd()}...`;
}
