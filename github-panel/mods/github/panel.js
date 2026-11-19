import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, panes, focused, theme, nextCommand, openOverlay } from "herdr";
import { summarizeChecks, checksIcon } from "./checks.js";
import { openUrl } from "./open.js";
import { gh } from "./gh.js";
import { ago, reviewBadge } from "./format.js";
import { groupIssues, issueArgs, sectionMeta } from "./milestones.js";
import { Detail } from "./detail.js";

const REFRESH_MS = 60000;
const LIMIT = "50";
const KINDS = {
  prs: { label: "PRs", args: ["pr", "list", "--state", "open", "--limit", LIMIT, "--json", "number,title,author,url,isDraft,createdAt,updatedAt,reviewDecision,headRefName,labels,statusCheckRollup"] },
  issues: { label: "Issues", args: ["issue", "list", "--state", "open", "--limit", LIMIT, "--json", "number,title,author,url,labels,createdAt,updatedAt,milestone"] },
};
// Sorted by GitHub's search, so "Oldest" reaches past the newest 50.
const SORTS = [
  { id: "created-desc", label: "Newest", date: "createdAt" },
  { id: "created-asc", label: "Oldest", date: "createdAt" },
  { id: "updated-desc", label: "Updated", date: "updatedAt" },
];
const MILESTONE_SORT = { id: "milestone", label: "Milestone", date: "createdAt" };

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());

function listArgs(kind, filters) {
  const sort = filters.sort.id === "milestone" ? "created-desc" : filters.sort.id;
  const search = [`sort:${sort}`, filters.text].filter(Boolean).join(" ");
  return [...KINDS[kind].args, "--search", search, ...[...filters.labels].flatMap((l) => ["--label", l])];
}

async function catalog(cwd, on) {
  const repo = await gh(["repo", "view", "--json", "nameWithOwner"], cwd, on);
  const name = repo?.nameWithOwner ?? "";
  if (!/^[^/\s]+\/[^/\s]+$/.test(name)) return [];
  const list = await gh(["api", "--paginate", `repos/${name}/milestones?state=open&per_page=100`], cwd, on);
  return Array.isArray(list) ? list : [];
}

function stamp(issue, milestone) {
  if (issue.milestone?.title) return issue;
  return { ...issue, milestone: { title: milestone.title, number: milestone.number } };
}

async function milestoneIssues(filters, cwd, on) {
  const milestones = await catalog(cwd, on);
  const open = milestones.filter((m) => (m.open_issues ?? 0) > 0);
  const loaded = await Promise.all([
    gh(issueArgs(filters, { noMilestone: true }), cwd, on),
    ...open.map((m) => gh(issueArgs(filters, { milestone: m.title }), cwd, on)),
  ]);
  const [none, ...buckets] = loaded;
  const tagged = buckets.flatMap((issues, index) => issues.map((issue) => stamp(issue, open[index])));
  return { items: [...tagged, ...none], milestones };
}

async function loadLists(filters, cwd, on) {
  const prsPromise = gh(listArgs("prs", filters), cwd, on);
  const issuesPromise = filters.sort.id === "milestone"
    ? milestoneIssues(filters, cwd, on)
    : gh(listArgs("issues", filters), cwd, on).then((items) => ({ items, milestones: null }));
  const [prs, issues] = await Promise.all([prsPromise, issuesPromise]);
  return { prs, issues: issues.items, milestones: issues.milestones };
}

// The PRs and issues panel (also the cmd-shift-g popup).
export class Panel {
  init(_props, cx) {
    this.tab = "prs"; this.items = { prs: [], issues: [] }; this.repoLabels = []; this.milestones = []; this.generation = 0; this.detailView = null;
    this.collapsed = new Set(["no-milestone"]);
    this.filters = { sort: SORTS[0], labels: new Set(), text: "" };
    this.search = InputState.new({ placeholder: "Search, then Enter" });
    this.search.on("submit", (_e, cx) => this.setText(this.search.value().trim(), cx));
    this.search.on("change", (_e, cx) => { if (!this.search.value().trim() && this.filters.text) this.setText("", cx); });
    this.refresh(cx);
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
    this.listenCommands(cx);
  }

