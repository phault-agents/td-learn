# Regenerating data/opdata.json

1. Fetch the raw wikitext of each operator page (`https://docs.derivative.ca/index.php?title=<Page>&action=raw`)
   into a folder, e.g. `cache/docs/Noise_POP.wiki` — one request at a time, please be polite.
   Category pages (`Category:POPs`, `Category:CHOPs`, …) list the operator pages.
2. Fetch the transcluded parameter templates referenced as `{{:Template Name}}` (e.g.
   `COMP Xform Page`, `TOP Generator Common Page`) into `cache/tmpl/`.
3. Run `python3 scripts/opdata/build_opdata.py cache/docs cache/tmpl data/opdata.json`.

Only factual parameter metadata is extracted; descriptive text is not stored.
