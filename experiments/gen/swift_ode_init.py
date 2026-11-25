#!/usr/bin/env python3
"""Generate the data files of the experiment page "swift-ode-init".

    python3 experiments/gen/swift_ode_init.py            read DeltaAI over SSH (host "deltaai")
    python3 experiments/gen/swift_ode_init.py --local    run on DeltaAI itself
    add --print to either: show a summary and write nothing

Writes experiments/data/swift-ode-init.record.json and swift-ode-init.figs.json; then run `npm run build`.
Nothing on the cluster is changed: the script reads the Slurm accounting, the queue, the last line of each run's
metrics.jsonl (to know how far the run is), and the VBench results (scores.json) of the evaluated checkpoints.

The metric of this page is the VBench score (owner, 2026-11-25: we measure the VBench score, not the distance
to the ODE target).

This script is written for this one experiment (see experiments/SPEC.md). It belongs in the research repository
(Swift-Forcing); it sits here until the owner decides where it lives (agent, 2026-11-25).

What the page shows is decided here, in RUNS and in build_figs. The numbers are never typed: they come from the cluster.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

HOST = "deltaai"
# The frozen copy of the code that the clean-context runs use, and their checkpoint folders.
RUN_ROOT = "/work/hdd/bjki/wchen38/swift-forcing-runs/cleanctx-20261123"
LOGS = RUN_ROOT + "/logs"
GPU = "GH200"  # DeltaAI's ghx4 partition: four GH200 GPUs per node
SINCE = "2026-11-01"  # count the project's compute from this day
PROJECT_JOBS = ("sf-", "sfchain")  # Slurm job names of this project; everything else of the user is left out
SLUG = "swift-ode-init"

FACTORS = [["target", "Target", "回归目标"], ["steps", "Steps", "步数"]]

# One row of the record per run. `jobs` are the Slurm job names that carry the run; a job may carry two runs.
# `last` is the last step the run logs (it logs steps first..last); None when the page does not track its steps.
RUNS = [
    {
        "key": "shared",
        "setup": {"en": "Shared start for both arms", "zh": "两组共用的起始阶段"},
        "target": "plain",
        "steps": "0 → 750",
        "logdir": "ode_shared",
        "last": 749,
        "jobs": ["sf-ode-cc-shared-swift", "sf-ode-cc-shared-baseline"],
        "q": ["ode"],
    },
    {
        "key": "baseline",
        "setup": {"en": "Baseline: plain ODE target", "zh": "基线：原始 ODE 目标"},
        "target": "plain",
        "steps": "750 → 3000",
        "logdir": "ode_baseline",
        "last": 2999,
        "jobs": ["sf-ode-cc-shared-baseline"],
        "figs": ["vbench-ode"],
    },
    {
        "key": "swift",
        "setup": {"en": "Swift target, α = 0.25", "zh": "Swift 目标，α = 0.25"},
        "target": "Swift",
        "steps": "750 → 3000",
        "logdir": "ode_swift",
        "last": 2999,
        "jobs": ["sf-ode-cc-shared-swift"],
        "figs": ["vbench-ode"],
    },
    {
        "key": "dmd_baseline",
        "setup": {"en": "DMD training from the baseline initialization", "zh": "从基线初始化开始的 DMD 训练"},
        "target": "plain",
        "steps": "DMD",
        "logdir": "dmd_baseline",
        "last": None,
        "jobs": ["sf-dmd-cc-baseline"],
        "figs": ["vbench-dmd"],
    },
    {
        "key": "dmd_swift",
        "setup": {"en": "DMD training from the Swift initialization", "zh": "从 Swift 初始化开始的 DMD 训练"},
        "target": "Swift",
        "steps": "DMD",
        "logdir": "dmd_swift",
        "last": None,
        "jobs": ["sf-dmd-cc-swift"],
        "figs": ["vbench-dmd"],
    },
]

# VBench: the two arms of a figure, and the group scores it shows (as scores.json names them).
ARMS = {
    "baseline": {"name": {"en": "Baseline", "zh": "基线"}, "color": "ref"},
    "swift": {"name": {"en": "Swift target", "zh": "Swift 目标"}, "color": "s1"},
}
GROUPS = [("total", {"en": "Total", "zh": "总分"}), ("quality", {"en": "Quality", "zh": "质量"}), ("semantic", {"en": "Semantic", "zh": "语义"})]
ODE_FINAL = 3000  # the checkpoint at the end of the ODE initialization


# ---------- reading the cluster ----------

def remote_script():
    """One shell script that prints everything the page needs, in tagged sections."""
    runs = " ".join(r["logdir"] for r in RUNS)
    return f"""
