#!/usr/bin/env bash
SHOTS=/home/user/shots
ASSETS=/home/user/assets
OUT=/home/user/chokepoint-demo.mp4
FPS=30
W=1920
H=1080
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

rm -rf /home/user/video30 && mkdir -p /home/user/video30

# clipname:duration:caption
rows=(
 "intro:3.4:"
 "02-login:2.7:CHOOSE YOUR CLASS"
 "03-dashboard:2.7:THE OVERVIEW"
 "05-audit-verified:2.7:PROOF. NO TAMPERING."
 "06-risks:2.7:SIGNS OF THE ENEMY"
 "07-access:2.7:ROLE MATRIX"
 "09-dual-pending:2.7:TWO-PLAYER REQUIREMENT"
 "10-dual-approved:2.7:APPROVED. SECOND PLAYER."
 "12-architecture:2.7:SEE THE FULL MAP"
 "outro:3.4:"
)

idx=0
for entry in "${rows[@]}"; do
  IFS=: read -r name dur cap <<< "$entry"
  frame=""
  if [ "$name" = "intro" ]; then frame="$ASSETS/intro.png"; fi
  if [ "$name" = "outro" ]; then frame="$ASSETS/outro.png"; fi
  if [ -z "$frame" ]; then frame="$SHOTS/$name.png"; fi

  nframes=$(awk "BEGIN{print int($dur*$FPS)}")

  if [ -n "$cap" ]; then
    # Gaming caption: draw a bottom bar + cyan letter-spaced caption
    captf="[swept]drawbox=x=0:y=942:w=1920:h=86:color=black@0.62:t=fill,drawtext=fontfile=$FONT:text='$cap':fontcolor=#38e0c8:fontsize=46:x=(w-text_w)/2:y=952[vout]"
  else
    captf="[swept]copy[vout]"
  fi

  # Punch-in zoom (faster than the slow Burns) + HUD + moving scanline + caption.
  # HUD overlay static; scanline pans vertically across the scene.
  ffmpeg -y -loop 1 -i "$frame" -loop 1 -i "$ASSETS/hud.png" -loop 1 -i "$ASSETS/scanline.png" \
    -filter_complex "\
      [0:v]zoompan=z='min(zoom+0.0013,1.16)':d=$nframes:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=$FPS,format=yuv420p,fps=$FPS,fade=t=in:st=0:d=0.3[base];\
      [base][1:v]overlay=0:0[hud];\
      [hud][2:v]overlay=x=0:y='-90+mod(t*((1080+90)/$dur),1080+90)'[swept];\
      ${captf}" \
    -map "[vout]" -t "$dur" -c:v libx264 -preset veryfast -crf 21 -r $FPS -movflags +faststart \
    "/home/user/video30/clip_$idx.mp4" >/dev/null 2>&1

  if [ -s "/home/user/video30/clip_$idx.mp4" ]; then echo "clip $idx ($name, ${dur}s) OK"; else echo "FAIL $idx $name"; fi
  idx=$((idx+1))
done

echo "=== concat ==="
: > /home/user/video30/concat.txt
for i in $(seq 0 $((idx-1))); do
  echo "file '/home/user/video30/clip_$i.mp4'" >> /home/user/video30/concat.txt
done
ffmpeg -y -f concat -safe 0 -i /home/user/video30/concat.txt -c copy -movflags +faststart /home/user/video30/silent.mp4 >/dev/null 2>&1

echo "=== silent duration ==="
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 /home/user/video30/silent.mp4

# Speed narration slightly to land ~ ending, then mux.
ffmpeg -y -i /home/user/narration-30.mp3 -af "atempo=1.06" /home/user/video30/voice.mp3 >/dev/null 2>&1
ffmpeg -y -i /home/user/video30/silent.mp4 -i /home/user/video30/voice.mp3 -c:v copy -c:a aac -b:a 160k -shortest "$OUT" >/dev/null 2>&1
echo "=== FINAL ==="
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUT"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1 "$OUT"