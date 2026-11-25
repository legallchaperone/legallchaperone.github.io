#!/usr/bin/env python3
"""Generate the data files of the experiment page "tacguide".

    python3 experiments/gen/tacguide.py            read the training machine over SSH (host alias "cwx")
    python3 experiments/gen/tacguide.py --local    run on the training machine itself
    add --print to either: show a summary and write nothing

Writes experiments/data/tacguide.record.json and tacguide.figs.json; then run `npm run build`.
Nothing on the machine is changed. The script reads:
  - the training logs (progress lines: step, loss, elapsed time) and the times of the checkpoint folders;
  - result.json of every closed-loop episode that was copied back from the simulation machine, including the
    check of its first frame (an episode that did not pass it is refused);
  - the output of the project's own miss analysis (training/checks/diagnostics/miss_table.py), which
    reads the recorded joint states of each episode.

This script is written for this one experiment (see experiments/SPEC.md). It belongs in the research repository
(TacGuide); it sits here until the owner decides where it lives (agent, 2026-11-25).

What the page shows is decided here, in RUNS and in build_figs. The numbers are never typed.

Judgement calls (agent, 2026-11-25), for the owner to review:
  - The machine has no scheduler, so compute is taken from the logs: the elapsed time the trainer prints, summed
    over every time a run started or resumed, one GPU each. Logs of a run on the page count as main; every other
    training or smoke-test log counts as other. Simulation time on the rented evaluation GPU is not counted.
  - The `code` link of a run is the commit its checkout was on when the run's newest log was created, read from
    the checkout's reflog. Nothing recorded the commit inside the run itself.
  - Episodes run under other execution settings (names not listed in EPISODE_GROUPS) are left out of the figures.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

HOST = "cwx"
ROOT = "/data2/cwx/TacGuide"  # logs, checkpoints and evaluation records
CHECKOUTS = {"train": "~/TacGuide", "distill": "~/TacGuide-distill"}  # where the runs' code lives
REPO = "https://github.com/legallchaperone/TacGuide"
GPU = "RTX PRO 6000"
SLUG = "tacguide"
EVAL_SEED = 10000  # scenes with a seed below this were used to collect the training demonstrations
STALE = 20 * 60  # a log untouched for this long belongs to a run that is no longer running

FACTORS = [["task", "Task", "任务"], ["inputs", "Inputs", "输入"], ["steps", "Steps", "步数"]]

VT = "vision + touch"
V = "vision"

# One row of the record per run. `logs` are shell globs under ROOT; `ckpt` is the checkpoint folder under
# ROOT/outputs/training; `total` is the step the run ends at.
RUNS = [
    {
        "key": "gc_A",
        "setup": {"en": "Policy with touch", "zh": "带触觉的策略"},
        "task": "Grasp Chip", "inputs": VT, "steps": "0 → 10k",
        "logs": ["logs/train_gc_A.log"], "ckpt": "openvtla/gc/gc_A", "total": 10000, "code": "train",
        "figs": ["success", "miss", "loss"],
    },
    {
        "key": "gc_B",
        "setup": {"en": "Vision-only policy", "zh": "纯视觉策略"},
        "task": "Grasp Chip", "inputs": V, "steps": "0 → 10k",
        "logs": ["logs/train_gc_B_to_*.log", "logs/train_gc_B.log"], "ckpt": "pi05/gc/gc_B", "total": 10000,
        "upto": 10000, "code": "train",
        "figs": ["success", "miss", "loss"],
    },
    {
        "key": "gc_C",
        "setup": {"en": "Vision-only student distilled from the policy with touch", "zh": "从带触觉策略蒸馏出的纯视觉学生"},
        "task": "Grasp Chip", "inputs": V, "steps": "0 → 10k",
        "logs": ["queue/logs/train_gc_C*.log"], "ckpt": "pi05/gc/gc_C", "total": 10000, "code": "distill",
        "figs": ["success", "miss"],
    },
    {
        "key": "gc_B20",
        "setup": {"en": "Vision-only policy, continued", "zh": "纯视觉策略，继续训练"},
        "task": "Grasp Chip", "inputs": V, "steps": "10k → 20k",
        "logs": ["logs/train_gc_B_to_*.log", "logs/train_gc_B.log"], "ckpt": "pi05/gc/gc_B", "total": 20000,
        "after": 10000, "code": "train",
        "figs": ["loss-20k", "success-20k"],
    },
    {
        "key": "ga_A",
        "setup": {"en": "Policy with touch", "zh": "带触觉的策略"},
        "task": "Gear Assembly", "inputs": VT, "steps": "0 → 20k",
        "logs": ["logs/train_ga_A.log"], "ckpt": "openvtla/ga/ga_A", "total": 20000, "code": "train",
        "figs": ["success-gear"],
    },
    {
        "key": "ga_B",
        "setup": {"en": "Vision-only policy", "zh": "纯视觉策略"},
        "task": "Gear Assembly", "inputs": V, "steps": "0 → 20k",
        "logs": ["logs/train_ga_B.log"], "ckpt": "pi05/ga/ga_B", "total": 20000, "code": "train",
        "figs": ["success-gear"],
    },
    {
        "key": "gc_D",
        "setup": {"en": "Vision-only student trained on the extrapolated target, w > 1", "zh": "用外推目标训练的纯视觉学生，w > 1"},
        "task": "Grasp Chip", "inputs": V, "steps": "0 → 10k",
        "logs": ["queue/logs/train_gc_D*.log"], "ckpt": "pi05/gc/gc_D_w2", "total": 10000, "code": "distill",
        "figs": ["success-guidance"],
    },
]

# Closed-loop episodes: folder name prefix in logs/eval_debug -> the policy it ran. Anything else is a diagnostic
# run under other execution settings and stays out of the figures.
EPISODE_GROUPS = {"c2_A_": "gc_A", "c3_A_": "gc_A", "c2_B_": "gc_B", "c3_B_": "gc_B", "c_C_": "gc_C"}
POLICIES = [
    ("gc_A", {"en": "With touch", "zh": "带触觉"}),
    ("gc_B", {"en": "Vision only", "zh": "纯视觉"}),
    ("gc_C", {"en": "Distilled student", "zh": "蒸馏学生"}),
]
SCENES = [
    ("new", {"en": "New scenes", "zh": "新场景"}, "s1"),
    ("train", {"en": "Training scenes", "zh": "训练场景"}, "ref"),
]

PROGRESS = re.compile(r"(\d+)/(\d+) \[([\d:]+)<[^\]]*?(?:loss=([0-9.eE+-]+), lr=[0-9.eE+-]+, step=(\d+)(?![0-9.eE+]))?\]")


# ---------- reading the machine ----------

def remote_script():
    """One shell script that prints everything the page needs, in tagged sections."""
    globs = sorted({g for r in RUNS for g in r["logs"]})
    ckpts = sorted({r["ckpt"] for r in RUNS})
    out = [f"cd {ROOT} || exit 1", 'echo "@@tz"; date +%z', 'echo "@@now"; date +%s']
    # every training or smoke-test log, so that compute outside the page's runs is counted too
    out.append(
        "for f in " + " ".join(globs) + " logs/train_*.log logs/smoke*.log; do [ -f \"$f\" ] || continue; "
        'echo "@@log $f"; stat -c "%W %Y" "$f"; '
        "tr '\\r' '\\n' < \"$f\" | grep -o '[0-9]*/[0-9]* \\[[0-9:]*<[^]]*\\]' | awk '!seen[$0]++'; done"
    )
    for c in ckpts:
        out.append(f'echo "@@ckpt {c}"; stat -c "%Y %n" outputs/training/{c}/*/ 2>/dev/null')
    out.append('for f in logs/eval_debug/*/result.json; do echo "@@result $f"; cat "$f"; echo; done')
    out.append(
        'echo "@@miss"; cd logs && '
        f"{ROOT}/venv/bin/python {CHECKOUTS['distill']}/training/checks/diagnostics/miss_table.py "
        + " ".join(f"'{p}*'" for p in EPISODE_GROUPS)
        + " 2>&1; cd .."
    )
    for name, path in CHECKOUTS.items():
        out.append(f'echo "@@reflog {name}"; git -C {path} reflog --date=unix --format="%H %gd" 2>/dev/null')
    out.append('echo "@@end"')
    return "\n".join(out) + "\n"


def fetch(local):
    cmd = ["bash", "-s"] if local else ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", HOST, "bash -s"]
    out = subprocess.run(cmd, input=remote_script(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
    if out.returncode != 0 or "@@end" not in out.stdout:
        sys.exit(f"Could not read the training machine (exit {out.returncode}): {out.stderr.strip()[:400]}")
    sections, name = {}, None
    for line in out.stdout.splitlines():
        if line.startswith("@@"):
            name = line[2:].strip()
            sections[name] = []
        elif name:
            sections[name].append(line)
    return sections


def seconds(text):
    parts = [int(p) for p in text.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0)
    return parts[0] * 3600 + parts[1] * 60 + parts[2]


def parse_logs(sections):
    """{path: {born, touched, segments: [seconds, ...], loss: {step: loss}, last: step}}"""
    logs = {}
    for name, lines in sections.items():
        if not name.startswith("log "):
            continue
        born, touched = (int(x) for x in lines[0].split())
        segments, loss, last, prev = [], {}, 0, None
        for line in lines[1:]:
            m = PROGRESS.search(line)
            if not m:
                continue
            elapsed, step = seconds(m.group(3)), int(m.group(1))
            if prev is None or elapsed < prev:  # the clock went back: the run started or resumed here
                segments.append({"secs": 0, "first": step, "last": step})
            seg = segments[-1]
            seg["secs"], seg["last"] = max(seg["secs"], elapsed), max(seg["last"], step)
            prev = elapsed
            last = max(last, step)
            if m.group(4):
                loss[int(m.group(5))] = float(m.group(4))
        logs[name[4:]] = {"born": born, "touched": touched, "segments": segments, "loss": loss, "last": last}
    return logs


def logs_of(run, logs):
    """The logs of a run, matched against its globs."""
    pats = [re.compile("^" + re.escape(g).replace(r"\*", ".*") + "$") for g in run["logs"]]
    return {p: l for p, l in logs.items() if any(pat.match(p) for pat in pats)}


def stamp(epoch, tz):
    sign = 1 if tz[0] == "+" else -1
    offset = timezone(sign * timedelta(hours=int(tz[1:3]), minutes=int(tz[3:5])))
    return datetime.fromtimestamp(epoch, offset).strftime("%Y-%m-%dT%H:%M") + tz


# ---------- the record ----------

def build_record(sections, logs):
    tz = (sections.get("tz") or ["+0000"])[0].strip()
    now = int(sections["now"][0])
    reflog = {}  # checkout -> [(time, commit)], newest first
    for n in CHECKOUTS:
        reflog[n] = [(int(m.group(2)), m.group(1)) for m in (re.match(r"(\w+) HEAD@\{(\d+)\}", l) for l in sections.get("reflog " + n, [])) if m]

    def commit_at(checkout, when):
        return next((c for t, c in reflog[checkout] if t <= when), "")

    rows, state_of, main_logs, main_seconds, main_jobs = [], {}, set(), 0, 0
    for run in RUNS:
        mine = logs_of(run, logs)
        saved = {}
        for line in sections.get("ckpt " + run["ckpt"], []):
            t, path = line.split(" ", 1)
            step = path.rstrip("/").rsplit("/", 1)[-1]
            if step.isdigit():
                saved[int(step)] = int(t)
        lo, hi = run.get("after", 0), run.get("upto", run["total"])  # the steps this row covers
        reached = max([l["last"] for l in mine.values()] or [0])
        if not mine or reached <= lo:
            state = "Planned"
        elif run["total"] in saved or (hi in saved and "upto" in run):
            state = ""
        elif now - max(l["touched"] for l in mine.values()) < STALE:
            state = "Running"
        else:
            state = "Failed"
        row = {"setup": run["setup"], "task": run["task"], "inputs": run["inputs"], "steps": run["steps"]}
        if state != "Planned":
            # A log may serve two rows (the first 10k steps and the continuation). Each time the trainer started
            # or resumed, its elapsed time goes to the rows in proportion to the steps it ran inside each row.
            secs, jobs, start, newest = 0, 0, None, 0
            for l in mine.values():
                used = False
                for seg in l["segments"]:
                    inside = min(seg["last"], hi) - max(seg["first"], lo)
                    if inside <= 0:
                        continue
                    secs += seg["secs"] * inside / (seg["last"] - seg["first"])
                    jobs += 1
                    used = True
                if used:
                    start = min(start or l["born"], l["born"] or l["touched"])
                    newest = max(newest, l["born"])
            if lo in saved:  # a continuation starts where the checkpoint it continues from was saved
                start = saved[lo]
            row["gpus"] = 1
            row["hours"] = round(secs / 3600, 1)
            if start:
                row["start"] = stamp(start, tz)
            if state == "" and hi in saved:
                row["end"] = stamp(saved[hi], tz)
            commit = commit_at(run["code"], newest)
            if commit:
                row["code"] = f"{REPO}/tree/{commit}"
            main_seconds += secs
            main_jobs += jobs
            main_logs.update(mine)
        row["figs"] = run["figs"]
        if state:
            row["state"] = state
        state_of[run["key"]] = state
        rows.append(row)
    other = {p: l for p, l in logs.items() if p not in main_logs}
    cost = {
        "main": {"gpu_hours": round(main_seconds / 3600, 1), "jobs": main_jobs},
        "other": {"gpu_hours": round(sum(seg["secs"] for l in other.values() for seg in l["segments"]) / 3600, 1), "jobs": sum(len(l["segments"]) for l in other.values())},
    }
    return {"generated_by": "experiments/gen/tacguide.py", "gpu": GPU, "factors": FACTORS, "rows": rows, "cost": cost}, state_of


# ---------- the figures ----------

def episodes(sections):
    """Every closed-loop episode: [{name, policy or None, scene, success}]"""
    out = []
    for name, lines in sections.items():
        if not name.startswith("result "):
            continue
        folder = name.split("/")[-2]
        try:
            r = json.loads("\n".join(lines))
        except ValueError:
            continue
        policy = next((p for prefix, p in EPISODE_GROUPS.items() if folder.startswith(prefix)), None)
        if policy and r.get("start_check", {}).get("bad_start") is not False:
            sys.exit(f"{folder}: the episode has no passed start check; it does not belong in a figure")
        out.append({"name": folder, "policy": policy, "scene": "new" if r["seed"] >= EVAL_SEED else "train", "success": r["result"] == "success"})
    return out


def misses(sections):
    """{episode folder: horizontal distance in mm between the gripper and the chip centre at the first descent}"""
    out = {}
    for line in sections.get("miss", []):
        m = re.match(r"(\S+)\s*\|.*\|\s*([+-][\d.]+) ([+-][\d.]+), z", line)
        if m:
            out[m.group(1)] = (float(m.group(2)) ** 2 + float(m.group(3)) ** 2) ** 0.5
    return out


def placeholder(status, title, caption, categories, series, ymax=5):
    return {
        "kind": "bar",
        "status": status,
        "title": title,
        "caption": caption,
        "x": {"categories": categories},
        "y": {"label": {"en": "Successful episodes", "zh": "成功的 episode 数"}, "min": 0, "max": ymax},
        "series": [dict(s, points=[]) for s in series],
    }


def build_figs(sections, logs, state_of):
    eps = episodes(sections)
    miss = misses(sections)
    main = [e for e in eps if e["policy"]]
    left_out = [e for e in eps if not e["policy"]]
    figs = {}

    # --- closed-loop success at 10k steps
    count = {(p, s): [e["success"] for e in main if e["policy"] == p and e["scene"] == s] for p, _ in POLICIES for s, _, _ in SCENES}
    series = []
    for s, name, color in SCENES:
        points = [[i, sum(count[(p, s)])] for i, (p, _) in enumerate(POLICIES) if count[(p, s)]]
        series.append({"name": name, "color": color, "points": points})
    ran_en = "; ".join(f"{label['en'].lower()}: {len(count[(p, 'new')])} new and {len(count[(p, 'train')])} training" for p, label in POLICIES)
    ran_zh = "；".join(f"{label['zh']}：{len(count[(p, 'new')])} 个新场景、{len(count[(p, 'train')])} 个训练场景" for p, label in POLICIES)
    more_en = f"Episodes run per policy: {ran_en}. A training scene is one whose demonstration is in the training set."
    more_zh = f"每个策略运行的 episode 数：{ran_zh}。训练场景指其演示在训练集中的场景。"
    if left_out:
        fails = sum(not e["success"] for e in left_out)
        more_en += f" {len(left_out)} more episodes were run for diagnosis under other execution settings and are left out; {fails} of them fail."
        more_zh += f"另有 {len(left_out)} 个 episode 是在其他执行设置下为诊断而运行的，未计入；其中 {fails} 个失败。"
    figs["success"] = {
        "kind": "bar",
        "status": "",
        "title": {"en": "Successful Grasp Chip episodes after 10k training steps", "zh": "训练 1 万步后成功的 Grasp Chip episode 数"},
        "caption": {
            "en": f"Number of closed-loop episodes each policy completes, out of {len(main)} in total, on new scenes and on scenes from the training demonstrations.",
            "zh": f"每个策略在闭环评测中完成的 episode 数，共 {len(main)} 个，分为新场景和训练演示中出现过的场景。",
        },
        "more": {"en": more_en, "zh": more_zh},
        "x": {"categories": [label for _, label in POLICIES]},
        "y": {"label": {"en": "Successful episodes", "zh": "成功的 episode 数"}, "min": 0, "max": max(4, max(len(v) for v in count.values()))},
        "series": series,
    }

    # --- where the first descent lands
    series = []
    for s, name, color in SCENES:
        points = []
        for i, (p, _) in enumerate(POLICIES):
            d = [miss[e["name"]] for e in main if e["policy"] == p and e["scene"] == s and e["name"] in miss]
            if d:
                points.append([i, round(sum(d) / len(d), 1)])
        series.append({"name": name, "color": color, "points": points})
    hit = [miss[e["name"]] for e in main if e["success"] and e["name"] in miss]
    more = {
        "en": "Measured from the recorded joint angles with the arm's forward kinematics, at the first policy query where the gripper stops descending. The scripted expert that produced the demonstrations descends on the chip centre."
        + (f" The one successful episode lands {hit[0]:.1f} mm from the centre." if len(hit) == 1 else ""),
        "zh": "由记录的关节角经机械臂正运动学算出，取夹爪第一次停止下降时的那次策略查询。生成演示的脚本专家正对芯片中心下降。"
        + (f"唯一成功的那个 episode 落点距中心 {hit[0]:.1f} mm。" if len(hit) == 1 else ""),
    }
    figs["miss"] = {
        "kind": "bar",
        "status": "",
        "title": {"en": "Where the first descent lands", "zh": "第一次下降的落点"},
        "caption": {
            "en": "Mean horizontal distance between the gripper and the chip centre when the gripper first reaches grasp height, over the episodes of each policy.",
            "zh": "夹爪第一次到达抓取高度时与芯片中心的水平距离，对每个策略的 episode 取平均。",
        },
        "more": more,
        "x": {"categories": [label for _, label in POLICIES]},
        "y": {"label": {"en": "Distance from the chip centre (mm)", "zh": "到芯片中心的距离（mm）"}, "min": 0},
        "series": series,
    }

    # --- training loss
    def curve(key):
        run = next(r for r in RUNS if r["key"] == key)
        loss = {}
        for path in sorted(logs_of(run, logs), key=lambda p: logs[p]["born"]):
            loss.update(logs[path]["loss"])
        steps = sorted(loss)
        points = []
        for i in range(99, len(steps), 100):  # mean of 100 consecutive logged steps
            window = [loss[s] for s in steps[i - 99 : i + 1]]
            points.append([steps[i], float(f"{sum(window) / 100:.3g}")])
        return points

    loss_y = {"label": {"en": "Loss", "zh": "损失"}, "scale": "log"}
    loss_x = {"label": {"en": "Training step", "zh": "训练步数"}}
    vision = curve("gc_B20")  # the whole vision-only run, both rows
    figs["loss"] = {
        "kind": "line",
        "status": "",
        "title": {"en": "Training loss on Grasp Chip", "zh": "Grasp Chip 上的训练损失"},
        "caption": {
            "en": "Flow-matching loss of the two policies trained on demonstrations over their 10k steps, as a mean over 100 steps.",
            "zh": "两个用演示训练的策略在 1 万步内的 flow-matching 损失，每 100 步取平均。",
        },
        "more": {
            "en": "The distilled student regresses the output of the policy with touch, a different loss, so it is not drawn here.",
            "zh": "蒸馏学生回归的是带触觉策略的输出，损失不同，因此没有画在这里。",
        },
        "x": loss_x,
        "y": loss_y,
        "series": [
            {"name": {"en": "With touch", "zh": "带触觉"}, "color": "s1", "points": curve("gc_A")},
            {"name": {"en": "Vision only", "zh": "纯视觉"}, "color": "ref", "points": [p for p in vision if p[0] <= 10000]},
        ],
    }
    figs["loss-20k"] = {
        "kind": "line",
        "status": state_of["gc_B20"],
        "title": {"en": "Training loss of the vision-only policy up to 20k steps", "zh": "纯视觉策略到 2 万步的训练损失"},
        "caption": {
            "en": "Flow-matching loss of the vision-only policy from the start of training through its continuation, as a mean over 100 steps.",
            "zh": "纯视觉策略从训练开始到继续训练阶段的 flow-matching 损失，每 100 步取平均。",
        },
        "x": dict(loss_x, min=0, max=20000),
        "y": loss_y,
        "series": [{"name": {"en": "Vision only", "zh": "纯视觉"}, "color": "ref", "points": vision}],
    }

    # --- figures whose runs have not finished
    scene_series = [{"name": name, "color": color} for _, name, color in SCENES]
    figs["success-20k"] = placeholder(
        state_of["gc_B20"] or "Planned",
        {"en": "Successful Grasp Chip episodes after 10k and 20k training steps", "zh": "训练 1 万步与 2 万步后成功的 Grasp Chip episode 数"},
        {
            "en": "Will show whether the vision-only policy completes more episodes after 20k training steps than after 10k.",
            "zh": "将显示纯视觉策略训练 2 万步后完成的 episode 是否多于 1 万步时。",
        },
        [{"en": "10k steps", "zh": "1 万步"}, {"en": "20k steps", "zh": "2 万步"}],
        scene_series,
    )
    gear = [state_of["ga_A"], state_of["ga_B"]]
    figs["success-gear"] = placeholder(
        next((s for s in gear if s), "Planned"),
        {"en": "Successful Gear Assembly episodes of the two policies", "zh": "两个策略成功的 Gear Assembly episode 数"},
        {
            "en": "Will show how many episodes of Gear Assembly the policy with touch and the vision-only policy complete after 20k training steps.",
            "zh": "将显示带触觉策略和纯视觉策略训练 2 万步后完成的 Gear Assembly episode 数。",
        },
        [{"en": "With touch", "zh": "带触觉"}, {"en": "Vision only", "zh": "纯视觉"}],
        scene_series,
    )
    figs["success-guidance"] = placeholder(
        "Planned",
        {"en": "Successful Grasp Chip episodes under tactile guidance", "zh": "触觉引导下成功的 Grasp Chip episode 数"},
        {
            "en": "Will show the number of completed episodes against the guidance weight w, for guidance applied at test time and for vision-only students trained on the guided target.",
            "zh": "将显示完成的 episode 数随引导权重 w 的变化，分别对应测试时引导和用引导目标训练的纯视觉学生。",
        },
        ["w = 1", "w = 1.5", "w = 2", "w = 3"],
        [
            {"name": {"en": "Guidance at test time", "zh": "测试时引导"}, "color": "s1"},
            {"name": {"en": "Trained student", "zh": "训练出的学生"}, "color": "s2"},
        ],
    )
    return figs


# ---------- main ----------

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--local", action="store_true", help="run on the training machine itself instead of over SSH")
    ap.add_argument("--out", help="folder for the two JSON files (default: experiments/data next to this script)")
    ap.add_argument("--print", action="store_true", dest="dry", help="print a summary and write nothing")
    args = ap.parse_args()

    sections = fetch(args.local)
    logs = parse_logs(sections)
    record, state_of = build_record(sections, logs)
    figs = build_figs(sections, logs, state_of)

    if not args.dry:
        out = args.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
        for name, data in (("record", record), ("figs", figs)):
            path = os.path.join(out, f"{SLUG}.{name}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print("wrote", os.path.relpath(path))
    for run, row in zip(RUNS, record["rows"]):
        print(f"  {run['key']:<7} {row.get('state') or 'finished':<9} {row.get('hours', '')}")
    for key, fig in figs.items():
        print(f"  figure {key:<17} {fig['status'] or 'filled'}  {[s['points'][:4] for s in fig['series']] if fig['kind'] == 'bar' else [len(s['points']) for s in fig['series']]}")
    c = record["cost"]
    print(f"  main {c['main']['gpu_hours']} GPU-hours in {c['main']['jobs']} starts; other {c['other']['gpu_hours']} in {c['other']['jobs']} starts")


if __name__ == "__main__":
    main()
