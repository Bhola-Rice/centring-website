"""Refresh a source snapshot in an already migrated local dashboard database."""
import argparse
import datetime
import sqlite3
from pathlib import Path
from urllib.parse import urlsplit

QUERIES = {
    "pharos": """
        SELECT s.key || '/' || o.external_id AS id, o.title, f.name AS funder,
               o.status, o.close_date AS date, o.description AS summary, o.url,
               s.name || ' · ' || o.external_id AS reference
        FROM opportunities o JOIN sources s ON s.id=o.source_id
        LEFT JOIN funders f ON f.id=o.funder_id WHERE o.duplicate_of_id IS NULL
    """,
    "arachne": """
        SELECT g.grant_id AS id, g.title, f.name AS funder, g.status,
               coalesce(g.full_deadline, g.loi_deadline) AS date,
               coalesce(g.summary,'') || char(10) ||
               trim(coalesce('LOI ' || g.loi_deadline || '. ','') ||
                    coalesce('Full proposal ' || g.full_deadline || '. ','') ||
                    coalesce(g.deadline_note,'')) AS summary, g.url,
               'Grant ' || g.grant_id || coalesce(' · Verified ' || substr(g.last_verified_at,1,10),'') AS reference
        FROM grants g LEFT JOIN funders f ON f.funder_id=g.funder_id
    """,
}


def snapshot(source, path):
    db = sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)
    try:
        db.row_factory = sqlite3.Row
        yield from map(dict, db.execute(QUERIES[source]))
    finally:
        db.close()


def refresh(source, path, target):
    db = sqlite3.connect(target.resolve().as_uri() + '?mode=rw', uri=True)
    try:
        with db:
            db.execute('DELETE FROM funding_records WHERE source=?', (source,))
            count = 0
            for row in snapshot(source, path):
                title = (row['title'] or '').strip()
                if not title or row['id'] is None:
                    raise ValueError('A record is missing its title or identifier.')
                date = row.get('date')
                if date:
                    datetime.date.fromisoformat(date)
                url = row.get('url') or ''
                parts = urlsplit(url)
                db.execute('INSERT INTO funding_records (id,source,title,funder,status,date,summary,url,reference) VALUES (?,?,?,?,?,?,?,?,?)',
                           (source + '-' + str(row['id']), source, title, row['funder'] or '',
                            row['status'] or 'Unknown', date or None, (row['summary'] or '')[:6000],
                            url if parts.scheme in ('http','https') and parts.hostname else None, row['reference']))
                count += 1
            if not count:
                raise ValueError('Empty snapshot. Existing records have been preserved.')
        return count
    finally:
        db.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', choices=QUERIES)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--database', type=Path, default=Path('.sites-runtime/knowledge.sqlite'))
    args = parser.parse_args()
    print(f'Imported {refresh(args.source, args.snapshot, args.database)} {args.source} records.')
