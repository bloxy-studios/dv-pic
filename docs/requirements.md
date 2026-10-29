# DV Ready requirements record

Verified on 2026-10-28. travel.state.gov blocked a direct download (HTTP 403). Wording is from the indexed text of the official pages retrieved that day. Do not treat the DV-2026 PDF as a DV-2027 rule.

## Registration

| Item | Status |
| --- | --- |
| DV-2027 entry open? | Not verified as open |
| Last Department notice | November 5, 2025: the start date would be announced later. https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html |
| Entry site indexed text | dvprogram.state.gov said entries were not being accepted and described the closed DV-2026 period. That text can change. |
| DV-2027 photo instruction PDF | Not found |

## Active photo rules

These come from the current photo requirements page and the digital-image page. They apply to principal and derivative photographs when a DV entry requires a digital image. They are not labeled as a DV-2027-only publication.

| Requirement | Kind | How tested | Limit |
| --- | --- | --- | --- |
| JPEG | Technical | File header | Name and MIME type are ignored |
| 600×600 | Technical | Decoded pixels | DV section of the photo page. The general digital page allows up to 1200. This tool follows the DV section. |
| Square | Technical | Width equals height | |
| ≤ 240 kB | Technical | Byte length after encoding | Interpreted as 240,000 bytes, not 245,760 |
| Color, 24-bit when readable | Technical | JPEG components | A color file can still look gray |
| sRGB | Technical | ICC description | Missing profile is “unable to verify” |
| Compression ≤ 20:1 | Technical | Bytes versus width × height × 3 | Estimate only |
| Taken within six months | Process | DateTimeOriginal, calendar months | EXIF is not proof. Missing dates are not failures |
| Head 50–69% of height | Composition | Landmark estimate only | Crown-to-chin is not marked passed |
| Background, pose, expression, glasses, edits | Composition | Estimates plus checklist | Religion, medical exceptions, and editing are not decided automatically |

Sources:

- https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html
- https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html
- https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/photo-examples.html

## Historical, not active

DV-2026 plain-language instructions required photos of the entrant, spouse, and derivative children, with an exception for a spouse or child who is already a U.S. citizen or lawful permanent resident. That rule is stored inactive until a DV-2027 instruction confirms it.

https://travel.state.gov/content/dam/visas/Diversity-Visa/DV-Instructions-Translations/DV-2026-Instructions-Translations/DV%202026%20Plain%20Language%20Instructions%20and%20FAQs.pdf
