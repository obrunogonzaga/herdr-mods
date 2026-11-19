import { exec } from "herdr";

export function friendlyError(output) {
  const text = String(output ?? "");
  if (/not a git repository/i.test(text)) return "Not a git repository";
  if (/no git remotes|none of the git remotes/i.test(text)) return "No GitHub remote in this repo";
  if (/gh auth login|not logged/i.test(text)) return "Run gh auth login first";
  return text.trim().split("\n")[0];
}

export async function gh(args, cwd, on) {
  const result = await exec("gh", args, { cwd, on });
  if (result.code !== 0) throw new Error(friendlyError(result.stderr || result.stdout));
  return JSON.parse(result.stdout);
}
