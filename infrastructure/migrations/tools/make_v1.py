#!/usr/bin/env python3
# make_v1.py -- Derive V1__baseline_public_schema.sql from baseline_public.sql.
#
# Transformations applied (exactly these, asserted at end):
#   1. Remove backslash-restrict ... and backslash-unrestrict ... lines
#   2. Remove header SET lines: statement_timeout, lock_timeout,
#      idle_in_transaction_session_timeout, transaction_timeout,
#      client_encoding, standard_conforming_strings,
#      xmloption, client_min_messages, row_security
#      (all header SETs EXCEPT check_function_bodies)
#   3. Remove: SELECT pg_catalog.set_config('search_path', ...) line
#   4. Remove: CREATE SCHEMA public; line
#   5. Remove: COMMENT ON SCHEMA public ... line
#   6. Convert: SET check_function_bodies = false;
#           ->  SET LOCAL check_function_bodies = false;
#
# Everything else is byte-identical to the source.
#
# Usage:
#   python3 make_v1.py <input> <output>
#   python3 make_v1.py   (defaults to baseline/baseline_public.sql -> src/main/resources/db/migration/V1__baseline_public_schema.sql)

import sys
import re

# Resolve paths relative to this script's location
SCRIPT_DIR = __file__
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, "../../../.."))  # not used; paths relative to migrations root
MIGRATIONS_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))

DEFAULT_INPUT = os.path.join(MIGRATIONS_ROOT, "baseline", "baseline_public.sql")
DEFAULT_OUTPUT = os.path.join(MIGRATIONS_ROOT, "src", "main", "resources", "db", "migration", "V1__baseline_public_schema.sql")

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

    # Patterns to strip (matched against stripped line)
    RESTRICT_PAT        = re.compile(r"^\\(restrict|unrestrict)\s")
    SET_REMOVE_PAT      = re.compile(
        r"^SET\s+(statement_timeout|lock_timeout|idle_in_transaction_session_timeout"
        r"|transaction_timeout|client_encoding|standard_conforming_strings"
        r"|xmloption|client_min_messages|row_security)\s*=",
        re.IGNORECASE,
    )
    SET_CONFIG_PAT      = re.compile(r"^SELECT\s+pg_catalog\.set_config\s*\(\s*'search_path'", re.IGNORECASE)
    CREATE_SCHEMA_PAT   = re.compile(r"^CREATE\s+SCHEMA\s+public\s*;", re.IGNORECASE)
    COMMENT_SCHEMA_PAT  = re.compile(r"^COMMENT\s+ON\s+SCHEMA\s+public\s+", re.IGNORECASE)
    # The one SET we keep but convert
    CHECK_FN_PAT        = re.compile(r"^SET\s+check_function_bodies\s*=\s*false\s*;", re.IGNORECASE)

    removed_restrict    = []
    removed_sets        = []
    removed_set_config  = []
    removed_create_schema = []
    removed_comment_schema = []
    converted_check_fn  = []

    output_lines = []
    for raw_line in lines:
        stripped = raw_line.rstrip("\n\r")

        if RESTRICT_PAT.match(stripped):
            removed_restrict.append(stripped)
            continue

        if SET_REMOVE_PAT.match(stripped):
            removed_sets.append(stripped)
            continue

        if SET_CONFIG_PAT.match(stripped):
            removed_set_config.append(stripped)
            continue

        if CREATE_SCHEMA_PAT.match(stripped):
            removed_create_schema.append(stripped)
            continue

        if COMMENT_SCHEMA_PAT.match(stripped):
            removed_comment_schema.append(stripped)
            continue

        if CHECK_FN_PAT.match(stripped):
            new_line = raw_line.replace("SET check_function_bodies", "SET LOCAL check_function_bodies", 1)
            converted_check_fn.append(f"  BEFORE: {stripped!r}")
            converted_check_fn.append(f"  AFTER:  {new_line.rstrip()!r}")
            output_lines.append(new_line)
            continue

        output_lines.append(raw_line)

    # ── Assertions ──────────────────────────────────────────────────────────────
    errors = []

    if len(removed_restrict) != 2:
        errors.append(f"Expected exactly 2 \\restrict/\\unrestrict lines, found {len(removed_restrict)}: {removed_restrict}")

    EXPECTED_SETS = {
        "statement_timeout", "lock_timeout", "idle_in_transaction_session_timeout",
        "transaction_timeout", "client_encoding", "standard_conforming_strings",
        "xmloption", "client_min_messages", "row_security",
    }
    found_set_names = set()
    for s in removed_sets:
        m = re.match(r"^SET\s+(\w+)", s, re.IGNORECASE)
        if m:
            found_set_names.add(m.group(1).lower())
    if found_set_names != EXPECTED_SETS:
        missing = EXPECTED_SETS - found_set_names
        extra   = found_set_names - EXPECTED_SETS
        errors.append(f"Header SET mismatch. Missing: {missing}  Extra: {extra}")

    if len(removed_set_config) != 1:
        errors.append(f"Expected exactly 1 set_config('search_path',...) line, found {len(removed_set_config)}: {removed_set_config}")

    if len(removed_create_schema) != 1:
        errors.append(f"Expected exactly 1 CREATE SCHEMA public; line, found {len(removed_create_schema)}: {removed_create_schema}")

    if len(removed_comment_schema) != 1:
        errors.append(f"Expected exactly 1 COMMENT ON SCHEMA public line, found {len(removed_comment_schema)}: {removed_comment_schema}")

    if len(converted_check_fn) == 0:
        errors.append("Expected exactly 1 SET check_function_bodies conversion but found 0 matches")

    if errors:
        print("\n".join(f"ASSERTION ERROR: {e}" for e in errors), file=sys.stderr)
        sys.exit(1)

    # ── Write output ────────────────────────────────────────────────────────────
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.writelines(output_lines)

    # ── Report ──────────────────────────────────────────────────────────────────
    print("make_v1.py: all assertions passed.")
    print(f"\nRemoved \\restrict/\\unrestrict ({len(removed_restrict)} lines):")
    for s in removed_restrict:
        print(f"  {s[:80]!r}")
    print(f"\nRemoved header SET lines ({len(removed_sets)}):")
    for s in removed_sets:
        print(f"  {s!r}")
    print(f"\nRemoved set_config('search_path',...) ({len(removed_set_config)} line):")
    for s in removed_set_config:
        print(f"  {s!r}")
    print(f"\nRemoved CREATE SCHEMA public ({len(removed_create_schema)} line):")
    for s in removed_create_schema:
        print(f"  {s!r}")
    print(f"\nRemoved COMMENT ON SCHEMA public ({len(removed_comment_schema)} line):")
    for s in removed_comment_schema:
        print(f"  {s!r}")
    print(f"\nConverted SET check_function_bodies → SET LOCAL:")
    for s in converted_check_fn:
        print(f"  {s}")
    print(f"\nOutput written to: {output_path}")
    print(f"Lines: {len(lines)} -> {len(output_lines)} (removed {len(lines)-len(output_lines)} lines, converted 1)")

if __name__ == "__main__":
    main()
