#!/usr/bin/env bash
# Rebuilds the 16:9 master (and feeds the 9:16 vertical) from regenerated page
# screenshots. Run from /home/user after capturing shots/*.png and placing
# assets/{intro,outro,hud}.png (from intro-card/outro-card/hud-overlay) plus
# narration-30.mp3 and music.wav in the repo docs/demo/ folder.
# Requires: ffmpeg (with libx264), DejaVuSans-Bold font.
set -u
FPS=30
W=1920
H=1080
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
VID=/home/user/video30
rm -rf "$VID" && mkdir -p "$VID"

# name:src:type:duration:caption
#   type "card" = 1920x1080 title/end card, punch-in zoom, no HUD.
#   type "zoom" = one-screen 1920x1080 page, punch-in zoom, HUD + caption.
#   type "pan"  = tall full-page capture, vertical pan (no distortion), HUD + caption.
scenes=(
 "intro:/home/user/assets/intro.png:card:3.5:"
 "01-login:/home/user/shots/02-login.png:zoom:2.8:CHOOSE YOUR CLASS"
 "02-dashboard:/home/user/shots/03-dashboard.png:pan:6.5:THE OVERVIEW"
 "03-audit:/home/user/shots/05-audit-verified.png:pan:2.8:PROOF. NO TAMPERING."
 "04-risks:/home/user/shots/06-risks.png:pan:2.8:SIGNS OF THE ENEMY"
 "05-access:/home/user/shots/07-access.png:pan:3.2:ROLE MATRIX"
 "06-arch:/home/user/chokepoint/public/architecture-hi.png:zoom:2.8:SEE THE FULL MAP"
 "07-outro:/home/user/assets/outro.png:card:3.4:"
)

idx=0
for entry in "${scenes[@]}"; do
  IFS=: read -r name src type dur cap <<< "$entry"
  D=$(awk "BEGIN{print int($dur*$FPS)}")
  if [ "$type" = "card" ]; then
    extra=""
    if [ "$name" = "07-outro" ]; then extra=",fade=t=out:st=$(awk "BEGIN{print $dur-0.5}"):d=0.5"; fi
    fc="[0:v]scale=${W}:${H},zoompan=z='min(zoom+0.0011,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${D}:s=${W}x${H}:fps=${FPS},format=yuv420p,fps=${FPS},fade=t=in:st=0:d=0.4${extra}[vout]"
    cmd="ffmpeg -y -i ${src} -filter_complex \"${fc}\" -map \"[vout]\" -t ${dur} -r ${FPS} -c:v libx264 -preset veryfast -crf 21 -movflags +faststart ${VID}/clip_${idx}.mp4"
  else
    inputs="-loop 1 -i /home/user/assets/hud.png"
    if [ "$type" = "zoom" ]; then
      pre="scale=${W}:${H},"
      pan="zoompan=z='min(zoom+0.0012,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${D}:s=${W}x${H}:fps=${FPS}"
    else
      pre=""
      pan="zoompan=z='1.0':x='0':y='(ih-${H})*(on/(${D}-1))':d=${D}:s=${W}x${H}:fps=${FPS}"
    fi
    fc="[0:v]${pre}${pan},format=yuv420p,fps=${FPS},fade=t=in:st=0:d=0.3[base];[base][1:v]overlay=0:0[hud]"
    if [ -n "$cap" ]; then
      fc="${fc}[hud]drawbox=x=0:y=942:w=${W}:h=86:color=black@0.62:t=fill,drawtext=fontfile=${FONT}:text='${cap}':fontcolor=#38e0c8:fontsize=46:x=(w-text_w)/2:y=952[vout]"
    else
      fc="${fc}[hud]copy[vout]"
    fi
    cmd="ffmpeg -y -i ${src} ${inputs} -filter_complex \"${fc}\" -map \"[vout]\" -t ${dur} -r ${FPS} -c:v libx264 -preset veryfast -crf 21 -movflags +faststart ${VID}/clip_${idx}.mp4"
  fi
  eval "$cmd" >/dev/null 2>&1
  [ -s "${VID}/clip_${idx}.mp4" ] && echo "OK $idx $name (${dur}s)" || echo "FAIL $idx $name"
  idx=$((idx+1))
done

echo "=== concat ==="
: > "${VID}/concat.txt"
for i in $(seq 0 $((idx-1))); do echo "file '${VID}/clip_${i}.mp4'" >> "${VID}/concat.txt"; done
ffmpeg -y -f concat -safe 0 -i "${VID}/concat.txt" -c copy -movflags +faststart "${VID}/silent.mp4" >/dev/null 2>&1
echo "silent duration:"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "${VID}/silent.mp4"
