#!/usr/bin/env python3
# make_v3.py -- Derive V3__baseline_reference_data.sql from baseline_reference_data.sql.
#
# Transformations applied:
#   1. Remove \restrict and \unrestrict lines (pg_dump 17 markers)
#   2. Remove header SET lines and set_config('search_path',...) line
#   3. Validate that every INSERT targets an allowed table:
#      {word_bank, exercise_templates, bucket_l1_mapping, chat_rooms, refill_lock, word_bank_research_lock}
#   4. For word_bank INSERTs: drop only if line ends with:
#      'llm_research') ON CONFLICT DO NOTHING;
#      Otherwise keep. Assert kept == 167, dropped == 11.
#   5. For refill_lock and word_bank_research_lock INSERTs:
#      normalise values to (key, false, NULL).
#
# Usage:
#   python3 make_v3.py [<input> <output>]

import sys
import re
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MIGRATIONS_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))

DEFAULT_INPUT = os.path.join(MIGRATIONS_ROOT, "baseline", "baseline_reference_data.sql")
DEFAULT_OUTPUT = os.path.join(MIGRATIONS_ROOT, "src", "main", "resources", "db", "migration", "V3__baseline_reference_data.sql")

ALLOWED_TABLES = {
    "word_bank",
    "exercise_templates",
    "bucket_l1_mapping",
    "chat_rooms",
    "refill_lock",
    "word_bank_research_lock",
}


def normalise_lock_insert(line: str, table: str) -> str:
    m = re.search(r"VALUES\s*\(\s*([^,\s]+)", line)
    if not m:
        raise ValueError(f"Could not find lock key in line: {line}")
    key = m.group(1)
    return f"INSERT INTO public.{table} (lock_key, is_locked, locked_at) VALUES ({key}, false, NULL) ON CONFLICT DO NOTHING;\n"


def main():
    if len(sys.argv) == 3:
        input_path, output_path = sys.argv[1], sys.argv[2]
    elif len(sys.argv) == 1:
        input_path, output_path = DEFAULT_INPUT, DEFAULT_OUTPUT
    else:
        print(f"Usage: {sys.argv[0]} [<input> <output>]", file=sys.stderr)
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    RESTRICT_PAT = re.compile(r"^\\(restrict|unrestrict)\s")
    SET_REMOVE_PAT = re.compile(
        r"^SET\s+(statement_timeout|lock_timeout|idle_in_transaction_session_timeout"
        r"|transaction_timeout|client_encoding|standard_conforming_strings"
        r"|xmloption|client_min_messages|row_security|check_function_bodies)\s*=",
        re.IGNORECASE,
    )
    SET_CONFIG_PAT = re.compile(r"^SELECT\s+pg_catalog\.set_config\s*\(\s*'search_path'", re.IGNORECASE)
    INSERT_PAT = re.compile(r"^INSERT INTO (?:public\.)?(\w+)")

    removed_restrict = []
    removed_sets = []
    removed_set_config = []
    word_bank_kept = 0
    word_bank_dropped = 0
    output_lines = []

    for raw_line in lines:
        stripped = raw_line.rstrip("\r\n")

        if RESTRICT_PAT.match(stripped):
            removed_restrict.append(stripped)
            continue

        if SET_REMOVE_PAT.match(stripped):
            removed_sets.append(stripped)
            continue

        if SET_CONFIG_PAT.match(stripped):
            removed_set_config.append(stripped)
            continue

        m_ins = INSERT_PAT.match(stripped)
        if m_ins:
            table = m_ins.group(1)
            if table not in ALLOWED_TABLES:
                raise ValueError(
                    f"INSERT targets table '{table}' outside allowed set {ALLOWED_TABLES}: {stripped}"
                )

            if table == "word_bank":
                if stripped.endswith("'llm_research') ON CONFLICT DO NOTHING;"):
                    word_bank_dropped += 1
                    continue
                else:
                    word_bank_kept += 1
                    output_lines.append(raw_line)
                    continue

            if table in ("refill_lock", "word_bank_research_lock"):
                norm_line = normalise_lock_insert(stripped, table)
                output_lines.append(norm_line)
                continue

            # Other allowed tables: exercise_templates, bucket_l1_mapping, chat_rooms
            output_lines.append(raw_line)
            continue

        output_lines.append(raw_line)

    # Assertions
    assert len(removed_restrict) == 2, f"Expected 2 restrict/unrestrict lines, found {len(removed_restrict)}"
    assert len(removed_set_config) == 1, f"Expected 1 set_config line, found {len(removed_set_config)}"
    assert word_bank_kept == 167, f"Expected exactly 167 kept word_bank rows, got {word_bank_kept}"
    assert word_bank_dropped == 11, f"Expected exactly 11 dropped word_bank rows, got {word_bank_dropped}"

    # Write output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.writelines(output_lines)

    print("make_v3.py: all assertions passed.")
    print(f"Removed restrict/unrestrict lines: {len(removed_restrict)}")
    print(f"Removed header SET lines: {len(removed_sets)}")
    for s in removed_sets:
        print(f"  {s!r}")
    print(f"Removed set_config line: {len(removed_set_config)}")
    print(f"word_bank rows kept: {word_bank_kept}")
    print(f"word_bank rows dropped: {word_bank_dropped}")
    print(f"Output written to: {output_path}")
    print(f"Lines: {len(lines)} -> {len(output_lines)}")


if __name__ == "__main__":
    main()
