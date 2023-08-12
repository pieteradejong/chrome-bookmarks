# Chrome Bookmarks Analysis

Author: Pieter de Jong
Purpose: Analyze local Chrome bookmarks.
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
### Data constraints
* TODO: add analysis of `bookmark_obj`, `url_obj`, `folder_obj` structure
* Folders can be empty, in which case a `folder_obj` exists with `children = []`, an empty array. (Tested by bookmarking website to new folder, subsequently removing from folder using Manager.)
  

## 'Design' Notes
* Data size: a reasonable estimate would be max. ~1000s of bookmarks, so we can we quite inefficient if it improves our code, design, or user experience.
* Network: all is run locally so there are no network considerations.
* Project involves parsing URLs, obviously. We not to pursue any URL validation (as of this writing), because:
  * Bookmarks are inherently very likely a valid URL format;
  * The impact of an invalid URL should be very low as we're just doing specific reporting and processing tasks;
  * URL validation is notoriously hard, so the cost-benefit trade-off is to limit time spent.
* Proper use case for Python's built-in `hash`: we only need unique identifiablity for URLs within one runtime session, it runs quickly and we don't need cryptographic security, or multi-session consistency.

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
* Object Oriented: 

### Dev notes latest status:
* Fix data flow between functions: `traverse_bookmark_bar` should return some kind of "traversal result" object, perhaps a list or folderObj's, urlObj's. And `process_*` functions should be renamed and refactored to contribute parts of the "traversal result". 
* Traversal will have as a side effect a few data structures that are built during traversal, perhaps e.g. duplicate bookmarks.
* Then, the Traversal Result can be used to do analysis.
* Important design question is how and why to do data parsing.
  