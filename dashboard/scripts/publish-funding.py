"""Load listing metadata into the Centring dashboard's private catalogue."""
import argparse
import concurrent.futures
import getpass
import json
import os
from pathlib import Path
import sqlite3
import time
import urllib.error
import urllib.request

ENDPOINT = "https://centring-dashboard-demo.loftyninja.chatgpt.site/api/funding/import"


class DirectOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def request(key, data=None):
    opener = urllib.request.build_opener(DirectOnly())
    req = urllib.request.Request(ENDPOINT, data=data, headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json",
        "User-Agent": "Centring-Catalogue/1.0 (+https://github.com/Bhola-Rice/centring-website)",
    })
    for attempt in range(5):
        try:
            with opener.open(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code not in (408, 429, 500, 502, 503, 504) or attempt == 4:
                raise
        except (TimeoutError, urllib.error.URLError):
            if attempt == 4:
                raise
        time.sleep(2 ** attempt)


def batches(db):
    query = """SELECT id, source, title, funder, status, date, summary, url, reference
               FROM funding_records WHERE source IN ('pharos','arachne')
               ORDER BY source, id"""
    rows, size = [], 2
    for row in db.execute(query):
        item = json.dumps(dict(row), separators=(",", ":"), ensure_ascii=False).encode()
        if len(item) + 2 > 88000:
            raise ValueError("Listing exceeds the import limit")
        if rows and (len(rows) >= 400 or size + len(item) + 1 > 88000):
            yield len(rows), b"[" + b",".join(rows) + b"]"
            rows, size = [], 2
        rows.append(item)
        size += len(item) + 1
    if rows:
        yield len(rows), b"[" + b",".join(rows) + b"]"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    args = parser.parse_args()
    key = os.environ.get("FUNDING_IMPORT_KEY") or getpass.getpass("Catalogue import key: ")
    print("Starting counts", request(key)["counts"], flush=True)

    def send(batch):
        count, data = batch
        if request(key, data)["accepted"] != count:
            raise RuntimeError("The dashboard did not acknowledge the full batch")
        return count

    with sqlite3.connect(args.database.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            total = 0
            for index, count in enumerate(pool.map(send, batches(db)), start=1):
                total += count
                if index % 50 == 0:
                    print("Accepted", total, flush=True)
    print("Accepted", total, "Final counts", request(key)["counts"], flush=True)


if __name__ == "__main__":
    main()
