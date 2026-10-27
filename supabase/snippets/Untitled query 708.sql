ps eww -p 68392 | tr ' ' '\n' \
  | grep -E '^(SPRING_PROFILES_ACTIVE|DB_USER)='