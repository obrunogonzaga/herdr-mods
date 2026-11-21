const DAY = 86400000;
const FIELDS = "number,title,author,url,labels,createdAt,updatedAt,milestone";

export function orderMilestones(milestones) {
  const dated = milestones.filter((m) => m.due_on).sort((a, b) => Date.parse(a.due_on) - Date.parse(b.due_on));
  const undated = milestones.filter((m) => !m.due_on).sort((a, b) => a.title.localeCompare(b.title));
  return [...dated, ...undated];
}

export function dueLabel(iso, now = Date.now()) {
  if (!iso) return "";
  const days = Math.round((Date.parse(iso) - now) / DAY);
  if (Number.isNaN(days)) return "";
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "due today";
  return `due ${days}d`;
}

export function sectionMeta(section, now = Date.now()) {
  const parts = [`${section.open} open`];
  if (section.closed) parts.push(`${section.closed} closed`);
  const due = dueLabel(section.dueOn, now);
  if (due) parts.push(due);
  return parts.join(" · ");
}

function bucketByTitle(issues) {
  const buckets = new Map();
  for (const issue of issues) {
    const title = issue.milestone?.title || "";
    const list = buckets.get(title) ?? [];
    list.push(issue);
    buckets.set(title, list);
  }
  return buckets;
}

function toSection(milestone, issues) {
  return {
    key: String(milestone.number),
    title: milestone.title,
    dueOn: milestone.due_on || "",
    open: milestone.open_issues ?? issues.length,
    closed: milestone.closed_issues ?? 0,
    issues,
  };
}

function toLoose(title, issues, key) {
  return { key, title, dueOn: "", open: issues.length, closed: 0, issues };
}

function extraTitles(buckets, known) {
  return [...buckets.keys()].filter((title) => title && !known.has(title)).sort((a, b) => a.localeCompare(b));
}

export function groupIssues(issues, milestones) {
  const buckets = bucketByTitle(issues);
  const ordered = orderMilestones(milestones).filter((m) => buckets.has(m.title));
  const known = new Set(ordered.map((m) => m.title));
  const sections = ordered.map((m) => toSection(m, buckets.get(m.title)));
  for (const title of extraTitles(buckets, known)) sections.push(toLoose(title, buckets.get(title), title));
  const none = buckets.get("") ?? [];
  if (none.length) sections.push(toLoose("No milestone", none, "no-milestone"));
  return sections;
}

export function issueArgs(filters, bucket) {
  const parts = ["sort:created-desc"];
  if (bucket.noMilestone) parts.push("no:milestone");
  if (filters.text) parts.push(filters.text);
  const args = ["issue", "list", "--state", "open", "--limit", "100", "--json", FIELDS, "--search", parts.join(" ")];
  if (bucket.milestone) args.push("--milestone", bucket.milestone);
  for (const label of filters.labels) args.push("--label", label);
  return args;
}
