# Chrome Bookmarks Analysis

Author: Pieter de Jong
Purpose: Analyze local Chrome bookmarks
Audience: Anyone interested in the topic. 

:exclamation: Warning: bookmarks are personal and always be careful with what data and code you publish.

* Based on `Bookmarks` (`.json` format), which on Chrome for Mac should be readily accessible in a directory like `~/Library/Application Support/Google/Chrome/[your profile name]`. 
* Find your local Chrome profile directory by navigating to `chrome://version` in Chrome, and looking for `Profile Path`.

**Background**: I wanted to detect duplicate bookmarks and broken links among my bookmarks. Chrome stores bookmarks locally, which enables local analysis.

## Usage

Command line, from project directory:
```bash
$ python main.py
```

## Data structure
json object:
```json
{
  "checksum": "string",
  "roots": "contains Bookmarks Bar, Other Bookmarks, Mobile Bookmarks",
  "sync_metadata": "very long alphanumeric plus `+` and `/`"
  "version": 1
}
```

As part of the project I'd like to figure out the mechanism behind `sync_metadata`. Perhaps it's similar to `rsync`.

The json object is a tree of objects:
```json
{
  "date_added": "unix-like format",
  "date_last_used": "unix-like format",
  "date_modified": "unix-like format",
  "guid": "GUID",
  "id": "integer",
  "name": "Name given by user in Chrome UI",
  "type": "folder/url/..."
}

```

## Functionality
* :white_check_mark: can preview the first `n` characters from your bookmarks file.

## TODO
* process data: create flat list of: (name, url, url_components)
* print with maxdepth=1
* print tree-like structure of menus and number of leaves
* list all pdf bookmarks
* detect duplicate/similar URLs
  * detect identical host names e.g. mydomain.com
* detect bookmark "kind":
  * article, job post, video, news, document, communications, social media, ...