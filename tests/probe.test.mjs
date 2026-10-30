import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProbe, containerHealth, needsAttention, usage, containerAlerts } from "../servers-panel/mods/servers/probe.js";

const LINUX = [
  "os=Linux", "load=0.18 0.17 0.14", "cpus=4", "mem=8000 2000", "disk=1000 400 600", "uptime=172800.5",
  "c=a1\tweb\trunning\tUp 3 days (healthy)\tshop/web:1\tshop",
  "c=b2\tworker\trunning\tUp 3 days (unhealthy)\tshop/worker:1\tshop",
  "c=c3\tmigrate\texited\tExited (0) 2 days ago\tshop/web:1\tshop",
  "c=d4\tcron\texited\tExited (137) 1 hour ago\tcron:1\t",
].join("\n");
const container = (name, state, status) => ({ name, state, status, project: "" });
const machine = (...containers) => ({ docker: { containers } });

test("parseProbe_linuxOutput_readsStatsAndContainers", () => {
  const p = parseProbe(LINUX);
  assert.deepEqual(p.load, [0.18, 0.17, 0.14]);
  assert.equal(p.cpus, 4);
  assert.deepEqual(p.mem, { total: 8000, available: 2000 });
  assert.deepEqual(p.disk, { total: 1024000, used: 409600, free: 614400 });
  assert.equal(p.uptime, 172800.5);
  assert.deepEqual(p.docker.containers.map((c) => [c.name, c.project]), [["web", "shop"], ["worker", "shop"], ["migrate", "shop"], ["cron", ""]]);
});

test("parseProbe_commaDecimalsAndDockerErrors_readsThem", () => {
  assert.deepEqual(parseProbe("load=3,35 4,15 4,50").load, [3.35, 4.15, 4.5]);
  assert.deepEqual(parseProbe("docker_err=permission denied while trying to connect").docker, { error: "no permission" });
  assert.deepEqual(parseProbe("docker_err=not installed").docker, { error: "not installed" });
});

test("containerHealth_statesAndStatuses_classifies", () => {
  const health = parseProbe(LINUX).docker.containers.map(containerHealth);
  assert.deepEqual(health, ["ok", "unhealthy", "stopped", "down"]);
  assert.equal(containerHealth(container("x", "running", "Up 5 seconds (health: starting)")), "starting");
  assert.equal(containerHealth(container("x", "restarting", "Restarting (1) 3 seconds ago")), "restarting");
});

test("needsAttention_onlyBrokenContainers_returnsTrue", () => {
  assert.deepEqual(parseProbe(LINUX).docker.containers.map(needsAttention), [false, true, false, true]);
});

test("usage_stats_returnsPercentages", () => {
  assert.deepEqual(usage(parseProbe(LINUX)), { cpu: 5, mem: 75, disk: 40 });
  assert.deepEqual(usage({ load: null, cpus: null, mem: null, disk: null }), { cpu: null, mem: null, disk: null });
  assert.equal(usage({ load: [12, 0, 0], cpus: 8, mem: null, disk: null }).cpu, 100);
});

test("containerAlerts_changesBetweenLooks_reportsDownAndBack", () => {
  const before = machine(container("web", "running", "Up 1 day"), container("db", "exited", "Exited (1) now"));
  const after = machine(container("web", "running", "Up 1 day (unhealthy)"), container("db", "running", "Up 1 second"), container("new", "exited", "Exited (1) now"));
  assert.deepEqual(containerAlerts(before, after), [
    { name: "web", health: "unhealthy", down: true },
    { name: "db", health: "ok", down: false },
  ]);
});

test("containerAlerts_firstLookOrDockerError_reportsNothing", () => {
  const now = machine(container("web", "exited", "Exited (1) now"));
  assert.deepEqual(containerAlerts(undefined, now), []);
  assert.deepEqual(containerAlerts({ docker: { error: "no permission" } }, now), []);
});
