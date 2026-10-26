#!/usr/bin/env bash
# Creates the ppo.gg database, tables and media bucket in the project named in appwrite.config.json.
# Needs the Appwrite CLI logged in to the owning account. Doubles as the schema reference.
# Publishing is enforced by Appwrite, not the UI: tables are readable only by the `admin` label,
# and each published row also carries a read(any) permission set by the admin editor.
set -u
DB=ppogg
ADMIN='"label:admin"'

appwrite tablesdb get --database-id "$DB" >/dev/null 2>&1 || appwrite tablesdb create --database-id "$DB" --name "ppo.gg" -f

for t in apps posts pages; do
  appwrite tablesdb create-table --database-id "$DB" --table-id "$t" --name "$t" --row-security \
    --permissions "create($ADMIN)" --permissions "read($ADMIN)" \
    --permissions "update($ADMIN)" --permissions "delete($ADMIN)" -f
done

col() { appwrite tablesdb "$@" --database-id "$DB" -f; }

# apps
col create-string-column   --table-id apps --key name        --size 120 --required
col create-string-column   --table-id apps --key kind        --size 120 --required
col create-string-column   --table-id apps --key stack       --size 60  --required=false --array
col create-integer-column  --table-id apps --key year        --required
col create-enum-column     --table-id apps --key status      --elements live --elements beta --elements wip --required
col create-string-column   --table-id apps --key href        --size 500 --required
col create-integer-column  --table-id apps --key order       --required=false --xdefault 0
col create-string-column   --table-id apps --key description --size 1000 --required=false
col create-string-column   --table-id apps --key imageId     --size 36 --required=false
col create-string-column   --table-id apps --key imageUrl    --size 500 --required=false
col create-boolean-column  --table-id apps --key published   --required=false --xdefault false

# posts
col create-string-column   --table-id posts --key slug        --size 80  --required
col create-string-column   --table-id posts --key title       --size 200 --required
col create-string-column   --table-id posts --key description --size 500 --required=false
col create-longtext-column --table-id posts --key body        --required
col create-datetime-column --table-id posts --key publishedAt --required
col create-boolean-column  --table-id posts --key published   --required=false --xdefault false

# pages
col create-string-column   --table-id pages --key slug      --size 80  --required
col create-string-column   --table-id pages --key title     --size 200 --required
col create-longtext-column --table-id pages --key body      --required
col create-boolean-column  --table-id pages --key published --required=false --xdefault false

echo "waiting for columns..."; sleep 10
for t in posts pages; do
  appwrite tablesdb create-index --database-id "$DB" --table-id "$t" --key slug_unique --type unique --columns slug -f
done
appwrite tablesdb create-index --database-id "$DB" --table-id apps --key order_key --type key --columns order -f

appwrite storage create-bucket --bucket-id media --name media --file-security \
  --permissions "create($ADMIN)" --permissions 'read("any")' \
  --permissions "update($ADMIN)" --permissions "delete($ADMIN)" \
  --allowed-file-extensions png --allowed-file-extensions jpg --allowed-file-extensions jpeg \
  --allowed-file-extensions webp --allowed-file-extensions gif --allowed-file-extensions svg \
  --maximum-file-size 10485760 --transformations -f
