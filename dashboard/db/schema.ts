import {sqliteTable,text,integer,index,blob} from 'drizzle-orm/sqlite-core';
export const nonprofitKnowledge=sqliteTable('nonprofit_knowledge',{owner:text('owner').primaryKey(),revision:integer('revision').notNull(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
export const cloudRecords=sqliteTable('cloud_records',{key:text('key').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),recordId:text('record_id').notNull(),revision:integer('revision').notNull(),objectKey:text('object_key').notNull(),name:text('name').notNull(),deleted:integer('deleted').notNull().default(0),updatedAt:text('updated_at').notNull()});
export const fundingRecords=sqliteTable('funding_records',{
 id:text('id').primaryKey(),source:text('source').notNull(),title:text('title').notNull(),
 funder:text('funder').notNull(),status:text('status').notNull(),date:text('date'),
 summary:text('summary').notNull(),url:text('url'),reference:text('reference').notNull()
},t=>[index('funding_source_date').on(t.source,t.date)]);

export const fundingExcerpts=sqliteTable('funding_excerpts',{
 id:text('id').primaryKey(),image:blob('image',{mode:'buffer'}).notNull()
});
