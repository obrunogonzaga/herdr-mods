import { div } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { theme } from "herdr";
import { summarizeChecks, checksIcon, checksSummaryText } from "./checks.js";
import { openUrl } from "./open.js";
import { safeUrl } from "./urls.js";
import { gh } from "./gh.js";
import { ago, reviewBadge, mergeBadge, diffText, assigneeLogins } from "./format.js";

const FIELDS = {
  prs: "number,title,body,author,state,isDraft,url,baseRefName,headRefName,reviewDecision,statusCheckRollup,additions,deletions,changedFiles,labels,assignees,createdAt,updatedAt,mergeStateStatus",
  issues: "number,title,body,author,state,url,labels,assignees,createdAt,updatedAt,milestone",
};

function viewArgs(kind, number) {
  const noun = kind === "prs" ? "pr" : "issue";
  return [noun, "view", String(number), "--json", FIELDS[kind]];
}

function checksColor(state, colors) {
  if (state === "pass") return colors.ansi2;
  if (state === "fail") return colors.ansi1;
  if (state === "pending") return colors.working;
  return colors.dim;
}

export class Detail {
  init({ kind, number, cwd, on, onBack, onAgent }, cx) {
    this.kind = kind;
    this.number = number;
    this.cwd = cwd;
    this.on = on;
    this.onBack = onBack;
    this.onAgent = onAgent;
    this.generation = 0;
    this.item = null;
    this.error = null;
    this.loading = false;
    this.load(cx);
  }

  load(cx) {
    const generation = ++this.generation;
    this.loading = true;
    cx.spawn(async (spawned) => {
      try {
        await this.apply(generation);
      } catch (error) {
        this.fail(generation, error);
      } finally {
        if (generation === this.generation) this.loading = false;
        spawned.notify();
      }
    });
  }

  async apply(generation) {
    const item = await gh(viewArgs(this.kind, this.number), this.cwd, this.on);
    if (generation !== this.generation) return;
    this.item = item;
    this.error = null;
  }

  fail(generation, error) {
    if (generation !== this.generation) return;
    this.error = String(error.message ?? error);
  }

  chip(id, label, onClick, colors) {
    return div().id(id).flex_none().px(8).h(26).flex().items_center().rounded(7).cursor_pointer()
      .text_size(11).text_color(colors.muted).hover((style) => style.bg(colors.hover))
      .on_click((_event, cx) => { onClick(cx); cx.notify(); }).child(label);
  }

