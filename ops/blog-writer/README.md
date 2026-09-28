# Ajew direct blog writer

An isolated WSGI writer. No Gmail or Supabase credentials, no corpus changes,
no edits to the email poller. Existing static blog files are read-only.

New posts and private drafts live in `/var/lib/ajew-blog-writer/writer.sqlite3`.
Publishing atomically copies the saved draft to separate published fields.
Saving further edits never changes the public version until Publish is clicked.
The blog index and RSS combine these published rows with the complete old index
and feed. Legacy URLs and prose are untouched. nginx falls back to the old index
and RSS if the writer service is unavailable. New post URLs need the service.

## Private access

An operator creates a cryptographically random device key with `writer.py
create-link LABEL`, capturing stdout privately. It returns device_id/private_url.
Never print the private URL in logs, a ticket, the chat, or the public repo.
Deliver a private shortcut directly to the owner's device. It is equivalent to
a password: anyone with the shortcut can post, so do not share it. The link key
travels in a fragment, is immediately removed from browser history, and is
exchanged for a Secure/HttpOnly/SameSite=Strict 90-day session cookie. Only key
and cookie hashes are stored. `writer.py revoke DEVICE_ID` revokes all sessions
for that shortcut. Sign out clears the session, not the device key.

## Install / update

Merge these source files to main first. Under the canonical deployment lock,
install only this directory to `/opt/ajew-blog-writer`, create the dedicated
unprivileged service account, install the pinned requirements into its venv,
install the service unit, and include nginx-writer.conf inside the HTTPS server.
Never run the entire site build or change its safeguard to deploy this service.

Back up nginx before editing; test `nginx -t` before reloading. The service has
write access only to its private state directory, not the legacy blog tree.

## Tests and backup

`python3 -m unittest discover -s ops/blog-writer -p 'test_*.py' -v`

Run `writer.py backup /private/path.sqlite3` as the service user. SQLite online
backup includes WAL state and verifies integrity. Pre-publication snapshots
are also made under the private state directory's backups folder. Copy a
verified backup off-server; copying only the live main DB can miss WAL data.

Do not publish invented test posts to the public site. Exercise publication
against an isolated fixture tree; production QA can save/read/delete a private
draft and verify its absence from the public blog, feed and post endpoint.
