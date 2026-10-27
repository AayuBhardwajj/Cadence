
## 1. Setup

| Field | Value |
| --- | --- |
| Git HEAD | `cb8ea0624954314e6f1783e8b11d2056fa13a468-dirty` |
| Model | `base` |
| Device | `cpu` |
| Precision | `cpu → fp32 (Whisper forces fp32 when device=cpu, see whisper/transcribe.py:127-136)` |
| Torch threads | `4` |
| Whisper version | `20250625` |
| Transcribe call | `model.transcribe(audio, word_timestamps=True)` |
| Primary normalizer | `primary: whisper.normalizers.EnglishTextNormalizer` |
| Simple normalizer | `simple: lowercase + strip punctuation (re.sub([^\w\s], '', text.lower()).strip())` |
| Torch seed note | `torch not seeded; production-faithful. Non-determinism possible on temperature fallback.` |
| Platform | `macOS-27.0.1-arm64-arm-64bit` |
| Platform machine | `arm64 (Apple Silicon)` |
| RAM bytes | `8589934592` |
| Manifest (B/C) | `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/manifest_stratified_s42_n3.csv` |
| Manifest SHA-256 | `f1b058a7c1d7e0a77ca926773f608157343e03cde2457dba015f8650c674b3d5` |
| Manifest seed | `42 (passed via --manifest-seed; used in make_manifest.py --seed, not in run_eval.py)` |
| Warm-up utterance | `1089-134686-0003` (manifest row 1) |
| Run A run_id | `20261024T075436Z` |
| Run B run_id | `20261026T030131Z` |
| Run C run_id | `20261026T031331Z` |

Warm-up: one file transcribed before the main pass (excluded from all statistics). The first main-pass file runs immediately after the warm-up.

## 2. Results


### Run A — 20261024T075436Z

N = 30 files ok / 0 error / 0 empty-hypothesis

**WER**

| Metric | Corpus WER | 95% CI (bootstrap, file-level) | Mean per-file WER | S | D | I | N | Hits |
| -------------------- | ------------ | -------------------------------- | -------------------- | ------ | ------ | ------ | -------- | -------- |
| Primary (Whisper norm) | 0.0217 | [0.0081, 0.0390] | 0.0287 | 10 | 1 | 3 | 645 | 634 |
| Simple (lower+strip) | 0.0264 | — | 0.0344 | 13 | 2 | 2 | 644 | 629 |

**5 worst files (primary WER)**

| utterance_id | WER | reference | hypothesis |
| ---------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------- |
| 1089-134686-0001 | 0.3750 | stuff it into you his belly counseled him | stuffed into you his belly countled him |
| 1089-134686-0006 | 0.1250 | the dull light fell more faintly upon the page whe... | the dull light fell more faintly upon the page whe... |
| 1089-134686-0016 | 0.1000 | then you can ask him questions on the catechism de... | then you can ask him questions on the catechism de... |
| 1089-134686-0009 | 0.0741 | at most by an alms given to a beggar whose blessin... | at most by an arm is given to a beggar whose bless... |
| 1089-134686-0008 | 0.0667 | the chaos in which his ardor extinguished itself w... | the chaos in which his order extinguished itself w... |

**5 worst speakers (primary WER)**

| speaker_id | WER | N words |
| ------------ | -------- | -------- |
| 1089 | 0.0217 | 645 |

**Temperature fallback:** 0 file(s) triggered fallback (max_segment_temperature > 0).


### Run B — 20261026T030131Z

N = 120 files ok / 0 error / 0 empty-hypothesis

**WER**

| Metric | Corpus WER | 95% CI (bootstrap, file-level) | Mean per-file WER | S | D | I | N | Hits |
| -------------------- | ------------ | -------------------------------- | -------------------- | ------ | ------ | ------ | -------- | -------- |
| Primary (Whisper norm) | 0.0494 | [0.0382, 0.0615] | 0.0500 | 98 | 10 | 18 | 2553 | 2445 |
| Simple (lower+strip) | 0.0526 | — | 0.0559 | 109 | 14 | 10 | 2529 | 2406 |

**5 worst files (primary WER)**

