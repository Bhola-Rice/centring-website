// Written for the walkthrough. All programme details and costs are invented.
export const briefId = 'lantern-row-family-studio';
export const briefFields = {
  title: 'Family Studio Saturdays',
  purpose: 'Give young people and their caregivers a free Saturday activity they can attend together. A family can join for one session without committing to the whole series.',
  people: 'Plan for 24 households across eight workshops at a neighbourhood community hall. Count returning households separately from first visits.',
  activities: 'Two facilitators will lead printmaking and storytelling tables. A family liaison will arrange transport vouchers and welcome first-time participants.',
  impact: 'Record attendance by household. At the last session, invite caregivers to say whether they met someone they would ask for support. Report totals and anonymous feedback.',
  budget: 'Request $12,000: $6,400 for facilitators, $2,400 for the hall, $1,600 for supplies, and $1,600 for transport vouchers.',
  timeline: 'Allow four weeks for outreach, eight Saturdays for delivery and two weeks to reconcile receipts. The hall booking and start date still need confirmation.'
};
const briefTitle = 'Family Studio Saturdays - project brief';
export const briefName = briefTitle + '.docx';
export const briefHeading = 'Lantern Row Heritage Commons | Project brief';

// Earlier workspaces already have this starter file. Update its supplied labels
// when reading it, keeping team edits, uploads and record revisions intact.
const previousHeading = 'Lantern Row Heritage Commons | Fictional project brief';
const previousName = 'Family Studio Saturdays - fictional project brief';
function updateHeading(text) {
  return typeof text === 'string' && text.startsWith(previousHeading)
    ? briefHeading + text.slice(previousHeading.length) : text;
}
export async function currentBriefLabels(doc) {
  if (!doc.sample || (doc.id !== briefId && !doc.name?.startsWith(previousName))) return doc;
  const name = doc.name?.replace(previousName, briefTitle);
  const text = updateHeading(doc.text);
  if (name === doc.name && text === doc.text) return doc;
  const result = {...doc, name, text};
  if (doc.draft) result.draft = {...doc.draft, text: updateHeading(doc.draft.text)};
  if (doc.sourcePages) result.sourcePages = doc.sourcePages.map(p => ({...p, text: updateHeading(p.text)}));
  if (doc.review?.blocks) result.review = {...doc.review, blocks: doc.review.blocks.map(b => ({
    ...b, text: updateHeading(b.text), originalText: updateHeading(b.originalText)
  }))};
  if (doc.original && text !== doc.text) {
    if (!globalThis.JSZip) await import('./vendor/jszip.min.js');
    // An unreadable attachment should not prevent the rest of the library from opening.
    const zip = await globalThis.JSZip.loadAsync(await doc.original.arrayBuffer()).catch(() => null);
    const part = zip?.file('word/document.xml');
    if (part) {
      const originalXml = await part.async('string');
      const xml = originalXml.replace('>' + previousHeading + '<', '>' + briefHeading + '<');
      if (xml !== originalXml) {
        zip.file('word/document.xml', xml);
        result.original = await zip.generateAsync({type: 'blob', mimeType: doc.original.type});
        result.size = result.original.size;
      }
    }
  }
  return result;
}
