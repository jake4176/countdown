#!/usr/bin/env python3
"""렌더본을 사람이 보기 전에 검사한다. 하나라도 실패하면 종료 코드 1.

사용법: python3 check_render.py final.mp4 [--ref cut.mp4] [--lufs -14]
  1) 싱크: --ref 음성과 렌더본 음성의 시차(교차상관)
  2) 개인 정보: 0.5초마다 프레임 OCR(tesseract 필요) → 이메일·전화·API 키·UUID·주문번호
  3) 소리 크기: 통합 LUFS
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

PII = {
    "이메일": r"[\w.+-]+@[\w-]+\.[\w.]+",
    "전화번호": r"01[016789][-. ]?\d{3,4}[-. ]?\d{4}",
    "UUID": r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    "API 키": r"\b(sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{30,})",
    "주문번호": r"\b20\d{14,}\b",
}

def loudness(path):
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af",
                          "loudnorm=I=-14:print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float(json.loads(log[log.rfind("{"):])["input_i"])

def pcm(path, sr=8000, seconds=30):
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-t", str(seconds), "-ac", "1",
                          "-ar", str(sr), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32)

def offset_ms(ref, test, sr=8000):
    import numpy as np
    a, b = pcm(ref, sr), pcm(test, sr)
    n = min(len(a), len(b))
    a, b = a[:n] - a[:n].mean(), b[:n] - b[:n].mean()
    size = 1 << (2 * n - 1).bit_length()
    corr = np.fft.irfft(np.fft.rfft(b, size) * np.conj(np.fft.rfft(a, size)), size)
    lag = int(np.argmax(corr))
    if lag > size // 2:
        lag -= size
    return lag * 1000 / sr

def ocr_pii(path):
    if not shutil.which("tesseract"):
        return None
    hits = []
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", "fps=2",
                        os.path.join(d, "f%05d.png")], check=True)
        for name in sorted(os.listdir(d)):
            t = (int(name[1:6]) - 1) * 0.5
            text = subprocess.run(["tesseract", os.path.join(d, name), "-", "-l", "kor+eng"],
                                  capture_output=True, text=True).stdout
            for kind, pat in PII.items():
                for m in re.findall(pat, text):
                    hits.append((t, kind, m if isinstance(m, str) else m[0]))
    return hits

def main():
    p = argparse.ArgumentParser()
    p.add_argument("video"); p.add_argument("--ref"); p.add_argument("--lufs", type=float, default=-14)
    a = p.parse_args()
    ok = True

    if a.ref:
        ms = offset_ms(a.ref, a.video)
        good = abs(ms) <= 20
        ok &= good
        print(f"[{'통과' if good else '실패'}] 싱크 시차 {ms:+.0f}ms (기준 ±20ms)")
    else:
        print("[건너뜀] 싱크: --ref 원본이 없음")

    hits = ocr_pii(a.video)
    if hits is None:
        ok = False
        print("[실패] 개인 정보: tesseract가 없어 검사 못 함 (설치 후 다시)")
    elif hits:
        ok = False
        print(f"[실패] 개인 정보 {len(hits)}건")
        for t, kind, m in hits[:20]:
            print(f"   {t:6.1f}초 {kind}: {m}")
    else:
        print("[통과] 개인 정보 0건")

    lufs = loudness(a.video)
    good = abs(lufs - a.lufs) <= 1
    ok &= good
    print(f"[{'통과' if good else '실패'}] 소리 크기 {lufs:.1f} LUFS (기준 {a.lufs:.0f}±1)")

    print("결과:", "전부 통과" if ok else "고치고 다시 렌더")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
