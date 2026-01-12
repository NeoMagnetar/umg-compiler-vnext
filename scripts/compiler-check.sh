#!/bin/bash
set -e

echo "=== UMG Compiler v0 Validation Check ==="
echo ""

cd compiler-v0

echo "Step 1: Running priority tests..."
npm test
echo ""

echo "Step 2: Generating snapshots..."
npm run snapshot
echo ""

echo "Step 3: Running contract checks..."
npm run contract
echo ""

echo "=== All v0 compiler checks passed ==="
