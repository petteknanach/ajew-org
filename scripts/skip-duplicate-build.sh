#!/bin/bash
# Vercel Ignored Build Step — deduplicates deploys for same commit SHA
# Exit 0 = SKIP (duplicate exists), Exit 1 = BUILD

SHA="${VERCEL_GIT_COMMIT_SHA}"
[ -z "$SHA" ] && exit 1

RESULT=$(curl -sf --max-time 8 \
  "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID:-ajew-org}&teamId=${VERCEL_TEAM_ID:-simcha-nanachs-projects}&meta-githubCommitSha=${SHA}&state=READY,BUILDING&limit=5" \
  -H "Authorization: Bearer ${VERCEL_API_TOKEN}" 2>/dev/null)

COUNT=$(echo "$RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
deps=[x for x in d.get('deployments',[]) if x.get('uid')!=sys.argv[1]]
print(len(deps))
" "${VERCEL_DEPLOYMENT_ID}" 2>/dev/null)

if [ "$COUNT" -gt 0 ] 2>/dev/null; then
  echo "SKIP: $COUNT deployment(s) for SHA ${SHA:0:7} already exist"
  exit 0
fi
echo "BUILD: no duplicate — proceeding"
exit 1