  listenCommands(cx) {
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command in KINDS) { this.tab = command; this.detailView = null; }
        if (command === "refresh") this.refresh(cx);
        if (command === "sort") this.cycleSort(cx);
        if (command === "labels") this.showLabels = !this.showLabels;
        cx.notify();
      }
    });
  }

  refresh(cx) {
    const { cwd, on } = location(), context = key();
    if (context !== this.context) this.resetFor(context, cwd, on, cx);
    if (this.detailView && context === this.context) this.detailView.load(cx);
    if (!cwd) return;
    const generation = ++this.generation, filters = this.filters;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const loaded = await loadLists(filters, cwd, on);
        if (generation === this.generation) {
          this.items = { prs: loaded.prs, issues: loaded.issues };
          if (loaded.milestones) this.milestones = loaded.milestones;
          this.error = null;
        }
      } catch (e) { if (generation === this.generation) this.error = String(e.message ?? e); }
      finally { if (generation === this.generation) this.loading = false; cx.notify(); }
    });
    cx.notify();
  }

  // A new repo: its own labels, and filters on labels it may not have are dropped.
  resetFor(context, cwd, on, cx) {
    this.context = context; this.items = { prs: [], issues: [] }; this.error = null; this.repoLabels = []; this.milestones = []; this.detailView = null;
    this.collapsed = new Set(["no-milestone"]);
    this.filters = { ...this.filters, labels: new Set() };
    if (!cwd) return;
    this.loadLabels(context, cwd, on, cx);
    if (this.filters.sort.id !== "milestone") this.loadCatalog(context, cwd, on, cx);
  }

  loadLabels(context, cwd, on, cx) {
    cx.spawn(async (cx) => {
      try {
        const labels = await gh(["label", "list", "--limit", "200", "--json", "name,color"], cwd, on);
        if (key() === context) this.repoLabels = labels;
      } catch { if (key() === context) this.repoLabels = []; }
      cx.notify();
    });
  }

  loadCatalog(context, cwd, on, cx) {
    cx.spawn(async (cx) => {
      try {
        const milestones = await catalog(cwd, on);
        if (key() === context) this.milestones = milestones;
      } catch { if (key() === context) this.milestones = []; }
      cx.notify();
    });
  }

  setFilters(change, cx) {
    const next = { ...this.filters, ...change };
    const entering = next.sort.id === "milestone" && this.filters.sort.id !== "milestone";
    this.filters = next;
    if (entering) this.items = { ...this.items, issues: [] };
    this.refresh(cx);
  }

  setText(text, cx) {
    if (text !== this.filters.text) this.setFilters({ text }, cx);
  }

  availableSorts() {
    if (this.tab === "issues" && this.milestones.length) return [...SORTS, MILESTONE_SORT];
    return SORTS;
  }

  cycleSort(cx) {
    const sorts = this.availableSorts();
    const index = sorts.findIndex((sort) => sort.id === this.filters.sort.id);
    const next = index === -1 ? sorts[0] : sorts[(index + 1) % sorts.length];
    this.setFilters({ sort: next }, cx);
  }

  toggleSection(key) {
    if (this.collapsed.has(key)) this.collapsed.delete(key);
    else this.collapsed.add(key);
  }

  toggleLabel(name, cx) {
    const labels = new Set(this.filters.labels);
    if (labels.has(name)) labels.delete(name); else labels.add(name);
    this.setFilters({ labels }, cx);
  }

  clearFilters(cx) {
    this.search.set_value("");
    this.setFilters({ sort: SORTS[0], labels: new Set(), text: "" }, cx);
  }

  hasFilters() {
    return this.filters.sort !== SORTS[0] || this.filters.labels.size > 0 || Boolean(this.filters.text);
  }

  tabButton(kind, t) {
    const active = this.tab === kind, count = this.items[kind].length;
    return h_flex().id(`gh-tab-${kind}`).h(26).px(10).gap(6).items_center().rounded(7).cursor_pointer()
      .when(active, (e) => e.bg(t.selected)).hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { this.tab = kind; cx.notify(); })
      .child(div().text_color(active ? t.foreground : t.muted).child(KINDS[kind].label))
      .child(div().text_size(10).text_color(t.dim).child(String(count)));
  }

  filterChip(id, label, active, onClick, t) {
    return h_flex().id(id).h(24).px(8).gap(4).flex_none().items_center().rounded(6).cursor_pointer().text_size(11)
      .bg(active ? t.selected : t.raised).text_color(active ? t.foreground : t.muted)
      .hover((s) => s.bg(t.hover)).on_click((_e, cx) => onClick(cx)).child(label);
  }

  filterBar(t) {
    const count = this.filters.labels.size;
    return h_flex().h(38).flex_none().px(8).gap(6).items_center().border_b(1).border_color(t.border)
      .child(this.filterChip("gh-sort", `${this.filters.sort.label} ↕`, this.filters.sort !== SORTS[0], (cx) => this.cycleSort(cx), t))
      .child(this.filterChip("gh-labels", count ? `Labels · ${count}` : "Labels", count > 0 || this.showLabels,
        (cx) => { this.showLabels = !this.showLabels; cx.notify(); }, t))
      .child(div().flex_1().min_w(0).h(24).px(8).flex().items_center().rounded(6).border_1()
        .border_color(this.filters.text ? t.accent : t.border).bg(t.background)
        .child(Input.new(this.search).h_full().text_size(11).text_color(t.foreground)))
      .when(this.hasFilters(), (e) => e.child(this.filterChip("gh-clear", "Clear", false, (cx) => this.clearFilters(cx), t)));
  }

  labelPicker(t) {
    const picked = this.filters.labels;
    return v_flex().id("gh-label-picker").flex_none().max_h(132).overflow_y_scrollbar().p(8).border_b(1).border_color(t.border)
      .child(h_flex().flex_wrap().gap(5).children(this.repoLabels.map((l) => {
        const on = picked.has(l.name);
        return div().id(`gh-label-${l.name}`).px(6).h(20).flex().items_center().rounded(5).cursor_pointer().text_size(11)
          .border_1().border_color(`#${l.color}${on ? "" : "88"}`).bg(on ? `#${l.color}44` : t.background)
          .text_color(on ? t.foreground : t.muted).hover((s) => s.bg(`#${l.color}22`))
          .on_click((_e, cx) => this.toggleLabel(l.name, cx)).child(l.name);
      })))
      .when(!this.repoLabels.length, (e) => e.child(div().text_size(11).text_color(t.dim).child("No labels in this repo")));
  }

  prMeta(pr, t) {
    const badge = reviewBadge(pr, t), ci = checksIcon(summarizeChecks(pr.statusCheckRollup).state, t);
    return h_flex().gap(8).text_size(11).text_color(t.dim)
      .when(Boolean(ci), (e) => e.child(div().text_color(ci.color).child(ci.text)))
      .child(div().text_color(badge.color).child(badge.text))
      .child(div().min_w(0).truncate().child(pr.headRefName));
  }

  planName(issue) {
    if (this.filters.sort.id === "milestone") return "";
    return issue.milestone?.title ?? "";
  }

  labelPill(label, t) {
    return div().flex_none().px(5).rounded(4).border_1().border_color(`#${label.color}88`).text_color(t.muted).child(label.name);
  }

  issueMeta(issue, t) {
    const labels = (issue.labels ?? []).filter((label) => !this.filters.labels.has(label.name));
    const plan = this.planName(issue);
    return h_flex().gap(6).text_size(11).text_color(t.dim).min_w(0).overflow_hidden()
      .when(Boolean(plan), (row) => row.child(div().min_w(0).truncate().text_color(t.muted).child(plan)))
      .children(labels.slice(0, plan ? 2 : 3).map((label) => this.labelPill(label, t)));
  }

  startAgent(issue) {
    const { cwd, on } = location();
    openOverlay({ mod: "issue-agent", kind: "dialog", width: 480, height: 620, props: { issue, cwd, on } });
  }

  openDetail(item, cx) {
    const { cwd, on } = location();
    const detail = new Detail();
    detail.init({
      kind: this.tab,
      number: item.number,
      cwd,
      on,
      onBack: () => { this.detailView = null; },
      onAgent: (issue) => this.startAgent(issue),
    }, cx);
    this.detailView = detail;
    cx.notify();
  }

  agentButton(issue, t) {
    return div().id(`gh-agent-${issue.number}`).flex_none().px(7).h(20).flex().items_center().rounded(6)
      .text_size(11).text_color(t.muted).border_1().border_color(t.border).hover((s) => s.bg(t.raised).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); this.startAgent(issue); }).child("Agent");
  }

  row(item, t) {
    const meta = this.tab === "prs" ? this.prMeta(item, t) : this.issueMeta(item, t);
    const date = item[this.filters.sort.date] ?? item.updatedAt;
    return v_flex().id(`gh-${this.tab}-${item.number}`).flex_none().px(10).py(7).gap(3).rounded(7).cursor_pointer()
      .hover((s) => s.bg(t.hover)).on_click((event, cx) => {
        if (event.modifiers?.platform) { openUrl(item.url); return; }
        this.openDetail(item, cx);
      })
      .child(h_flex().gap(8).items_center()
        .child(div().flex_none().text_size(11).text_color(t.accent).child(`#${item.number}`))
        .child(div().flex_1().min_w(0).truncate().child(item.title))
        .when(this.tab === "issues", (e) => e.child(this.agentButton(item, t))))
      .child(h_flex().gap(8).items_center()
        .child(div().flex_1().min_w(0).child(meta))
        .child(div().flex_none().text_size(11).text_color(t.dim).child(`${item.author?.login ?? ""} · ${ago(date)}`)));
  }

  showsGroups() {
    return this.tab === "issues" && this.filters.sort.id === "milestone" && this.milestones.length > 0;
  }

  sectionHeader(section, t, first) {
    const collapsed = this.collapsed.has(section.key);
    const id = `gh-ms-${section.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
    return h_flex().id(id).h(28).px(8).gap(8).flex_none().items_center().rounded(7).cursor_pointer()
      .mt(first ? 0 : 8).bg(t.selected).hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { this.toggleSection(section.key); cx.notify(); })
      .child(div().flex_none().w(10).text_size(11).text_color(t.muted).child(collapsed ? "▸" : "▾"))
      .child(div().flex_1().min_w(0).truncate().text_size(12).font_semibold().child(section.title))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(sectionMeta(section)));
  }

  sectionNodes(section, t, first) {
    const header = this.sectionHeader(section, t, first);
    if (this.collapsed.has(section.key)) return [header];
    return [header, ...section.issues.map((issue) => this.row(issue, t))];
  }

  listNodes(t) {
    if (!this.showsGroups()) return this.items[this.tab].map((item) => this.row(item, t));
    return groupIssues(this.items.issues, this.milestones).flatMap((section, index) => this.sectionNodes(section, t, index === 0));
  }

  emptyText() {
    if (this.error) return this.error;
    if (this.loading) return "Loading…";
    const what = this.tab === "prs" ? "pull requests" : "issues";
    return this.hasFilters() ? `No open ${what} match these filters` : `No open ${what}`;
  }

  frame(t) {
    return v_flex().id("github").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13);
  }

  render(cx) {
    if (key() !== this.context) this.refresh(cx);
    const t = theme(), list = this.items[this.tab];
    const root = this.frame(t);
    if (this.detailView) return root.child(this.detailView.render());
    return root
      .child(h_flex().h(42).flex_none().px(10).gap(4).items_center().border_b(1).border_color(t.border)
        .child(this.tabButton("prs", t)).child(this.tabButton("issues", t)).child(div().flex_1())
        .child(div().id("gh-refresh").px(8).h(26).flex().items_center().rounded(7).cursor_pointer().text_size(11).text_color(t.muted)
          .hover((s) => s.bg(t.hover)).on_click((_e, cx) => this.refresh(cx)).child(this.loading ? "…" : "Refresh")))
      .child(this.filterBar(t))
      .when(Boolean(this.showLabels), (e) => e.child(this.labelPicker(t)))
      .child(v_flex().id("github-list").flex_1().min_h(0).overflow_y_scrollbar().p(6).gap(2)
        .children(this.listNodes(t))
        .when(!list.length, (e) => e.child(div().p(8).text_color(this.error ? t.ansi1 : t.dim).child(this.emptyText()))));
  }
}
