#!/bin/bash

# example periodic pruning script
# you can run add it to crontab or as a systemd timer to make this run often

set -euxo pipefail

sqlite3 unshared.db "
BEGIN TRANSACTION;

DELETE
FROM projects
WHERE MAX(created_at, last_visited_at, last_loaded_at, last_started_at) < CAST(strftime('%s', 'now', '-30 days') AS INTEGER)
RETURNING project_id, project_title;

SELECT changes() || ' project(s) deleted' AS result;

COMMIT;
"
