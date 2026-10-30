"""Generate the spoken guidance for the Nitya sadhana with Sarvam Bulbul v4 (bulbul:v4-flash, the v4 model the API offers), voice Shubh (gentle narration).

Reads SARVAM_API_KEY from the environment or the repo's .env. Writes assets/voice/<id>.mp3,
which build.mjs copies to public/nitya/voice/. Existing clips are kept unless --force is given.

    pip install sarvamai
    python3 tools/nitya/generate_voice.py [--force]
"""
import base64
import os
import sys
from pathlib import Path

from sarvamai import SarvamAI

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "assets" / "voice"

# One clip per phase announcement, plus the closing line. Keep in step with PHASES[...].say in src/app.js.
CLIPS = {
    "om": "Tuning in. Exhale completely. Then breathe in deeply, and chant a long Om on the out-breath. Continue, unhurried.",
    "belly": "Deep belly breathing. Let the belly rise as you breathe in, and soften as you breathe out. Begin by breathing out.",
    "sama": "Sama Vritti. Four counts in, four counts out, through the nose. No holding. Begin with the exhale.",
    "nadi": "Nadi Shodhan. Form Vishnu mudra. Close the right nostril with your thumb, and breathe out fully through the left.",
    "med": "Let the breath flow on its own. Bring your awareness to Svadhishthana, just below the navel, and silently repeat your mantra there, in a warm yellow light.",
    "done": "Complete. Sit for a moment. Let the mantra settle, and offer this practice at your guru's feet.",
}

env_file = ROOT / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        key, sep, value = line.partition("=")
        if sep and not line.lstrip().startswith("#"):
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))
api_key = os.environ.get("SARVAM_API_KEY")
if not api_key:
    raise SystemExit("SARVAM_API_KEY is empty. Paste your key into .env first.")

client = SarvamAI(api_subscription_key=api_key)
OUT.mkdir(parents=True, exist_ok=True)
force = "--force" in sys.argv

for name, text in CLIPS.items():
    path = OUT / f"{name}.mp3"
    if path.exists() and not force:
        print(f"{name}: exists, skipped")
        continue
    response = client.text_to_speech.convert(
        text=text,
        language_code="en-IN",
        speaker="shubh_en_narration_gentle",  # Shubh, gentle narration style (the v4 voices are per style)
        model="bulbul:v4-flash",
        pace=0.9,
        output_audio_codec="mp3",
    )
    path.write_bytes(base64.b64decode(response.audios[0]))
    print(f"{name}: {path.stat().st_size // 1024} KB")