  toolbar(colors) {
    const item = this.item;
    return h_flex().h(42).flex_none().px(10).gap(6).items_center().border_b(1).border_color(colors.border)
      .child(this.chip("gh-back", "Back", () => this.onBack(), colors))
      .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(colors.dim).child(`#${item?.number ?? this.number}`))
      .when(this.kind === "issues" && Boolean(item), (row) => row.child(this.agentButton(item, colors)))
      .when(Boolean(item?.url), (row) => row.child(this.chip("gh-open", "GitHub", () => openUrl(item.url), colors)))
      .child(this.chip("gh-detail-refresh", this.loading ? "…" : "Refresh", (cx) => this.load(cx), colors));
  }

  agentButton(issue, colors) {
    return div().id(`gh-detail-agent-${issue.number}`).flex_none().px(7).h(20).flex().items_center().rounded(6)
      .text_size(11).text_color(colors.muted).border_1().border_color(colors.border)
      .hover((style) => style.bg(colors.raised).text_color(colors.foreground))
      .on_click((_event, cx) => { cx.stop_propagation(); this.onAgent(issue); }).child("Agent");
  }

  facts(item, colors) {
    const opened = item.createdAt ? `opened ${ago(item.createdAt)}` : "";
    const updated = item.updatedAt ? `updated ${ago(item.updatedAt)}` : "";
    const who = [item.author?.login, opened, updated].filter(Boolean).join(" · ");
    const state = item.state && item.state !== "OPEN" ? item.state.toLowerCase() : "";
    return h_flex().gap(8).text_size(11).text_color(colors.dim)
      .child(div().min_w(0).truncate().child(who))
      .when(Boolean(state), (row) => row.child(div().flex_none().child(state)));
  }

  prLine(pr, colors) {
    const review = reviewBadge(pr, colors);
    const merge = mergeBadge(pr.mergeStateStatus, colors);
    const diff = diffText(pr);
    const branch = `${pr.headRefName} → ${pr.baseRefName}`;
    return h_flex().gap(8).flex_wrap().items_center().text_size(11)
      .child(div().flex_none().text_color(review.color).child(review.text))
      .child(div().flex_1().min_w(0).truncate().text_color(colors.dim).child(branch))
      .child(div().flex_none().text_color(colors.ansi2).child(`+${diff.additions}`))
      .child(div().flex_none().text_color(colors.ansi1).child(`-${diff.deletions}`))
      .child(div().flex_none().text_color(colors.dim).child(`${diff.files} ${diff.noun}`))
      .when(Boolean(merge) && merge.text !== review.text, (row) => row.child(div().flex_none().text_color(merge.color).child(merge.text)));
  }

  checksBlock(pr, colors) {
    const summary = summarizeChecks(pr.statusCheckRollup);
    return v_flex().gap(2)
      .child(div().text_size(11).text_color(checksColor(summary.state, colors)).child(checksSummaryText(summary)))
      .when(summary.checks.length > 0, (block) => block.child(this.checkList(summary.checks, colors)));
  }

  checkList(checks, colors) {
    return v_flex().max_h(132).overflow_y_scrollbar().gap(1)
      .children(checks.map((check, index) => this.checkRow(check, index, colors)));
  }

  checkRow(check, index, colors) {
    const icon = checksIcon(check.state, colors) ?? { text: "·", color: colors.dim };
    const url = safeUrl(check.url);
    const row = h_flex().id(`gh-check-${index}`).h(22).gap(8).items_center().rounded(4).px(2)
      .child(div().flex_none().text_size(11).text_color(icon.color).child(icon.text))
      .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(colors.muted).child(check.name || "check"));
    if (!url) return row;
    return row.cursor_pointer().hover((style) => style.bg(colors.hover)).on_click(() => openUrl(url));
  }

  labels(item, colors) {
    const labels = item.labels ?? [];
    if (!labels.length) return null;
    return h_flex().gap(6).flex_wrap().children(labels.map((label, index) =>
      div().id(`gh-detail-label-${index}`).px(5).h(18).flex().items_center().rounded(4).border_1()
        .border_color(`#${label.color}88`).text_size(11).text_color(colors.muted).child(label.name)));
  }

  assignees(item, colors) {
    const names = assigneeLogins(item);
    if (!names.length) return null;
    return div().text_size(11).text_color(colors.dim).child(`assignees ${names.join(", ")}`);
  }

  issueMeta(item, colors) {
    const plan = item.milestone?.title;
    const labels = this.labels(item, colors);
    const people = this.assignees(item, colors);
    return v_flex().gap(6)
      .when(Boolean(plan), (block) => block.child(div().text_size(11).text_color(colors.dim).child(plan)))
      .when(Boolean(labels), (block) => block.child(labels))
      .when(Boolean(people), (block) => block.child(people));
  }

  meta(item, colors) {
    return v_flex().flex_none().px(10).py(8).gap(6).border_b(1).border_color(colors.border)
      .child(div().text_size(14).font_semibold().whitespace_normal().child(item.title))
      .child(this.facts(item, colors))
      .when(this.kind === "prs", (block) => block.child(this.prLine(item, colors)).child(this.checksBlock(item, colors)))
      .when(this.kind === "issues", (block) => block.child(this.issueMeta(item, colors)));
  }

  description(item, colors) {
    const text = item.body?.trim();
    if (!text) return div().p(10).text_size(13).text_color(colors.dim).child("No description");
    const markdown = TextView.markdown(`gh-md-${this.kind}-${item.number}`, text).selectable(true);
    return div().flex_1().min_h(0).px(10).py(8).overflow_y_scrollbar()
      .child(markdown.on_link_click((url) => openUrl(url)));
  }

  placeholder(colors) {
    const text = this.error ?? "Loading…";
    return div().p(8).text_color(this.error ? colors.ansi1 : colors.dim).child(text);
  }

  content(colors) {
    if (!this.item) return this.placeholder(colors);
    return v_flex().flex_1().min_h(0)
      .child(this.meta(this.item, colors))
      .when(Boolean(this.error), (block) => block.child(div().flex_none().px(10).py(4).text_size(11).text_color(colors.ansi1).child(this.error)))
      .child(this.description(this.item, colors));
  }

  render() {
    const colors = theme();
    return v_flex().id("gh-detail").size_full().min_h(0)
      .child(this.toolbar(colors))
      .child(this.content(colors));
  }
}
