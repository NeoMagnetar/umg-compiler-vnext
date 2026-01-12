#!/bin/bash
set -e

echo "=== UMG Compiler v0 Validation Check ==="
echo ""

cd compiler-v0

echo "Step 1: Running priority tests..."
node --loader ts-node/esm tests/priority.test.ts
echo ""

echo "Step 2: Generating snapshots..."
npm run snapshot
echo ""

echo "=== v0 compiler validation complete ==="
