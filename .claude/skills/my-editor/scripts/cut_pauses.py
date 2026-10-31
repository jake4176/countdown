#!/usr/bin/env python3
"""말 사이 쉼만 잘라 낸다. 목소리 속도는 건드리지 않는다.

사용법: python3 cut_pauses.py 입력(mp4/wav) 출력 [--max 0.18] [--keep 0.12] [--db -35]
"""
import argparse, re, subprocess, sys

def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())

def has_video(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                          "stream=index", "-of", "csv=p=0", path], capture_output=True, text=True)
    return bool(out.stdout.strip())

def silences(path, db, min_len):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af",
                          f"silencedetect=noise={db}dB:d={min_len}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    return list(zip(starts, ends))

def main():
    p = argparse.ArgumentParser()
    p.add_argument("src"); p.add_argument("dst")
    p.add_argument("--max", type=float, default=0.18, help="이보다 긴 쉼만 자른다(초)")
    p.add_argument("--keep", type=float, default=0.12, help="잘린 쉼에 남길 길이(초)")
    p.add_argument("--db", type=float, default=-35, help="무음으로 볼 소리 크기(dB)")
    a = p.parse_args()

    total = duration(a.src)
    keep_segs, cur = [], 0.0
    for s, e in silences(a.src, a.db, a.max):
        half = a.keep / 2
        cut_from, cut_to = s + half, e - half
        if cut_to - cut_from <= 0.01:
            continue
        keep_segs.append((cur, cut_from)); cur = cut_to
    keep_segs.append((cur, total))
    keep_segs = [(s, e) for s, e in keep_segs if e - s > 0.01]

    video = has_video(a.src)
    parts, labels = [], ""
    for i, (s, e) in enumerate(keep_segs):
        if video:
            parts.append(f"[0:v]trim={s:.3f}:{e:.3f},setpts=PTS-STARTPTS[v{i}]")
            labels += f"[v{i}]"
        parts.append(f"[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS[a{i}]")
        labels += f"[a{i}]"
    n = len(keep_segs)
    parts.append(f"{labels}concat=n={n}:v={1 if video else 0}:a=1" + ("[v][a]" if video else "[a]"))
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.src,
           "-filter_complex", ";".join(parts)]
    cmd += (["-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-c:a", "aac"]
            if video else ["-map", "[a]"])
    subprocess.run(cmd + [a.dst], check=True)

    after = duration(a.dst)
    print(f"{total:.2f}초 → {after:.2f}초 (쉼 {len(keep_segs) - 1}곳 줄임, {total - after:.2f}초 절약)")

if __name__ == "__main__":
    sys.exit(main())