| utterance_id | WER | reference | hypothesis |
| ---------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------- |
| 6930-76324-0027 | 0.3043 | forgetting all their weariness they seized their c... | for getting all their weariness they seize their c... |
| 1995-1826-0025 | 0.3000 | some time you will tell me please will not you | sometimes you tell me please will not you |
| 5142-33396-0037 | 0.2222 | hakon there shall be your constant companion frien... | hawk in there shall be your constant companion fri... |
| 7729-102255-0025 | 0.2000 | their assumed character changed with their changin... | they are assumed character changed with their chan... |
| 2094-142345-0028 | 0.1875 | no no no totty ud get her feet wet said missus poy... | no no no toddy had get her feet wet said missus po... |

**5 worst speakers (primary WER)**

| speaker_id | WER | N words |
| ------------ | -------- | -------- |
| 6930 | 0.1471 | 68 |
| 1995 | 0.1429 | 42 |
| 8463 | 0.1136 | 44 |
| 5142 | 0.1000 | 30 |
| 7176 | 0.0989 | 91 |

**Temperature fallback:** 0 file(s) triggered fallback (max_segment_temperature > 0).


### Run C — 20261026T031331Z

N = 120 files ok / 0 error / 0 empty-hypothesis

**WER**

| Metric | Corpus WER | 95% CI (bootstrap, file-level) | Mean per-file WER | S | D | I | N | Hits |
| -------------------- | ------------ | -------------------------------- | -------------------- | ------ | ------ | ------ | -------- | -------- |
| Primary (Whisper norm) | 0.0494 | [0.0382, 0.0615] | 0.0500 | 98 | 10 | 18 | 2553 | 2445 |
| Simple (lower+strip) | 0.0526 | — | 0.0559 | 109 | 14 | 10 | 2529 | 2406 |

**5 worst files (primary WER)**

| utterance_id | WER | reference | hypothesis |
| ---------------------- | -------- | ------------------------------------------------------- | ------------------------------------------------------- |
| 6930-76324-0027 | 0.3043 | forgetting all their weariness they seized their c... | for getting all their weariness they seize their c... |
| 1995-1826-0025 | 0.3000 | some time you will tell me please will not you | sometimes you tell me please will not you |
| 5142-33396-0037 | 0.2222 | hakon there shall be your constant companion frien... | hawk in there shall be your constant companion fri... |
| 7729-102255-0025 | 0.2000 | their assumed character changed with their changin... | they are assumed character changed with their chan... |
| 2094-142345-0028 | 0.1875 | no no no totty ud get her feet wet said missus poy... | no no no toddy had get her feet wet said missus po... |

**5 worst speakers (primary WER)**

| speaker_id | WER | N words |
| ------------ | -------- | -------- |
| 6930 | 0.1471 | 68 |
| 1995 | 0.1429 | 42 |
| 8463 | 0.1136 | 44 |
| 5142 | 0.1000 | 30 |
| 7176 | 0.0989 | 91 |

**Temperature fallback:** 0 file(s) triggered fallback (max_segment_temperature > 0).


## 3. Cross-Process Consistency (Run B vs Run C)

Files compared: 120
Identical (hyp_sha256 match): 120 / 120 (100.00%)
Differing: 0
Corpus WER B: 0.049354
Corpus WER C: 0.049354
Corpus WER absolute difference: 0.000000


## 4. Latency

CPU/fp32, warm-up excluded. First main-pass file runs after one warm-up.

**Run A** (N=30 files)

| Stat | latency_s (full) | decode_s (load_audio) | RTF |
| ---------- | ------------------ | ---------------------- | ---------- |
| mean | 1.2544 | 0.0665 | 0.2018 |
| median | 1.1608 | 0.0631 | 0.1628 |
| p90 | 1.5893 | — | — |
| p95 | 1.8045 | — | — |
| max | 1.8644 | 0.0952 | — |

Sum of inference latency (excludes audio decode and loop overhead): 37.6315 s
Note: no loop wall time is recorded in config.json; true elapsed includes loop overhead and is larger.

**Run B** (N=120 files)

| Stat | latency_s (full) | decode_s (load_audio) | RTF |
| ---------- | ------------------ | ---------------------- | ---------- |
| mean | 4.1760 | 0.2101 | 0.6925 |
| median | 2.4703 | 0.0979 | 0.3572 |
| p90 | 7.5224 | — | — |
| p95 | 11.3429 | — | — |
| max | 40.0832 | 3.1290 | — |

