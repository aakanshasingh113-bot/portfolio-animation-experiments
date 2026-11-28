#!/usr/bin/env bash
# Extracts one frame per second (8 frames) from a film for the 7–8 second filmstrip.
# Usage: npm run frames -- public/media/films/video/01-2.mp4
# Then list the generated files in src/data/project.js → slots.filmstrip.frames
set -euo pipefail
IN="${1:?Pass the path to a film, e.g. public/media/films/video/01-2.mp4}"
ID="$(basename "$IN" | sed 's/\.[^.]*$//')"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media/films/strip"
mkdir -p "$OUT"
for s in 0 1 2 3 4 5 6 7; do
  ffmpeg -loglevel error -y -ss "$s.4" -i "$IN" -frames:v 1 -vf "scale=360:-2" -c:v libwebp -quality 80 "$OUT/${ID}_${s}.webp"
done
echo "Wrote $OUT/${ID}_0..7.webp"
echo "Add to src/data/project.js:"
echo "  frames: [0,1,2,3,4,5,6,7].map((s) => media(\`films/strip/${ID}_\${s}.webp\`)),"
