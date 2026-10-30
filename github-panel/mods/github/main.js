import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, panes, focused, exec, theme } from "herdr";

const REFRESH_MS = 60000;
const LIMIT = "50";
const KINDS = {
  prs: { label: "PRs", args: ["pr", "list", "--state", "open", "--limit", LIMIT, "--json", "number,title,author,url,isDraft,updatedAt,reviewDecision,headRefName"] },
  issues: { label: "Issues", args: ["issue", "list", "--state", "open", "--limit", LIMIT, "--json", "number,title,author,url,labels,updatedAt"] },
};

function location() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());

function ago(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function reviewBadge(pr, t) {
  if (pr.isDraft) return { text: "draft", color: t.dim };
  if (pr.reviewDecision === "APPROVED") return { text: "approved", color: t.ansi2 };
  if (pr.reviewDecision === "CHANGES_REQUESTED") return { text: "changes", color: t.ansi1 };
  return { text: "review", color: t.blocked };
}

function friendlyError(output) {
  if (/not a git repository/i.test(output)) return "Not a git repository";
  if (/no git remotes|none of the git remotes/i.test(output)) return "No GitHub remote in this repo";
  if (/gh auth login|not logged/i.test(output)) return "Run gh auth login first";
  return output.trim().split("\n")[0];
}

async function loadList(kind, cwd, on) {
  const r = await exec("gh", KINDS[kind].args, { cwd, on });
  if (r.code !== 0) throw new Error(friendlyError(r.stderr || r.stdout));
  return JSON.parse(r.stdout);
}

export default class GitHub extends View {
  init(_props, cx) {
    this.tab = "prs"; this.items = { prs: [], issues: [] };
    this.refresh(cx);
    cx.timer.every(REFRESH_MS, (cx) => this.refresh(cx));
  }

  refresh(cx) {
    if (this.loading) return;
    const { cwd, on } = location(), context = key();
    if (context !== this.context) { this.context = context; this.items = { prs: [], issues: [] }; this.error = null; }
    if (!cwd) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const [prs, issues] = await Promise.all([loadList("prs", cwd, on), loadList("issues", cwd, on)]);
        if (key() === context) { this.items = { prs, issues }; this.error = null; }
      } catch (e) { if (key() === context) this.error = String(e.message ?? e); }
      finally { this.loading = false; cx.notify(); }
    });
    cx.notify();
  }

  openUrl(url) {
    exec("open", [url]).catch(() => {});
  }

  tabButton(kind, t) {
    const active = this.tab === kind, count = this.items[kind].length;
    return h_flex().id(`gh-tab-${kind}`).h(26).px(10).gap(6).items_center().rounded(7).cursor_pointer()
      .when(active, (e) => e.bg(t.selected)).hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { this.tab = kind; cx.notify(); })
      .child(div().text_color(active ? t.foreground : t.muted).child(KINDS[kind].label))
      .child(div().text_size(10).text_color(t.dim).child(String(count)));
  }

  prMeta(pr, t) {
    const badge = reviewBadge(pr, t);
    return h_flex().gap(8).text_size(11).text_color(t.dim)
      .child(div().text_color(badge.color).child(badge.text))
      .child(div().min_w(0).truncate().child(pr.headRefName));
  }

  issueMeta(issue, t) {
    return h_flex().gap(6).text_size(11).text_color(t.dim).min_w(0).overflow_hidden()
      .children(issue.labels.slice(0, 3).map((l) => div().px(5).rounded(4).border_1().border_color(`#${l.color}88`).text_color(t.muted).child(l.name)));
  }

  row(item, t) {
    const meta = this.tab === "prs" ? this.prMeta(item, t) : this.issueMeta(item, t);
    return v_flex().id(`gh-${this.tab}-${item.number}`).flex_none().px(10).py(7).gap(3).rounded(7).cursor_pointer()
      .hover((s) => s.bg(t.hover)).on_click(() => this.openUrl(item.url))
      .child(h_flex().gap(8).items_center()
        .child(div().flex_none().text_size(11).text_color(t.accent).child(`#${item.number}`))
        .child(div().flex_1().min_w(0).truncate().child(item.title)))
      .child(h_flex().gap(8).items_center()
        .child(div().flex_1().min_w(0).child(meta))
        .child(div().flex_none().text_size(11).text_color(t.dim).child(`${item.author?.login ?? ""} · ${ago(item.updatedAt)}`)));
  }

  emptyText() {
    if (this.error) return this.error;
    if (this.loading) return "Loading…";
    return this.tab === "prs" ? "No open pull requests" : "No open issues";
  }

  render(cx) {
    if (key() !== this.context) this.refresh(cx);
    const t = theme(), list = this.items[this.tab];
    return v_flex().id("github").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(10).gap(4).items_center().border_b(1).border_color(t.border)
        .child(this.tabButton("prs", t)).child(this.tabButton("issues", t)).child(div().flex_1())
        .child(div().id("gh-refresh").px(8).h(26).flex().items_center().rounded(7).cursor_pointer().text_size(11).text_color(t.muted)
          .hover((s) => s.bg(t.hover)).on_click((_e, cx) => this.refresh(cx)).child(this.loading ? "…" : "Refresh")))
      .child(v_flex().id("github-list").flex_1().min_h(0).overflow_y_scrollbar().p(6).gap(2)
        .children(list.map((item) => this.row(item, t)))
        .when(!list.length, (e) => e.child(div().p(8).text_color(this.error ? t.ansi1 : t.dim).child(this.emptyText()))));
  }
}