Sum of inference latency (excludes audio decode and loop overhead): 501.1230 s
Note: no loop wall time is recorded in config.json; true elapsed includes loop overhead and is larger.

**Run C** (N=120 files)

| Stat | latency_s (full) | decode_s (load_audio) | RTF |
| ---------- | ------------------ | ---------------------- | ---------- |
| mean | 2.1127 | 0.0908 | 0.3536 |
| median | 1.7290 | 0.0762 | 0.2709 |
| p90 | 3.2243 | — | — |
| p95 | 3.9613 | — | — |
| max | 14.7196 | 0.6859 | — |

Sum of inference latency (excludes audio decode and loop overhead): 253.5182 s
Note: no loop wall time is recorded in config.json; true elapsed includes loop overhead and is larger.


## 5. Within-Process Repeatability

**Run B** — requested K=10, actual K=10, R=5 reps

Selection rule (from config.json): 10 evenly-spaced positions in duration-sorted ok results + every file with max_segment_temperature > 0 (fallbacks: 0); cap = K+5 = 10+5. Fallback files are protected from truncation (placed first). Result: 10 quantile file(s) + 0 fallback file(s) = 10 total.

Subset files (utterance_id, duration, max_segment_temperature across all reps):

| utterance_id | duration_s | max_temp (all reps) | is_fallback |
| --- | --- | --- | --- |
| 3575-170457-0002 | 2.1100 | 0.0000 | no |
| 4446-2273-0012 | 2.9800 | 0.0000 | no |
| 3570-5694-0022 | 4.2950 | 0.0000 | no |
| 672-122797-0034 | 5.1100 | 0.0000 | no |
| 5639-40744-0017 | 5.8800 | 0.0000 | no |
| 2961-960-0022 | 7.4250 | 0.0000 | no |
| 4992-41806-0001 | 8.3100 | 0.0000 | no |
| 1221-135767-0018 | 11.1600 | 0.0000 | no |
| 2961-960-0006 | 15.7250 | 0.0000 | no |
| 3575-170457-0046 | 25.6400 | 0.0000 | no |

Files fully identical across all reps: 10/10 (100.00%)
All files produced identical outputs across all reps.

**Run C** — requested K=10, actual K=10, R=5 reps

Selection rule (from config.json): 10 evenly-spaced positions in duration-sorted ok results + every file with max_segment_temperature > 0 (fallbacks: 0); cap = K+5 = 10+5. Fallback files are protected from truncation (placed first). Result: 10 quantile file(s) + 0 fallback file(s) = 10 total.

Subset files (utterance_id, duration, max_segment_temperature across all reps):

| utterance_id | duration_s | max_temp (all reps) | is_fallback |
| --- | --- | --- | --- |
| 3575-170457-0002 | 2.1100 | 0.0000 | no |
| 4446-2273-0012 | 2.9800 | 0.0000 | no |
| 3570-5694-0022 | 4.2950 | 0.0000 | no |
| 672-122797-0034 | 5.1100 | 0.0000 | no |
| 5639-40744-0017 | 5.8800 | 0.0000 | no |
| 2961-960-0022 | 7.4250 | 0.0000 | no |
| 4992-41806-0001 | 8.3100 | 0.0000 | no |
| 1221-135767-0018 | 11.1600 | 0.0000 | no |
| 2961-960-0006 | 15.7250 | 0.0000 | no |
| 3575-170457-0046 | 25.6400 | 0.0000 | no |

Files fully identical across all reps: 10/10 (100.00%)
All files produced identical outputs across all reps.


## 6. Temperature Fallback Summary

Run A: 0 file(s) with max_segment_temperature > 0. None.
Run B: 0 file(s) with max_segment_temperature > 0. None.
Run C: 0 file(s) with max_segment_temperature > 0. None.


## 7. Normalization Sensitivity

Run A: primary=0.021705, simple=0.026398, delta=0.004692
Run B: primary=0.049354, simple=0.052590, delta=0.003236
Run C: primary=0.049354, simple=0.052590, delta=0.003236


### Why N differs between normalizers

21 of 120 files in Run B have different N between normalizers. Cause: `EnglishTextNormalizer` expands contractions into separate tokens (e.g. "don't" → "do not"), increasing N_primary relative to N_simple. It also expands possessive 's into "is" (e.g. "child's" → "child is", as in utterance `1221-135766-0005`), which affects reference and hypothesis alike. First three examples:

