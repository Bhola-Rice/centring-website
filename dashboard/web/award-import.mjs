import {expenseEntry} from './award-ledger.mjs';

function csvRows(text) {
  if(text.length>500000) throw Error('Import up to 500 KB at a time.');
  const rows=[];
  let cells=[],cell='',quoted=false,closed=false;
  for(const ch of text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')+'\n'){
    if(quoted){
      if(ch==='"'){quoted=false;closed=true;}else cell+=ch;
    }else if(ch==='"' && (!cell || closed)){
      if(closed)cell+='"';
      quoted=true;closed=false;
    }else if(ch===',' || ch==='\n'){
      cells.push(cell.trim());cell='';closed=false;
      if(ch==='\n'){if(cells.some(Boolean))rows.push(cells);cells=[];}
    }else{
      if(closed || ch==='"')throw Error('Check the quoting in the CSV.');
      cell+=ch;
    }
  }
  if(quoted)throw Error('An opening quote is missing its closing quote.');
  return rows;
}
export const csvHeader='transaction_id,date,category,amount,owner,description,reference';
export function reviewImport(book, text, asOf) {
  const [header,...rows]=csvRows(text);
  const keys=csvHeader.split(',');
  if(!header || header.length!==keys.length || !keys.every(k=>header.includes(k)))throw Error('Include the seven column headers shown above.');
  if(!rows.length || rows.length>1000)throw Error('Include between 1 and 1,000 transaction rows.');
  const existing=new Map(book.entries.filter(e=>e.externalId).map(e=>[e.externalId,e]));
  const fresh=[];let skipped=0;
  for(const [index,row] of rows.entries()){
    try{
      if(row.length!==keys.length)throw Error('Wrong number of columns.');
      const data=Object.fromEntries(header.map((k,i)=>[k,row[i]]));
      if(!data.transaction_id || data.transaction_id.length>120)throw Error('Supply a transaction ID.');
      const entry={...expenseEntry(book,{...data,memo:data.description},asOf),id:'finance:'+data.transaction_id,externalId:data.transaction_id};
      const prev=existing.get(entry.externalId);
      if(prev){
        if(['amount','date','category','owner','memo'].some(k=>prev[k]!==entry[k]) || (entry.reference && entry.reference!==prev.reference))throw Error('This transaction ID already has different details.');
        skipped++;
      }else{fresh.push(entry);existing.set(entry.externalId,entry);}
    }catch(e){throw Error('CSV row '+(index+2)+': '+e.message);}
  }
  return {fresh,skipped};
}
