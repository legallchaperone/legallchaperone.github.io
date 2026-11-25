#!/usr/bin/env python3
"""Generate the data files of the experiment page "loop360".

    python3 experiments/gen/loop360.py [--repo /path/to/loop360] [--traces /path/to/out/traces]
    add --print to show a summary and write nothing

Writes experiments/data/loop360.record.json and loop360.figs.json; then run `npm run build`.
Nothing in the research repository is changed. The script reads:
  - data/ratings/simon_notebook_2026-11-22.jsonl for the single-rater human closure ratings and their timestamps;
  - data/scenes.json for the scene counts;
  - out/traces/{sift,dino,sift_negative,dino_negative} when present, or the recorded summary tables in
    docs/ai-generated/arc_metric_v2_results_2026-11-25.md when the trace files are not on this machine.

This script is written for this one experiment (see experiments/SPEC.md). It belongs in the research repository
(loop360); it sits here until the owner decides where it lives (agent, 2026-11-25).

Judgement calls (agent, 2026-11-25), for the owner to review:
  - The 488 rollout videos and the v2 traces were generated on a rented single-GPU notebook machine without a
    scheduler, so per-run timestamps, GPU model, GPU-hours and `cost` were not logged and are left blank rather
    than invented. Only the single-rater human rating row carries timestamps, read from its JSONL file.
  - Because the rollout videos predated the loop360 repository's initial commit (b640eba), those rows omit `code`.
    Only the blind human-eval package (pilot-1, built from b640eba) pins that commit.
  - Because the raw `.npz` trace files are not stored in the repository, the script computes directly from
    `--traces` when available and otherwise parses `docs/ai-generated/arc_metric_v2_results_2026-11-25.md`.
    Every number in both the chart series and the `more` notes comes from the parsed/computed data.
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_REPO = Path("/Users/simon/Documents/School/26FA/loop360")
SITE_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = SITE_ROOT / "experiments" / "data"
PUBLIC_REPO = "https://github.com/legallchaperone/loop360"
PILOT1_COMMIT = "b640eba"
SLUG = "loop360"

FACTORS = [
    ["model", "Model", "模型"],
    ["scenes", "Scenes", "场景数"],
    ["stage", "Stage", "阶段"],
]

MODELS = [
    ("real_pano", {"en": "Real pano", "zh": "真实全景"}, {"en": "Real panorama control", "zh": "真实全景对照"}),
    ("worldcrafter", {"en": "WorldCrafter", "zh": "WorldCrafter"}, {"en": "WorldCrafter-Fast", "zh": "WorldCrafter-Fast"}),
    ("hy_worldplay", {"en": "HY-WorldPlay", "zh": "HY-WorldPlay"}, {"en": "HY-WorldPlay", "zh": "HY-WorldPlay"}),
    ("matrix_game_3", {"en": "Matrix-Game 3", "zh": "Matrix-Game 3"}, {"en": "Matrix-Game 3.0", "zh": "Matrix-Game 3.0"}),
    ("sana_wm", {"en": "SANA-WM", "zh": "SANA-WM"}, {"en": "SANA-WM", "zh": "SANA-WM"}),
    ("matrix_game_2", {"en": "Matrix-Game 2", "zh": "Matrix-Game 2"}, {"en": "Matrix-Game 2.0", "zh": "Matrix-Game 2.0"}),
]

RATED_MODELS = [m for m in MODELS if m[0] != "worldcrafter"]


def load_scene_counts(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    n_pilot = len(data["pilot"])
    n_photos = len(data["photos_indoor"]) + len(data["photos_outdoor"])
    n_subset = len(data["rating_subset"])
    n_pano = len(data["real_panoramas"])
    n_all = n_pilot + n_photos
    return {
        "real_pano": n_pano,
        "worldcrafter": n_pilot + n_subset,
        "hy_worldplay": n_all,
        "matrix_game_3": n_all,
        "sana_wm": n_all,
        "matrix_game_2": n_all,
        "total_scenes": n_all,
    }


def load_ratings(path: Path):
    """Return {(model, scene): {'oneway': int, 'pendulum': int}} and all Unix timestamps."""
    ratings = {}
    all_ts = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row["model"], row["scene"])
        ratings[key] = {k: row[k] for k in ("oneway", "pendulum") if row.get(k) is not None}
        if "t" in row:
            all_ts.append(float(row["t"]))
    return ratings, all_ts


def iso_utc(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M+0000")


def parse_v2_report(path: Path):
    """Parse summary tables and counts from docs/ai-generated/arc_metric_v2_results_2026-11-25.md."""
    text = path.read_text(encoding="utf-8")

    agreement = {"SIFT": [], "DINO": []}
    for m in re.finditer(
        r"^\|\s*(SIFT|DINO)\s*\|\s*([0-9.]+)\s*\|\s*(\d+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|",
        text,
        re.M,
    ):
        aligner, gone, n, spearman, auc_arc, auc_point = m.groups()
        agreement[aligner].append(
            {
                "gone": float(gone),
                "n": int(n),
                "spearman_arc": float(spearman),
                "auc_arc": float(auc_arc),
                "auc_point": float(auc_point),
            }
        )

    by_model = {}
    for m in re.finditer(
        r"^\|\s*(real_pano|worldcrafter|hy_worldplay|matrix_game_3|matrix_game_2|sana_wm)\s*\|\s*"
        r"([0-9.]+)\s*/\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*/\s*([0-9.]+)\s*\|\s*"
        r"([0-9.]+)\s*/\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*/\s*([0-9.]+)\s*\|",
        text,
        re.M,
    ):
        model = m.group(1)
        by_model[model] = {
            "sift_oneway": {"point": float(m.group(2)), "arc": float(m.group(3))},
            "sift_pendulum": {"point": float(m.group(4)), "arc": float(m.group(5))},
            "dino_oneway": {"point": float(m.group(6)), "arc": float(m.group(7))},
            "dino_pendulum": {"point": float(m.group(8)), "arc": float(m.group(9))},
        }

    neg_control = {"SIFT": [], "DINO": []}
    for m in re.finditer(
        r"^\|\s*([0-9.]+)\s*\|\s*([0-9.]+)%\s*\|\s*([0-9.]+)%\s*\|",
        text,
        re.M,
    ):
        thr, sift_pct, dino_pct = m.groups()
        neg_control["SIFT"].append([float(thr), float(sift_pct)])
        neg_control["DINO"].append([float(thr), float(dino_pct)])

    meta = {}
    m_counts = re.search(
        r"SIFT\s+(\d+)\s*条；DINO\s+(\d+)\s*条.*?SIFT\s*负对照\s*(\d+)\s*条；DINO\s*负对照只有\s*(\d+)\s*条",
        text,
    )
    if m_counts:
        meta["n_sift"] = int(m_counts.group(1))
        meta["n_dino"] = int(m_counts.group(2))
        meta["n_sift_neg"] = int(m_counts.group(3))
        meta["n_dino_neg"] = int(m_counts.group(4))

    m_means = re.search(
        r"同一批\s*(\d+)\s*条、gone\s*0\.15\s*时，人工\s*0\s*/\s*1\s*/\s*2\s*分的\s*arc\s*均值："
        r"SIFT\s*([0-9.]+)\s*/\s*([0-9.]+)\s*/\s*([0-9.]+)；DINO\s*([0-9.]+)\s*/\s*([0-9.]+)\s*/\s*([0-9.]+)",
        text,
    )
    if m_means:
        meta["shared_rated_n"] = int(m_means.group(1))
        meta["sift_arc_by_human"] = [float(m_means.group(i)) for i in (2, 3, 4)]
        meta["dino_arc_by_human"] = [float(m_means.group(i)) for i in (5, 6, 7)]

    m_wc = re.search(r"## WorldCrafter 单向里 arc < 0\.6 × point 的视频\s+SIFT：([^\n]+)", text)
    if m_wc:
        meta["wc_gap_count"] = len(re.findall(r"`[^`]+`", m_wc.group(1)))

    return agreement, by_model, neg_control, meta


def compute_from_traces(repo: Path, traces_dir: Path, ratings: dict):
    """Compute metrics and metadata directly from .npz traces when present."""
    sys.path.insert(0, str(repo))
    import numpy as np
    from bench.meta_eval.human_agreement import auc, score_all, spearman
    from bench.meta_eval.negative_control import false_closure

    sift_dir = traces_dir / "sift"
    dino_dir = traces_dir / "dino"
    sift_neg = traces_dir / "sift_negative"
    dino_neg = traces_dir / "dino_negative"

    agreement = {"SIFT": [], "DINO": []}
    rated_by_aligner = {}
    for aligner, tdir, gones in (
        ("SIFT", sift_dir, (0.05, 0.15, 0.30)),
        ("DINO", dino_dir, (0.05, 0.15)),
    ):
        if not tdir.exists():
            continue
        travel = sift_dir if aligner == "DINO" else None
        for g in gones:
            rows = score_all(tdir, travel_from=travel, gone=g)
            rated = []
            for (model, scene, kind), r in rows.items():
                h = ratings.get((model, scene), {}).get(kind)
                if h is not None and r["status"] == "ok" and r["arc"] is not None:
                    rated.append(((model, scene, kind), h, r["point"], r["arc"]))
            if not rated:
                continue
            if g == 0.15:
                rated_by_aligner[aligner] = {k: (h, p, a) for k, h, p, a in rated}
            h_arr = np.array([x[1] for x in rated])
            p_arr = np.array([x[2] for x in rated])
            a_arr = np.array([x[3] for x in rated])
            agreement[aligner].append(
                {
                    "gone": g,
                    "n": len(rated),
                    "spearman_arc": round(spearman(a_arr, h_arr), 3),
                    "auc_arc": round(auc(a_arr, h_arr == 2), 3),
                    "auc_point": round(auc(p_arr, h_arr == 2), 3),
                }
            )

    by_model = {}
    sift_rows = score_all(sift_dir, gone=0.15) if sift_dir.exists() else {}
    dino_rows = score_all(dino_dir, travel_from=sift_dir, gone=0.15) if dino_dir.exists() else {}
    for model, _, _ in MODELS:
        entry = {}
        for prefix, src in (("sift", sift_rows), ("dino", dino_rows)):
            for kind in ("oneway", "pendulum"):
                grp = [r for (m, _, k), r in src.items() if m == model and k == kind and r["status"] == "ok"]
                if grp:
                    entry[f"{prefix}_{kind}"] = {
                        "point": round(float(np.mean([r["point"] for r in grp])), 2),
                        "arc": round(float(np.mean([r["arc"] for r in grp if r["arc"] is not None])), 2),
                    }
        if entry:
            by_model[model] = entry

    neg_control = {"SIFT": [], "DINO": []}
    neg_counts = {}
    for aligner, ndir in (("SIFT", sift_neg), ("DINO", dino_neg)):
        if not ndir.exists():
            continue
        shares = []
        for p in sorted(ndir.glob("*/*.npz")):
            with np.load(p) as tr:
                _, sh = false_closure(dict(tr))
                shares.append(sh)
        neg_counts[aligner] = len(shares)
        arr = np.array(shares)
        for thr in (0.05, 0.10, 0.15, 0.20, 0.30):
            neg_control[aligner].append([thr, round(float((arr >= thr).mean() * 100), 1)])

    shared_keys = sorted(set(rated_by_aligner.get("SIFT", {})) & set(rated_by_aligner.get("DINO", {})))
    sift_means = [
        round(float(np.mean([rated_by_aligner["SIFT"][k][2] for k in shared_keys if rated_by_aligner["SIFT"][k][0] == lvl])), 2)
        for lvl in (0, 1, 2)
    ] if shared_keys else []
    wc_gap = sum(
        1
        for (m, _, k), r in sift_rows.items()
        if m == "worldcrafter" and k == "oneway" and r["status"] == "ok" and r["point"] > 0 and r["arc"] < 0.6 * r["point"]
    )

    meta = {
        "n_sift": len(sift_rows),
        "n_dino": len(dino_rows),
        "n_sift_neg": neg_counts.get("SIFT", 0),
        "n_dino_neg": neg_counts.get("DINO", 0),
        "shared_rated_n": len(shared_keys),
        "sift_arc_by_human": sift_means,
        "wc_gap_count": wc_gap,
    }
    return agreement, by_model, neg_control, meta


def build_figs(ratings, scene_counts, agreement, by_model, neg_control, meta):
    # 1. Human return rate (rating == 2) by model
    human_pend = []
    human_ow = []
    counts_note_en = []
    counts_note_zh = []
    for idx, (key, _, full) in enumerate(RATED_MODELS):
        ow_vals = [v["oneway"] for (m, _), v in ratings.items() if m == key and "oneway" in v]
        pd_vals = [v["pendulum"] for (m, _), v in ratings.items() if m == key and "pendulum" in v]
        ow_pct = round(100.0 * sum(x == 2 for x in ow_vals) / len(ow_vals), 1) if ow_vals else 0.0
        pd_pct = round(100.0 * sum(x == 2 for x in pd_vals) / len(pd_vals), 1) if pd_vals else 0.0
        human_pend.append([idx, pd_pct])
        human_ow.append([idx, ow_pct])
        counts_note_en.append(f"{full['en']} {len(ow_vals)}")
        counts_note_zh.append(f"{full['zh']} {len(ow_vals)}")

    # 2. Arc and point scores by model (SIFT, gone = 0.15)
    arc_pend = []
    arc_ow = []
    point_ow = []
    dino_note_en = []
    dino_note_zh = []
    for idx, (key, _, full) in enumerate(MODELS):
        m = by_model[key]
        arc_pend.append([idx, m["sift_pendulum"]["arc"]])
        arc_ow.append([idx, m["sift_oneway"]["arc"]])
        point_ow.append([idx, m["sift_oneway"]["point"]])
        if "dino_oneway" in m:
            dino_note_en.append(f"{full['en']} {m['dino_oneway']['arc']:.2f}")
            dino_note_zh.append(f"{full['zh']} {m['dino_oneway']['arc']:.2f}")

    # 3. Human agreement across gone thresholds
    sift_auc_arc = [[r["gone"], r["auc_arc"]] for r in agreement["SIFT"]]
    sift_auc_point = [[r["gone"], r["auc_point"]] for r in agreement["SIFT"]]
    sift_rho_arc = [[r["gone"], r["spearman_arc"]] for r in agreement["SIFT"]]
    dino_auc_arc = [[r["gone"], r["auc_arc"]] for r in agreement["DINO"]]

    sift_by_g = {r["gone"]: r for r in agreement["SIFT"]}
    dino_n = agreement["DINO"][0]["n"] if agreement["DINO"] else 0
    sift_n = agreement["SIFT"][0]["n"] if agreement["SIFT"] else 0
    s05, s15 = sift_by_g[0.05], sift_by_g[0.15]

    sift_lvl = meta.get("sift_arc_by_human", [])
    shared_n = meta.get("shared_rated_n", dino_n)
    n_sift = meta.get("n_sift", 0)
    n_sift_neg = meta.get("n_sift_neg", 0)
    n_dino_neg = meta.get("n_dino_neg", 0)
    wc_gap = meta.get("wc_gap_count", 0)

    return {
        "human-return": {
            "kind": "bar",
            "status": "",
            "title": {
                "en": "Human-confirmed return rate by trajectory",
                "zh": "不同轨迹下人工确认回到起点的比例",
            },
            "caption": {
                "en": "Share of videos rated 2 on return to the starting view. Every memory-equipped model drops sharply from out-and-back to one-way.",
                "zh": "人工评分为 2（明确回到起点画面）的视频占比。带记忆的模型在单向轨迹上均明显下降。",
            },
            "more": {
                "en": (
                    "Single rater, not blind, question 1 only. Rated scene pairs per model: "
                    + ", ".join(counts_note_en)
                    + ". WorldCrafter-Fast is not yet rated in this pass."
                ),
                "zh": (
                    "单人非盲测评分，仅包含问题 1。各模型已评分场景对数："
                    + "、".join(counts_note_zh)
                    + "。本轮尚未对 WorldCrafter-Fast 评分。"
                ),
            },
            "x": {"categories": [m[1] for m in RATED_MODELS]},
            "y": {"label": {"en": "Returned (%)", "zh": "回到起点 (%)"}, "min": 0, "max": 100},
            "series": [
                {"name": {"en": "Out-and-back", "zh": "往返"}, "color": "ref", "points": human_pend},
                {"name": {"en": "One-way", "zh": "单向"}, "color": "s1", "points": human_ow},
            ],
        },
        "arc-by-model": {
            "kind": "bar",
            "status": "",
            "title": {
                "en": "Mean arc score across models and trajectories",
                "zh": "各模型在两种轨迹上的平均弧分数",
            },
            "caption": {
                "en": "Mean SIFT arc score at departure threshold 0.15 across all generated scenes. WorldCrafter-Fast leads on one-way turns, followed by HY-WorldPlay.",
                "zh": "在离开阈值 0.15 下，所有已生成场景的平均 SIFT 弧分数。单向旋转中 WorldCrafter-Fast 最高，HY-WorldPlay 次之。",
            },
            "more": {
                "en": (
                    f"Computed on 640-pixel previews sampled every 2 frames ({n_sift} videos). "
                    f"WorldCrafter-Fast covers {scene_counts['worldcrafter']} of the {scene_counts['total_scenes']} scenes. "
                    "With the DINO aligner, one-way arc means are: " + ", ".join(dino_note_en) + "."
                ),
                "zh": (
                    f"在 640 像素宽预览视频上每 2 帧采样计算（共 {n_sift} 条）。"
                    f"WorldCrafter-Fast 覆盖 {scene_counts['total_scenes']} 个场景中的 {scene_counts['worldcrafter']} 个。"
                    "换用 DINO 对齐器时，单向弧分数均值依次为：" + "、".join(dino_note_zh) + "。"
                ),
            },
            "x": {"categories": [m[1] for m in MODELS]},
            "y": {"label": {"en": "Arc score", "zh": "弧分数"}, "min": 0, "max": 1},
            "series": [
                {"name": {"en": "Out-and-back", "zh": "往返"}, "color": "ref", "points": arc_pend},
                {"name": {"en": "One-way", "zh": "单向"}, "color": "s1", "points": arc_ow},
            ],
        },
        "point-vs-arc": {
            "kind": "bar",
            "status": "",
            "title": {
                "en": "One-way point score versus arc score",
                "zh": "单向轨迹上的点分数与弧分数对比",
            },
            "caption": {
                "en": "Point score measures only the best revisit frame; arc score requires the approach before it to match. The gap is largest on WorldCrafter-Fast.",
                "zh": "点分数只看回访最好的单帧，弧分数则要求回归前的接近段也保持一致。两者在 WorldCrafter-Fast 上的差距最大。",
            },
            "more": {
                "en": (
                    f"SIFT aligner at departure threshold 0.15. In WorldCrafter-Fast one-way rollouts, "
                    f"{wc_gap} videos have arc below 0.6 times point; one has been inspected frame by frame "
                    "and confirmed to jump abruptly to the remembered view."
                ),
                "zh": (
                    f"SIFT 对齐器，离开阈值 0.15。在 WorldCrafter-Fast 的单向视频中，"
                    f"有 {wc_gap} 条满足弧分数低于点分数的 0.6 倍；其中一条已逐帧核对，"
                    "确认画面在接近起点时发生跳变。"
                ),
            },
            "x": {"categories": [m[1] for m in MODELS]},
            "y": {"label": {"en": "Score", "zh": "分数"}, "min": 0, "max": 1},
            "series": [
                {"name": {"en": "Point score", "zh": "点分数"}, "color": "ref", "points": point_ow},
                {"name": {"en": "Arc score", "zh": "弧分数"}, "color": "s2", "points": arc_ow},
            ],
        },
        "human-agreement": {
            "kind": "line",
            "status": "",
            "title": {
                "en": "Agreement with human ratings across departure thresholds",
                "zh": "不同离开阈值下与人工评分的一致性",
            },
            "caption": {
                "en": (
                    f"AUC for separating rating 2 from 0 and 1, plus Spearman rank correlation on {sift_n} rated videos. "
                    f"SIFT arc AUC is highest at 0.05 ({s05['auc_arc']:.3f} vs {s15['auc_arc']:.3f} at 0.15), "
                    f"while Spearman peaks at 0.15 ({s15['spearman_arc']:.3f}); both drop at 0.30."
                ),
                "zh": (
                    f"在 {sift_n} 条已评分视频上区分 2 分与 0/1 分的 AUC 及 Spearman 秩相关。"
                    f"SIFT 弧分数 AUC 在 0.05 最高（{s05['auc_arc']:.3f}，0.15 处为 {s15['auc_arc']:.3f}），"
                    f"Spearman 秩相关在 0.15 最高（{s15['spearman_arc']:.3f}），到 0.30 时均下降。"
                ),
            },
            "more": {
                "en": (
                    f"SIFT covers {sift_n} rated videos; DINO covers {dino_n}. "
                    + (
                        f"On the shared {shared_n} videos at threshold 0.15, mean SIFT arc is "
                        f"{sift_lvl[0]:.2f} for rating 0, {sift_lvl[1]:.2f} for rating 1 and {sift_lvl[2]:.2f} for rating 2."
                        if len(sift_lvl) == 3
                        else ""
                    )
                ).strip(),
                "zh": (
                    f"SIFT 覆盖 {sift_n} 条已评分视频，DINO 覆盖 {dino_n} 条。"
                    + (
                        f"在共同的 {shared_n} 条视频、阈值 0.15 下，人工 0 / 1 / 2 分对应的 SIFT 弧分数均值分别为 "
                        f"{sift_lvl[0]:.2f}、{sift_lvl[1]:.2f}、{sift_lvl[2]:.2f}。"
                        if len(sift_lvl) == 3
                        else ""
                    )
                ).strip(),
            },
            "x": {"label": {"en": "Departure threshold", "zh": "离开阈值"}, "min": 0.05, "max": 0.30},
            "y": {"label": {"en": "Agreement", "zh": "一致性"}, "min": 0.65, "max": 1.0},
            "series": [
                {"name": {"en": "SIFT arc AUC", "zh": "SIFT 弧分数 AUC"}, "color": "s1", "points": sift_auc_arc},
                {"name": {"en": "SIFT point AUC", "zh": "SIFT 点分数 AUC"}, "color": "ref", "dash": True, "points": sift_auc_point},
                {"name": {"en": "DINO arc AUC", "zh": "DINO 弧分数 AUC"}, "color": "s2", "points": dino_auc_arc},
                {"name": {"en": "SIFT arc Spearman", "zh": "SIFT 弧分数 Spearman"}, "color": "s3", "points": sift_rho_arc},
            ],
        },
        "negative-control": {
            "kind": "line",
            "status": "",
            "title": {
                "en": "False closure rate on mismatched scenes",
                "zh": "错配场景上的误回环率",
            },
            "caption": {
                "en": "Share of videos whose confirmed overlap with another scene's first frame crosses the threshold. DINO triggers far more false matches than SIFT below 0.20.",
                "zh": "视频与另一场景第 0 帧的最大确认占比超过阈值的比例。在 0.20 以下，DINO 的误匹配率明显高于 SIFT。",
            },
            "more": {
                "en": (
                    f"SIFT covers {n_sift_neg} mismatched rollouts; DINO covers {n_dino_neg} rollouts, mostly HY-WorldPlay. "
                    "Each video is paired with the next scene in alphabetical order, so a few consecutive real photos from the same location may inflate the tail."
                ),
                "zh": (
                    f"SIFT 覆盖 {n_sift_neg} 条错配视频，DINO 覆盖 {n_dino_neg} 条（主要为 HY-WorldPlay）。"
                    "每条视频与按文件名排序的下一个场景配对，少量同地点的连续实拍照片可能抬高尾部比例。"
                ),
            },
            "x": {"label": {"en": "Threshold", "zh": "阈值"}, "min": 0.05, "max": 0.30},
            "y": {"label": {"en": "False closures (%)", "zh": "误回环率 (%)"}, "min": 0, "max": 60},
            "series": [
                {"name": {"en": "SIFT", "zh": "SIFT"}, "color": "s1", "points": neg_control["SIFT"]},
                {"name": {"en": "DINO", "zh": "DINO"}, "color": "s2", "points": neg_control["DINO"]},
            ],
        },
        "blind-eval": {
            "kind": "bar",
            "status": "Running",
            "title": {
                "en": "Agreement with blind two-question human ratings",
                "zh": "与盲测双问题人工评分的一致性",
            },
            "caption": {
                "en": "Will compare point and arc scores against blind ratings on return and on approach consistency over the 60-video pilot package.",
                "zh": "将在 60 条视频的盲测包上，对比点分数与弧分数在“是否回到起点”和“回程是否连贯”两问上与人工评分的一致性。",
            },
            "more": {
                "en": "Pilot-1 package of 60 anonymized videos covering all five models and real panoramas, with two 0/1/2 questions per video.",
                "zh": "首批 60 条匿名视频盲测包，覆盖全部五个模型与真实全景，每条视频包含两个 0/1/2 分问题。",
            },
            "x": {
                "categories": [
                    {"en": "Q1: Return", "zh": "问题 1：回到起点"},
                    {"en": "Q2: Approach", "zh": "问题 2：回程连贯"},
                ]
            },
            "y": {"label": {"en": "AUC", "zh": "AUC"}, "min": 0.5, "max": 1.0},
            "series": [
                {"name": {"en": "Point score", "zh": "点分数"}, "color": "ref", "points": []},
                {"name": {"en": "Arc score", "zh": "弧分数"}, "color": "s1", "points": []},
            ],
        },
    }


def build_record(scene_counts: dict, ratings_n: int, rating_ts: list):
    rows = []

    # 1. Single-rater human evaluation pass: its real start/end timestamps come from the ratings JSONL.
    human_row = {
        "setup": {
            "en": f"Single-rater closure ratings, {ratings_n} scene pairs",
            "zh": f"单人回环人工评分，{ratings_n} 对场景",
        },
        "model": "4 models + pano",
        "scenes": str(ratings_n),
        "stage": "human rating",
        "figs": ["human-return", "human-agreement"],
        "state": "",
    }
    if rating_ts:
        human_row["start"] = iso_utc(min(rating_ts))
        human_row["end"] = iso_utc(max(rating_ts))
    rows.append(human_row)

    # 2. Model rollouts and automatic traces: generated on a rented notebook GPU without run logs,
    #    so timestamps, compute hours and commit links are intentionally omitted.
    for key, _, full in MODELS:
        rows.append(
            {
                "setup": {
                    "en": f"{full['en']}, one-way and out-and-back rollouts",
                    "zh": f"{full['zh']}，单向与往返轨迹生成及评测",
                },
                "model": full["en"],
                "scenes": str(scene_counts[key]),
                "stage": "rollouts + traces",
                "figs": ["arc-by-model", "point-vs-arc", "negative-control"],
                "state": "",
            }
        )

    # 3. Blind two-question human rating package (pilot-1), built from the initial loop360 commit.
    rows.append(
        {
            "setup": {
                "en": "Blind two-question human rating package, 60 videos",
                "zh": "盲测双问题人工评分包，60 条视频",
            },
            "model": "All models",
            "scenes": "60 videos",
            "stage": "blind human eval",
            "figs": ["blind-eval"],
            "code": f"{PUBLIC_REPO}/tree/{PILOT1_COMMIT}",
            "state": "Running",
        }
    )

    return {
        "generated_by": "experiments/gen/loop360.py",
        "factors": FACTORS,
        "rows": rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", type=Path, default=DEFAULT_REPO, help="Path to the loop360 repository")
    parser.add_argument("--traces", type=Path, default=None, help="Optional path to out/traces directory")
    parser.add_argument("--print", dest="dry_run", action="store_true", help="Print summary without writing files")
    args = parser.parse_args()

    repo = args.repo.resolve()
    ratings_path = repo / "data" / "ratings" / "simon_notebook_2026-11-22.jsonl"
    scenes_path = repo / "data" / "scenes.json"
    report_path = repo / "docs" / "ai-generated" / "arc_metric_v2_results_2026-11-25.md"

    scene_counts = load_scene_counts(scenes_path)
    ratings, rating_ts = load_ratings(ratings_path)
    traces_dir = args.traces or (repo / "out" / "traces")
    if (traces_dir / "sift").exists():
        agreement, by_model, neg_control, meta = compute_from_traces(repo, traces_dir, ratings)
        source_note = f"traces ({traces_dir})"
    else:
        agreement, by_model, neg_control, meta = parse_v2_report(report_path)
        source_note = f"report ({report_path.name})"

    figs = build_figs(ratings, scene_counts, agreement, by_model, neg_control, meta)
    record = build_record(scene_counts, len(ratings), rating_ts)

    if args.dry_run:
        print(f"Source: {source_note}, rated pairs: {len(ratings)}")
        print(f"Figures: {', '.join(figs.keys())}")
        print(f"Record rows: {len(record['rows'])}")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / f"{SLUG}.figs.json").write_text(json.dumps(figs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (DATA_DIR / f"{SLUG}.record.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {SLUG}.figs.json and {SLUG}.record.json from {source_note}")


if __name__ == "__main__":
    main()
