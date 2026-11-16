# Personalization update

The profile photo, name, role, organisation and mission are editable in Settings. Uploaded photos are validated, centre-cropped and resized in the browser, then stored in this browser's localStorage. They are not uploaded to a service or included in Beedy's AI context. The header, sidebar, greeting and assigned-task avatars use the same profile. Use initials and Restore demo photo are reversible controls.

The default portrait is a fictional demo person. The studio photo is an illustrative scene, not evidence of an actual event. Both were generated with the built-in image-generation tool and optimized to JPEG for the app. Originals remain in the generation output folder.

## Generated assets

- `web/assets/demo-profile.jpg`
- `web/assets/community-studio.jpg`

### Portrait prompt

Use case: photorealistic-natural. Asset: square profile portrait for a fictional nonprofit team member in a polished but warm web dashboard. A friendly woman in her late thirties, medium brown shoulder-length hair, natural welcoming smile, casual moss-green knit sweater. Head and shoulders, face centered and large enough for a small circular avatar, relaxed community arts studio background softly blurred, warm daylight, natural skin texture. Editorial candid photography, approachable and real, not corporate stock photography, not glamour. One person, no text, no logos, no watermark. Entire face and hair within central 70% of frame with breathing room for circular crop. This is a fictional demo character, not a real person.

### Community scene prompt

Use case: photorealistic-natural. Asset: wide landscape community photo for a fictional nonprofit arts dashboard. Warm candid editorial photography of a small group of adult neighbors of varied ages working together around a pale wood table in a bright community art studio, making simple colorful block prints and paintings. Plants, paintbrushes, paper, natural windows, people smiling at each other while absorbed in making art, authentic small everyday joy. Three adults, casually dressed, no staged business handshake or conference setting. Composition suitable for panoramic cover crop, faces and hands near center band, warm natural daylight, soft understated green and honey accents, realistic texture, elegant calm image, no text, no logos, no watermark. 3:2 landscape. Fictional illustrative scene, not a real organization or real event.

## Connection previews

Slack, Gmail and Jira cards offer workflow previews and saved preferences, not live integrations. No OAuth flow, connector tokens, external reads or writes are performed. All cards remain Not connected, including after saving a preference. Sites connector eligibility discovery is not exposed in this session, so live provider access was not enabled or tested. Implement via the supported Sites connector eligibility and consent flow when available, without inventing connection status or exposing credentials.

## Verification

Profile editing, upload, reload persistence, initials fallback, restore demo photo, and saving/clearing a Slack preference were tested in the local browser. Desktop and 390px mobile layouts were checked for overflow. Existing agent/workspace regression tests remain applicable. The AI connection remains pending owner setup.


## Photo editor and additional connections (v5)

Application pages now include a project photo with Upload photo, Adjust photo and Restore demo controls. Settings offers the same editing for profile and workspace cover photos. The editor supports zoom, horizontal/vertical framing, brightness, reset, Save and Cancel. The preview uses the current image container's aspect ratio; responsive layouts may crop differently at other screen widths. Original framing is retained as a bounded, normalized image so edits can be revisited. Photos remain in this browser only and stay outside AI context. Unsaved form fields are restored after saving a photo, without committing those fields.

Uploads accept JPEG, PNG or WebP up to 5 MB; decoding failures and oversized images leave prior saved images intact. Browser-storage failure does not replace previous saved state. Project photos, workspace covers and profile photos are kept separately. Cancel discards draft adjustments.

Connections now includes Outlook, PayPal, Blackbaud, Eventbrite and Salesforce alongside Slack, Gmail and Jira. These remain setup previews with local preferences, not authorized integrations. PayPal's preview is read-only planning; it cannot move money. Provider permissions and actual available fields must be verified when implementing live connections.

Verified locally: upload from file chooser, crop/brightness adjustments, save, reload, re-edit using retained source, cancel, restore demo, preservation of unsaved application notes, mobile photo dialog and eight connection cards. Existing workspace/agent regression checks passed.