| utterance_id | N_primary | N_simple | ref_primary excerpt | ref_simple excerpt |
| --- | --- | --- | --- | --- |
| 121-127105-0022 | 17 | 16 | well if i do not know who she was in love with i k | well if i dont know who she was in love with i kno |
| 1221-135766-0005 | 46 | 45 | hester could only account for the child is charact | hester could only account for the childs character |
| 1995-1826-0025 | 10 | 8 | some time you will tell me please will not you | some time youll tell me please wont you |


## 8. What These Results Show

On 120 utterances from LibriSpeech test-clean (40 speakers x 3 files), the Whisper base model achieved a corpus WER of 0.0494 (95% CI [0.0382, 0.0615]) using the primary normalizer. 
Cross-process comparison found 120/120 files with identical output (sha256 match). 0 file(s) differed; corpus WER absolute difference = 0.000000.
Temperature fallback occurred in 0 file(s) in Run B.


## 9. What These Results Do NOT Show

- **No evidence about real-world or Cadence-user speech.** LibriSpeech test-clean is
  clean, studio-recorded read English. Results do not apply to Indian English, accents,
  mother-tongue influence (MTI), stuttering, spontaneous speech, background noise,
  phone/microphone quality, or any other acoustic condition not represented here.
- **ASR component only.** WER measures transcription accuracy, not scoring accuracy,
  pitch detection, or any other Cadence system component.
- **Repeatability here is not robustness.** These results show unseeded torch, fixed configuration;
  determinism here comes from greedy decoding at temperature 0 (no fallback triggered).
  They do not measure robustness to configuration changes, hardware variation, or concurrent load.
- **WER excludes semantic errors.** A transcription may be semantically incorrect while
  having low WER (e.g., wrong homophone).
- **Small sample.** 120 files / 3 per speaker is a small sample; speaker-level WER
  (3 files each) is shown for completeness but is low-N and should not be over-interpreted.
- **Corpus is single-chapter (Run A).** Run A uses 30 utterances from speaker 1089 only.


## 10. Deviations and Limitations

- **Warm-up file is a manifest row.** The warm-up utterance (`1089-134686-0003`, manifest row 1) is drawn from the evaluation manifest and excluded from all WER and latency statistics, but it occupies a manifest slot and is transcribed before timing begins.
- **Single machine, Apple Silicon (arm64), CPU/fp32, 4 torch threads.** Results are not representative of GPU or server deployment.
- **Temperature fallback never triggered.** All files decoded at temperature 0.0 in all runs. The non-determinism path was not exercised.


## 11. Reproduction Commands

```bash
# Run A
backend/venv/bin/python experiments/audio-evaluation/run_eval.py \
  --manifest experiments/audio-evaluation/results/test_manifest.csv
# Run B / Run C (identical command, run twice)
backend/venv/bin/python experiments/audio-evaluation/run_eval.py \
  --manifest experiments/audio-evaluation/results/manifest_stratified_s42_n3.csv \
  --reps 5 --repeat-subset 10
# Summarize
backend/venv/bin/python experiments/audio-evaluation/summarize.py \
  --run-a <run_a_dir> --run-b <run_b_dir> --run-c <run_c_dir> \
  --manifest-seed 42
```

**Raw data CSVs:**
- Run A predictions: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261024T075436Z/predictions.csv`
- Run B predictions: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261026T030131Z/predictions.csv`
- Run B repeatability: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261026T030131Z/repeatability.csv`
- Run C predictions: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261026T031331Z/predictions.csv`
- Run C repeatability: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261026T031331Z/repeatability.csv`


## Appendix — Earlier Runs

These runs used the buggy repeat-subset (K hardcoded to 5 quantile points) and are kept for traceability only. Do not use for repeatability conclusions.


### Appendix Run B_old — 20261024T075603Z

N=120 ok / 0 error. Corpus WER (primary) = 0.049354 95% CI [0.0382, 0.0615].
Run dir: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261024T075603Z`


### Appendix Run C_old — 20261024T080108Z

N=120 ok / 0 error. Corpus WER (primary) = 0.049354 95% CI [0.0382, 0.0615].
Run dir: `/Users/aayushbhardwaj/iCloud Drive (Archive)/Documents/Projects/Cadence/Cadence/experiments/audio-evaluation/results/runs/20261024T080108Z`
