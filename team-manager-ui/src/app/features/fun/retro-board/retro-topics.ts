import { RetroBoardNote, RetroBoardNoteComment, RetroTopic } from '../../../core/models/retro-board.model';

/**
 * Turns the server's flat note list into the topics the board actually votes on and discusses.
 *
 * A topic is either a group of merged notes or a single loose one. Merging exists so an idea gets
 * ONE vote budget instead of one per wording of it, which means every surface downstream of Capture
 * — the member board and the guest board alike — has to agree on what the units are. Hence a pure
 * function here rather than the logic living in the member store: the guest board is a separate
 * component tree that must reach the same answer, and a guest seeing a merged group as three
 * separate notes with all the votes piled on one of them would be simply wrong.
 *
 * Mirrors the server's model (RetroBoardService.Grouping): the group's id is its <b>anchor</b>, the
 * one note pointing at itself, and vote totals are summed across the whole group so votes cast
 * before a merge still belong to it.
 */
export function buildTopics(notes: readonly RetroBoardNote[]): Record<string, RetroTopic[]> {
  const byColumn: Record<string, RetroTopic[]> = {};
  const groups = new Map<string, RetroTopic>();

  for (const n of notes) {
    const list = byColumn[n.columnId] ??= [];
    if (!n.groupId) {
      list.push({
        id: n.id, columnId: n.columnId, notes: [n], isGroup: false, label: null,
        voteCount: n.voteCount, myVoteCount: n.myVoteCount,
      });
      continue;
    }
    let topic = groups.get(n.groupId);
    if (!topic) {
      topic = { id: n.groupId, columnId: n.columnId, notes: [], isGroup: true, label: null, voteCount: 0, myVoteCount: 0 };
      groups.set(n.groupId, topic);
      list.push(topic);            // the group takes the position of whichever member appears first
    }
    topic.notes.push(n);
    topic.voteCount += n.voteCount;
    topic.myVoteCount += n.myVoteCount;
    if (n.id === n.groupId) topic.label = n.groupLabel;   // the label lives on the anchor
  }

  // Anchor first within each group, so `notes[0]` is the note the group is named after.
  for (const t of groups.values()) t.notes.sort((a, b) => (a.id === t.id ? -1 : b.id === t.id ? 1 : 0));
  return byColumn;
}

/** What to call a topic: the group's name, else its anchor note's text. */
export function topicTitle(t: RetroTopic): string {
  return t.label || t.notes[0]?.text || '';
}

/**
 * Every comment on a topic, oldest first. A merged group shows the comments of all its notes, not
 * just the anchor's — the discussion that happened on a note before it was merged is exactly the
 * context the group is there to preserve, and hiding it would quietly lose the thread.
 */
export function topicComments(t: RetroTopic): RetroBoardNoteComment[] {
  if (!t.isGroup) return t.notes[0]?.comments ?? [];
  return t.notes
    .flatMap(n => n.comments)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
