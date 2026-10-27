import csv
from pathlib import Path

root = Path("LibriSpeech/test-clean")
output = Path("results/test_manifest.csv")
output.parent.mkdir(parents=True, exist_ok=True)

rows = []

for transcript_file in sorted(root.rglob("*.trans.txt")):
    for line in transcript_file.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split(maxsplit=1)
        if len(parts) != 2:
            continue

        utterance_id, reference = parts
        audio = transcript_file.parent / f"{utterance_id}.flac"

        if audio.is_file():
            rows.append({
                "utterance_id": utterance_id,
                "audio_path": str(audio),
                "reference_transcript": reference,
            })

rows = rows[:30]

if not rows:
    raise SystemExit("No matching audio/transcript pairs found.")

with output.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print(f"Created {output} with {len(rows)} recordings.")
for row in rows[:3]:
    print(row["utterance_id"], "—", row["reference_transcript"])
