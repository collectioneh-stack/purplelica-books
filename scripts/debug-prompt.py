import json
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parent.parent

spec = importlib.util.spec_from_file_location(
    "translate_gemini", Path(__file__).parent / "translate-gemini.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

p = ['--- START OF THE PROJECT GUTENBERG EBOOK A CHRISTMAS CAROL IN PROSE; BEING A GHOST STORY OF CHRISTMAS ---']
prompt = mod.build_prompt(p, mod.GLOSSARY, "A Christmas Carol")
print("Prompt:")
print(prompt)

resp = mod.call_ollama(prompt, "jmpark333/eeve:latest")
print("Response:")
print(repr(resp))
