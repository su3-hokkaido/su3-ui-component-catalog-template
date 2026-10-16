---
name: add-i18n-key
description: Add or rename a next-intl message key and keep all 2 locale catalogs in sync. Use when introducing new UI copy, renaming a translation key, or when a locale is reported as missing a key.
---

# add-i18n-key

Keep the `i18n/{locale}/{section}.json` catalogs complete and structurally identical across all
supported locales: `en, ja` (English is the source of truth).

## Steps

1. Identify the section file (e.g. `i18n/en/hero.json`) and the key path to add or rename.

2. Add the key with the English value to `i18n/en/{section}.json` first. Preserve ICU syntax and
   `{placeholder}` tokens exactly.

3. Propagate the identical key structure to every other locale file. For the translations, delegate
   to the `i18n-translator` subagent so tone marks (vi), noun capitalization (de), and ICU plural
   forms are handled correctly. Never leave English text in a non-English file, and never leave a
   locale missing the key.

4. Verify parity: every locale must have exactly the same set of keys for that section. A quick check:
   ```bash
   for l in en ja; do echo "$l: $(cat i18n/$l/{section}.json | jq 'paths(scalars) | join(".")' | wc -l)"; done
   ```
   (Counts must match across locales.)

5. Reference the key in the component via `next-intl` (`useTranslations` / `getTranslations`), never
   as a hardcoded string.

## Notes

- Only UI chrome (headings, labels, buttons, empty/fallback states) is translated. External-API
  content (Zenn titles, etc.) stays in its original language and does not belong in these catalogs.
- Do not use emojis. Respond to the user in Japanese.
