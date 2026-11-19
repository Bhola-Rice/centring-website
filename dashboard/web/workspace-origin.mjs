// Old grants may have a real funder title and a generated ID. Inspect their content as well.
const retiredContext = /\blantern[\s_-]+row\b|\b(?:family studio saturdays|open studio saturdays|neighbourhood arts fund)\b|^(?:citation-check-fictional|willow-fund-workshops)$/i;

export function fromRetiredWorkspace(record) {
 if (typeof record === 'string') return retiredContext.test(record);
 if (!record || typeof record !== 'object' || ArrayBuffer.isView(record)) return false;
 return Object.values(record).some(fromRetiredWorkspace);
}

export function activeChatTurns(messages) {
 const visible = [];
 let turn = [];
 function finishTurn() {
  if (!fromRetiredWorkspace(turn)) visible.push(...turn);
 }
 for (const message of messages) {
  if (message.role === 'user') { finishTurn(); turn = []; }
  turn.push(message);
 }
 finishTurn();
 return visible;
}