echo "@@tz"; date +%z
echo "@@now"; date +%s
echo "@@sacct"; sacct -u "$USER" -S {SINCE} -X -P -n --format=JobID,JobName,State,Start,End,ElapsedRaw,AllocTRES 2>/dev/null
echo "@@squeue"; squeue -u "$USER" -h -o '%i|%j|%T|%b' 2>/dev/null
for d in {runs}; do
  # Where the run really writes: the folder its job passed to train.py, as printed in the job's output file.
  # The checkpoint root can be overridden at submit time, so the default below is only a fallback.
  p=$(grep -h -o -- "--logdir [^ ]*/$d" {RUN_ROOT}/logs/slurm/*.out 2>/dev/null | tail -1 | cut -d' ' -f2)
  [ -n "$p" ] || p={LOGS}/$d
  echo "@@where $d"; echo "$p"
  echo "@@files $d"; stat -c '%Y %n' "$p"/config_from_step_*.yaml "$p"/metrics.jsonl 2>/dev/null
  echo "@@metrics $d"; tail -n 1 "$p"/metrics.jsonl 2>/dev/null
done
# every VBench result of this copy of the code, whatever its output folder is called
for f in $(find {RUN_ROOT}/eval -maxdepth 4 -name scores.json 2>/dev/null | sort); do
  echo "@@scores $f"; cat "$f"
done
echo "@@end"
"""


def fetch(local):
    cmd = ["bash", "-s"] if local else ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", HOST, "bash -s"]
    # stdout=PIPE and universal_newlines instead of capture_output and text: the cluster's python3 is 3.6
    out = subprocess.run(cmd, input=remote_script(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
    if out.returncode != 0 or "@@end" not in out.stdout:
        hint = "" if local else f"\nIs the connection to {HOST} open? Log in once with `ssh {HOST}` (it needs 2FA), then run this again."
        sys.exit(f"Could not read the cluster (exit {out.returncode}): {out.stderr.strip()[:400]}{hint}")
    sections, name = {}, None
    for line in out.stdout.splitlines():
        if line.startswith("@@"):
            name = line[2:].strip()
            sections[name] = []
        elif name:
            sections[name].append(line)
    return sections


def parse_jobs(sections):
    """Slurm jobs of this project: {name: [job, ...]} oldest first, each with state, GPUs and elapsed hours."""
    # The queue knows what the accounting does not yet: the GPUs a waiting job asked for, and jobs that are
    # held behind another job (those do not appear in sacct until they become eligible).
    queue = {}
    for line in sections.get("squeue", []):
        parts = line.split("|")
        if len(parts) == 4 and parts[1].startswith(PROJECT_JOBS):
            asked = parts[3].rsplit(":", 1)[-1]  # "gres/gpu:4"
            queue[parts[0]] = {"id": parts[0], "name": parts[1], "state": parts[2], "start": "", "end": "", "hours": 0.0, "gpus": int(asked) if asked.isdigit() else 0}
    jobs = []
    for line in sections.get("sacct", []):
        f = line.split("|")
        if len(f) < 7 or not f[1].startswith(PROJECT_JOBS):
            continue
        gpus = 0
        for item in f[6].split(","):
            if item.startswith("gres/gpu="):
                gpus = int(item.split("=")[1])
        waiting = queue.pop(f[0], None)
        state = waiting["state"] if waiting else f[2].split()[0]
        jobs.append({"id": f[0], "name": f[1], "state": state, "start": f[3], "end": f[4], "hours": int(f[5] or 0) / 3600, "gpus": gpus or (waiting or {}).get("gpus", 0)})
    return jobs + list(queue.values())


def parse_metrics(lines):
    rows = []
    for line in lines:
        line = line.strip()
        if line:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass  # a line cut off while the run was writing
    return rows


def stamp(epoch, tz):
    sign = 1 if tz[0] == "+" else -1
    offset = timezone(sign * timedelta(hours=int(tz[1:3]), minutes=int(tz[3:5])))
    return datetime.fromtimestamp(epoch, offset).strftime("%Y-%m-%dT%H:%M") + tz


# ---------- the record ----------

def run_state(run, metrics, jobs):
    """'' when finished, else Planned, Queued, Running or Failed."""
    mine = [j for j in jobs if j["name"] in run["jobs"]]
    if not mine:
        return "Planned"
    states = {j["state"] for j in mine}
    last = metrics[-1]["step"] if metrics else None
    done = last is not None and (run["last"] is None or last >= run["last"])
    if run["last"] is None:  # no step count to check: trust the job
        done = bool(metrics) and "COMPLETED" in states and "RUNNING" not in states
    if done:
        return ""
    if "RUNNING" in states:
        return "Running" if metrics else "Queued"  # a packed job has started, but not this run yet
    if "PENDING" in states:
        return "Queued"
    return "Failed"


def to_epoch(text, tz, now):
    """A Slurm time such as 2026-11-22T07:21:38, in the cluster's zone. 'Unknown' (still running) is now."""
    try:
        naive = datetime.strptime(text, "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return now
    sign = 1 if tz[0] == "+" else -1
    return int(naive.replace(tzinfo=timezone(sign * timedelta(hours=int(tz[1:3]), minutes=int(tz[3:5])))).timestamp())


def split_jobs(sections, jobs, tz, now):
    """
    Give every hour of every job that ran to one run, so that the record adds up to what Slurm charged.
    A job that carries one run gives it all its time. A job that carries two runs in a row (the shared start, then
    an arm) is cut where the second run began: the first config file that run saved while the job was running.
    Returns {run key: [(start, end, gpus, job id), ...]}.
    """
    saved = {}  # run key -> times at which the trainer saved a config, i.e. each time the run started or resumed
    for run in RUNS:
        lines = sections.get("files " + run["logdir"], [])
        saved[run["key"]] = sorted(int(l.split()[0]) for l in lines if l.strip() and "config_from_step" in l)
    pieces = {run["key"]: [] for run in RUNS}
    for job in jobs:
        if job["hours"] <= 0:
            continue
        start, end = to_epoch(job["start"], tz, now), to_epoch(job["end"], tz, now)
        carried = [run["key"] for run in RUNS if job["name"] in run["jobs"]]
        cuts = [start]
        for key in carried[1:]:
            began = [t for t in saved[key] if cuts[-1] <= t <= end]
            cuts.append(began[0] if began else end)  # a run that never began in this job gets no time from it
        cuts.append(end)
        for key, t0, t1 in zip(carried, cuts, cuts[1:]):
            if t1 > t0:
                pieces[key].append((t0, t1, job["gpus"], job["id"]))
    return pieces


def build_record(sections, jobs):
    tz = (sections.get("tz") or ["+0000"])[0].strip()
    now = int((sections.get("now") or ["0"])[0].strip() or 0)
    pieces = split_jobs(sections, jobs, tz, now)
    rows, main_hours, main_jobs = [], 0.0, set()
    for run in RUNS:
        metrics = parse_metrics(sections.get("metrics " + run["logdir"], []))
        state = run_state(run, metrics, jobs)
        mine = [j for j in jobs if j["name"] in run["jobs"]]
        row = {"setup": run["setup"], "target": run["target"], "steps": run["steps"]}
        gpus = max([j["gpus"] for j in mine] or [0])
        if gpus:
            row["gpus"] = gpus
        ran = pieces[run["key"]]
        if ran:
            row["hours"] = round(sum(t1 - t0 for t0, t1, _, _ in ran) / 3600, 1)
            row["start"] = stamp(min(t0 for t0, _, _, _ in ran), tz)
            if state == "":
                row["end"] = stamp(max(t1 for _, t1, _, _ in ran), tz)
            main_hours += sum((t1 - t0) / 3600 * g for t0, t1, g, _ in ran)
            main_jobs.update(job_id for _, _, _, job_id in ran)
        if run.get("figs"):
            row["figs"] = run["figs"]
        if run.get("q"):
            row["q"] = run["q"]
        if state:
            row["state"] = state
        rows.append(row)
        # A job that has run without leaving metrics where we look means we are looking in the wrong folder.
        if ran and not metrics:
            where = (sections.get("where " + run["logdir"]) or ["?"])[0]
            print(f"WARNING: {run['key']}: its job has run, but there is no metrics.jsonl in {where}", file=sys.stderr)

    # Everything else the project ran: smoke tests, the discarded first attempt, failed and cancelled jobs.
    started = [j for j in jobs if j["hours"] > 0]
    total_hours = sum(j["gpus"] * j["hours"] for j in started)
    cost = {
        "main": {"gpu_hours": round(main_hours, 1), "jobs": len(main_jobs)},
        "other": {"gpu_hours": round(max(total_hours - main_hours, 0), 1), "jobs": len([j for j in started if j["id"] not in main_jobs])},
    }
    return {"generated_by": "experiments/gen/swift_ode_init.py", "gpu": GPU, "factors": FACTORS, "rows": rows, "cost": cost}


# ---------- the figures ----------

def vbench_results(sections):
    """Every VBench result, keyed by run folder and checkpoint step: {(logdir, step): scores}. The full set wins over a subset."""
    where = {r["logdir"]: (sections.get("where " + r["logdir"]) or [""])[0].strip() for r in RUNS}
    best = {}
    for name, lines in sections.items():
        if not name.startswith("scores "):
            continue
        try:
            scores = json.loads("\n".join(lines))
            checkpoint = scores["setup"]["checkpoint"]
        except (ValueError, KeyError):
            continue
        step = re.search(r"checkpoint_model_(\d+)", checkpoint)
        logdir = next((d for d, p in where.items() if p and checkpoint.startswith(p + "/")), None)
        if not step or not logdir or scores.get("missing_dimensions"):
            continue  # another experiment's checkpoint, or an evaluation that has not finished
        size = (bool(scores["subset"]["is_full"]), sum(scores.get("num_videos", {}).values()))
        key = (logdir, int(step.group(1)))
        if key not in best or size > best[key][0]:
            best[key] = (size, scores)
    return {k: v[1] for k, v in best.items()}


def vbench_figure(results, picked, state, title, will_show, shows):
    """
    A bar chart of the VBench group scores of the two arms.
    picked: {arm: (logdir, step) or None}; state: {arm: state of its training run}.
    Until both arms have a result the figure is a placeholder with a status.
    """
    scores = {arm: results.get(key) for arm, key in picked.items()}
    filled = all(scores.values())
    status = "" if filled else next((state[a] for a in ARMS if state[a]), "Planned")  # trained but not evaluated yet: Planned
    caption = will_show
    if filled:
        subsets = {arm: (sc["subset"]["is_full"], sum(sc["num_videos"].values())) for arm, sc in scores.items()}
        if len(set(subsets.values())) > 1:
            print(f"WARNING: {title['en']}: the two arms were evaluated on different subsets {subsets}", file=sys.stderr)
        full, videos = subsets["baseline"]
        on = {"en": "the full VBench set" if full else f"a VBench subset of {videos} videos", "zh": "完整的 VBench 集合" if full else f"{videos} 个视频的 VBench 子集"}
        caption = {"en": shows["en"].format(on=on["en"]), "zh": shows["zh"].format(on=on["zh"])}
    series = []
    for arm, look in ARMS.items():
        points = []
        if filled:
            points = [[i, round(100 * scores[arm][key], 2)] for i, (key, _) in enumerate(GROUPS) if scores[arm].get(key) is not None]
        series.append(dict(look, points=points))
    fig = {
        "kind": "bar",
        "status": status,
        "title": title,
        "caption": caption,
        "more": {
            "en": "Total is the VBench weighted mean of Quality and Semantic. Our scoring departs from the official protocol in one place: it scores temporal flickering on the standard videos, without the filter that removes static videos.",
            "zh": "总分是 VBench 对质量分和语义分的加权平均。我们的评分与官方流程有一处不同：temporal flickering 在标准视频上直接评分，没有先过滤静态视频。",
        },
        "x": {"categories": [label for _, label in GROUPS]},
        "y": {"label": {"en": "VBench score", "zh": "VBench 分数"}},
        "series": series,
    }
    if not filled:
        fig["y"].update({"min": 0, "max": 100})  # a placeholder needs a range to draw its axes
    return fig


def build_figs(sections, record):
    results = vbench_results(sections)
    state = {r["key"]: row.get("state", "") for r, row in zip(RUNS, record["rows"])}

    ode = {arm: (f"ode_{arm}", ODE_FINAL) if (f"ode_{arm}", ODE_FINAL) in results else None for arm in ARMS}
    # DMD: the latest checkpoint that both arms have a result for
    steps = [{step for (d, step) in results if d == f"dmd_{arm}"} for arm in ARMS]
    common = max(steps[0] & steps[1], default=None)
    dmd = {arm: (f"dmd_{arm}", common) if common is not None else None for arm in ARMS}

    return {
        "vbench-ode": vbench_figure(
            results,
            ode,
            {arm: state[arm] for arm in ARMS},
            {"en": "VBench scores after the ODE initialization", "zh": "ODE 初始化之后的 VBench 分数"},
            {
                "en": "Will show whether the student trained on the Swift target scores higher on VBench than the baseline at the end of the ODE initialization.",
                "zh": "将显示在 ODE 初始化结束时，用 Swift 目标训练的学生模型的 VBench 分数是否高于基线。",
            },
            {
                "en": "VBench group scores of the two students at the end of the ODE initialization, on {on}. Higher is better.",
                "zh": "ODE 初始化结束时两个学生模型的 VBench 分组得分，评测集为{on}。越高越好。",
            },
        ),
        "vbench-dmd": vbench_figure(
            results,
            dmd,
            {arm: state[f"dmd_{arm}"] for arm in ARMS},
            {"en": "VBench scores after DMD training", "zh": "DMD 训练之后的 VBench 分数"},
            {
                "en": "Will show whether a student that starts from the Swift initialization scores higher on VBench after DMD training.",
                "zh": "将显示从 Swift 初始化出发的学生模型，在 DMD 训练之后的 VBench 分数是否更高。",
            },
            {
                "en": "VBench group scores of the two students after DMD training, on {on}. Higher is better."
                + (f" Both are the checkpoints at DMD step {common}." if common is not None else ""),
                "zh": "DMD 训练之后两个学生模型的 VBench 分组得分，评测集为{on}。越高越好。" + (f"两者都是 DMD 第 {common} 步的 checkpoint。" if common is not None else ""),
            },
        ),
    }


# ---------- main ----------

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--local", action="store_true", help="run on the cluster itself instead of over SSH")
    ap.add_argument("--out", help="folder for the two JSON files (default: experiments/data next to this script)")
    ap.add_argument("--print", action="store_true", dest="dry", help="print a summary and write nothing")
    args = ap.parse_args()

    sections = fetch(args.local)
    jobs = parse_jobs(sections)
    record = build_record(sections, jobs)
    figs = build_figs(sections, record)

    if not args.dry:
        out = args.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
        os.makedirs(out, exist_ok=True)
        for name, data in (("record", record), ("figs", figs)):
            path = os.path.join(out, f"{SLUG}.{name}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print("wrote", os.path.relpath(path))
    for run, row in zip(RUNS, record["rows"]):
        print(f"  {run['key']:<13} {row.get('state') or 'finished':<9} {row.get('hours', '')}")
    for key, fig in figs.items():
        print(f"  figure {key:<11} {fig['status'] or 'filled'}")
    c = record["cost"]
    print(f"  main {c['main']['gpu_hours']} {GPU}-hours in {c['main']['jobs']} jobs; other {c['other']['gpu_hours']} in {c['other']['jobs']} jobs")


if __name__ == "__main__":
    main()
