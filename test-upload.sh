#!/bin/bash

# Test script for breakdown media upload
# Usage: ./test-upload.sh <token> <assetId>

TOKEN=$1
EQUIPMENT_ID=$2

if [ -z "$TOKEN" ] || [ -z "$EQUIPMENT_ID" ]; then
  echo "Usage: ./test-upload.sh <token> <assetId>"
  echo "Example: ./test-upload.sh eyJhbGc... 6905b7c4684b94f91c133a7b"
  exit 1
fi

echo "🧪 Testing breakdown media upload..."
echo "Asset ID: $EQUIPMENT_ID"
echo ""

# Create a test image file (1x1 pixel PNG)
echo "Creating test image..."
echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test-image.png

echo "✅ Test image created"
echo ""

# Test upload
echo "📤 Uploading to /api/breakdown-media..."
curl -X POST http://localhost:3000/api/breakdown-media \
  -H "Authorization: Bearer $TOKEN" \
  -F "assetId=$EQUIPMENT_ID" \
  -F "breakdownType=electrical" \
  -F "description=Test upload from script" \
  -F "files=@test-image.png" \
  -v

echo ""
echo ""
echo "🧹 Cleaning up..."
rm test-image.png

echo "✅ Test complete!"
