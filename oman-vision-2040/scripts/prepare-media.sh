#!/usr/bin/env bash
# Rebuilds public/media from the original project export.
# Usage: scripts/prepare-media.sh <path-to-unzipped>/media
# Requires ImageMagick (convert) with WebP support.
set -euo pipefail
SRC="${1:?Pass the path to the unzipped 'media' folder}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
q=86

webp() { convert "$1" -strip -quality $q "$2"; }

# Final pillar screens: copied untouched (no recolouring, no cropping).
for f in "$SRC"/01_Final_Interface_Screens/*.jpg; do
  n=$(basename "$f" .jpg | sed -E 's/^[0-9]+_//' | tr 'A-Z_' 'a-z-')
  webp "$f" "$OUT/screens/$n.webp"
done

# Film frames: the exported stills carry a baked-in play icon in the bottom-left
# corner. Trim the bottom 104px (~10%) so the site's own controls are the only ones.
for f in "$SRC"/02_Film_Frames/*.jpg; do
  n=$(basename "$f" .jpg | sed -E 's/^([0-9]+-[0-9]+)_.*/\1/')
  convert "$f" -gravity south -chop 0x104 -strip -quality $q "$OUT/films/posters/$n.webp"
done

webp "$SRC/03_Iteration_01_Information-led/Home_screen.jpg"   "$OUT/iteration-01/home.webp"
webp "$SRC/03_Iteration_01_Information-led/Topic_screens.jpg" "$OUT/iteration-01/topics.webp"
webp "$SRC/04_Iteration_02_Multimedia/Topic_screens.jpg"      "$OUT/iteration-02/topics.webp"
webp "$SRC/04_Iteration_02_Multimedia/Data_and_podcast_screens.jpg" "$OUT/iteration-02/data-podcast.webp"

# Individual crops of the iteration strips (used for close-ups).
convert "$SRC/03_Iteration_01_Information-led/Topic_screens.jpg" -crop 218x375+232+0 +repage -strip -quality $q "$OUT/iteration-01/topic-cyber.webp"
convert "$SRC/04_Iteration_02_Multimedia/Data_and_podcast_screens.jpg" -crop 256x460+311+0 +repage -strip -quality $q "$OUT/iteration-02/data.webp"
convert "$SRC/04_Iteration_02_Multimedia/Data_and_podcast_screens.jpg" -crop 286x460+655+0 +repage -strip -quality $q "$OUT/iteration-02/podcast.webp"
convert "$SRC/04_Iteration_02_Multimedia/Topic_screens.jpg" -crop 343x605+0+0 +repage -strip -quality $q "$OUT/iteration-02/topic-single.webp"
echo "Media written to $OUT"
