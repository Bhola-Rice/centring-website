import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const nonprofitKnowledge=sqliteTable('nonprofit_knowledge',{owner:text('owner').primaryKey(),revision:integer('revision').notNull(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
