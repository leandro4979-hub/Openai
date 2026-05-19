#!/bin/sh
echo "🚀 Running iPhone 14 Terser Minifier Engine..."
terser core-engine.js -o core-engine.min.js --compress --mangle
echo "✅ Production package compiled to core-engine.min.js"
