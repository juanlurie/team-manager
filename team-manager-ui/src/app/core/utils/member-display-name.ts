export function buildDuplicateFirstNames(members: { firstName: string }[]): Set<string> {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.firstName, (counts.get(m.firstName) ?? 0) + 1);
  return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([fn]) => fn));
}

export function memberDisplayName(
  member: { firstName: string; lastName: string },
  duplicates: Set<string>
): string {
  return duplicates.has(member.firstName)
    ? `${member.firstName} ${member.lastName}`
    : member.firstName;
}
