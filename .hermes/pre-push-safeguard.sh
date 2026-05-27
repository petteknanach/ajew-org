#!/bin/bash
# Pre-push safeguard: runs data integrity check before every push
# Blocks push if data corruption is detected

echo "🔒 Running safeguard data integrity check..."

SCRIPT=".hermes/safeguard-check.py"
if [ -f "$SCRIPT" ]; then
    python3 "$SCRIPT"
    if [ $? -ne 0 ]; then
        echo ""
        echo "⛔ PUSH BLOCKED: Data integrity check failed."
        echo "   Fix the issues above before pushing."
        echo "   To skip (NOT recommended): AJ_FORCE_PUSH=1 git push"
        exit 1
    fi
    echo "✅ Safeguard passed"
else
    echo "⚠️  Safeguard script not found at $SCRIPT — skipping"
fi

exit 0
