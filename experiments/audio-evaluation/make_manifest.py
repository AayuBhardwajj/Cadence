#!/usr/bin/env python3
"""
make_manifest.py — Seeded stratified manifest generator.

Walks LibriSpeech/test-clean (relative to this script's directory),
groups utterances by speaker_id, picks exactly 3 per speaker using
random.Random(42) (sort-then-sample for reproducibility), and writes
results/manifest_stratified_s42_n3.csv.

Columns: utterance_id, speaker_id, chapter_id, audio_path, reference_transcript

audio_path is relative to experiments/audio-evaluation/ (same convention
as the existing results/test_manifest.csv).

Does NOT touch results/test_manifest.csv.
"""

import csv
import random
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
LIBRISPEECH_ROOT = SCRIPT_DIR / "LibriSpeech" / "test-clean"
OUTPUT_CSV = SCRIPT_DIR / "results" / "manifest_stratified_s42_n3.csv"
N_PER_SPEAKER = 3
SEED = 42


def main():
    if not LIBRISPEECH_ROOT.is_dir():
        raise SystemExit(
            f"LibriSpeech root not found: {LIBRISPEECH_ROOT}\n"
            "Download LibriSpeech test-clean and extract under experiments/audio-evaluation/."
        )

    # Collect all utterances grouped by speaker
    speakers: dict[str, list[dict]] = {}
    for trans_file in sorted(LIBRISPEECH_ROOT.rglob("*.trans.txt")):
        for line in trans_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(maxsplit=1)
            if len(parts) != 2:
                continue
            utterance_id, reference = parts
            # utterance_id format: <speaker_id>-<chapter_id>-<utterance_idx>
            id_parts = utterance_id.split("-")
            if len(id_parts) < 3:
                continue
            speaker_id = id_parts[0]
            chapter_id = id_parts[1]
            audio_file = trans_file.parent / f"{utterance_id}.flac"
            if not audio_file.is_file():
                continue
            # audio_path relative to SCRIPT_DIR (i.e. experiments/audio-evaluation/)
            audio_path = audio_file.relative_to(SCRIPT_DIR)
            entry = {
                "utterance_id": utterance_id,
                "speaker_id": speaker_id,
                "chapter_id": chapter_id,
                "audio_path": str(audio_path),
                "reference_transcript": reference,
            }
            speakers.setdefault(speaker_id, []).append(entry)

    if not speakers:
        raise SystemExit("No utterances found. Check LibriSpeech path.")

    # Sort each speaker's utterances by utterance_id for stability, then sample N_PER_SPEAKER
    rng = random.Random(SEED)
    rows = []
    for speaker_id in sorted(speakers.keys()):
        utterances = sorted(speakers[speaker_id], key=lambda x: x["utterance_id"])
        n = min(N_PER_SPEAKER, len(utterances))
        sampled = rng.sample(utterances, n)
        # Sort the sample by utterance_id for deterministic output order
        sampled.sort(key=lambda x: x["utterance_id"])
        rows.extend(sampled)

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["utterance_id", "speaker_id", "chapter_id", "audio_path", "reference_transcript"]
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    speaker_count = len(speakers)
    print(f"Speakers found in LibriSpeech/test-clean: {speaker_count}")
    print(f"Rows written to {OUTPUT_CSV.relative_to(SCRIPT_DIR)}: {len(rows)}")
    print("First 3 rows:")
    for row in rows[:3]:
        print(f"  {row['utterance_id']}  speaker={row['speaker_id']}  chapter={row['chapter_id']}")


if __name__ == "__main__":
    main()
