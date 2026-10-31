#!/usr/bin/env python3
"""두 번 재서 소리 크기를 정확히 맞춘다(한 번만 돌리면 1~2 LU씩 빗나감). 영상은 재인코딩하지 않는다.

사용법: python3 normalize.py render.mp4 final.mp4 [--lufs -14]
"""
import argparse, json, subprocess

p = argparse.ArgumentParser()
p.add_argument("src"); p.add_argument("dst"); p.add_argument("--lufs", type=float, default=-14)
a = p.parse_args()
target = f"I={a.lufs}:TP=-1.5:LRA=11"
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.src, "-af",
                      f"loudnorm={target}:print_format=json", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
m = json.loads(log[log.rfind("{"):])
af = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
      f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
      f":offset={m['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", a.src, "-af", af, "-ar", "48000",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", a.dst], check=True)
print(f"{float(m['input_i']):.1f} LUFS → {a.lufs:.0f} LUFS 목표로 맞춤: {a.dst}")
