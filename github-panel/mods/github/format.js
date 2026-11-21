export function ago(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export function reviewText(pr) {
  if (pr.isDraft) return "draft";
  if (pr.reviewDecision === "APPROVED") return "approved";
  if (pr.reviewDecision === "CHANGES_REQUESTED") return "changes";
  return "review";
}

export function reviewBadge(pr, theme) {
  const text = reviewText(pr);
  if (text === "draft") return { text, color: theme.dim };
  if (text === "approved") return { text, color: theme.ansi2 };
  if (text === "changes") return { text, color: theme.ansi1 };
  return { text, color: theme.blocked };
}

const MERGE = {
  CLEAN: ["clean", "ansi2"],
  DIRTY: ["dirty", "ansi1"],
  BLOCKED: ["blocked", "ansi1"],
  BEHIND: ["behind", "blocked"],
  UNSTABLE: ["unstable", "ansi1"],
  DRAFT: ["draft", "dim"],
  HAS_HOOKS: ["hooks", "dim"],
  UNKNOWN: ["unknown", "dim"],
};

export function mergeText(status) {
  return MERGE[status]?.[0] ?? null;
}

export function mergeBadge(status, theme) {
  const entry = MERGE[status];
  if (!entry) return null;
  return { text: entry[0], color: theme[entry[1]] };
}

export function diffText(pr) {
  const files = pr.changedFiles ?? 0;
  return {
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    files,
    noun: files === 1 ? "file" : "files",
  };
}

export function assigneeLogins(item) {
  return (item.assignees ?? []).map((assignee) => assignee.login).filter(Boolean);
}
