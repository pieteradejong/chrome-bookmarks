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
* Given: 
  1) size of raw data is very limited and upper-bounded;
  2) information retrieval will be central to many use cases;
  3) a great user experience will require as rapid as possible retrieval;
  4) therefore we should heavily prioritize retrieval speed and general convenience, at the expense of "storage efficiency". In normal English: **likely let's build a bunch of indices/hash tables**. 

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
* Object Oriented: implement classes and interfaces
* User story: a user can add metadata (e.g. notes or labels) to a bookmark, folder, or multiple simultaneously.
* User story: user can execute a filter against all, or a subset of, URLs: e.g. "find broken links".
* ....



### Dev notes latest status:
* Fix data flow between functions: `traverse_bookmark_bar` should return some kind of "traversal result" object, perhaps a list or folderObj's, urlObj's. And `process_*` functions should be renamed and refactored to contribute parts of the "traversal result". 
* Traversal will have as a side effect a few data structures that are built during traversal, perhaps e.g. duplicate bookmarks.
* Then, the Traversal Result can be used to do analysis.
* Important design question is how and why to do data parsing.
* Design IDEA: the user experience should be perhaps locally hosted and look like Chrome bookmarks UI, except with extra features.



## Research
In researching this project, I found `sync` metadata within the `json` file, and there's a useful resource describing the architecure behind it:
[Chrome Sync's Model API](https://www.chromium.org/developers/design-documents/sync/model-api/). That document links to the source code behind [Chromium's Bookmark Manager](https://chromium.googlesource.com/chromium/src/+/master/chrome/browser/resources/bookmarks/), which will be useful for:
* backend architecture changes and optimization,
* front end user experience ideas,
* some sense of how Google plans and documents products and features.

