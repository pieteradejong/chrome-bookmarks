#!/usr/bin/env python3
import argparse
import json
import sys
from typing import Optional
from pathlib import Path
import os

from app.bookmarks_data import BookmarkStore
from app.config import logger


def setup_argparse() -> argparse.ArgumentParser:
    """Set up command line argument parsing."""
    parser = argparse.ArgumentParser(
        description="Chrome Bookmarks Manager CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "--profile",
        help="Chrome profile name (default: Profile 1)",
        default="Profile 1"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List bookmarks")
    list_parser.add_argument(
        "--format",
        choices=["tree", "flat"],
        default="tree",
        help="Output format (default: tree)"
    )
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show bookmark statistics")
    
    # Unvisited command
    unvisited_parser = subparsers.add_parser(
        "unvisited",
        help="List unvisited bookmarks"
    )
    
    return parser


def get_bookmarks_file(profile: str) -> Path:
    """Get the path to the Chrome bookmarks file."""
    return Path.home() / "Library/Application Support/Google/Chrome" / profile / "Bookmarks"


def print_bookmark_tree(node: dict, indent: int = 0) -> None:
    """Print a bookmark tree structure."""
    prefix = "  " * indent
    if node["type"] == "folder":
        print(f"{prefix}📁 {node['name']}")
        for child in node.get("children", []):
            print_bookmark_tree(child, indent + 1)
    else:
        print(f"{prefix}🔖 {node['name']} ({node.get('url', 'N/A')})")


def print_stats(store: BookmarkStore) -> None:
    """Print bookmark statistics."""
    stats = store.get_stats()
    print("\nBookmark Statistics:")
    print(f"Total Bookmarks: {stats.total_bookmarks}")
    print(f"Total Folders: {stats.total_folders}")
    print(f"Empty Folders: {stats.empty_folders}")
    print(f"Unvisited Bookmarks: {stats.unvisited_bookmarks}")
    print(f"Duplicate URLs: {stats.duplicate_urls}")
    
    print("\nTop 10 Domains:")
    for hostname, count in sorted(
        stats.unique_hostnames.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]:
        print(f"  {hostname}: {count}")


def print_unvisited(store: BookmarkStore) -> None:
    """Print unvisited bookmarks."""
    unvisited = store.get_unvisited_bookmarks()
    if not unvisited:
        print("No unvisited bookmarks found.")
        return
        
    print(f"\nFound {len(unvisited)} unvisited bookmarks:")
    for bookmark in unvisited:
        added_date = store.chrome_time_to_str(bookmark.date_added)
        print(f"\n🔖 {bookmark.name}")
        print(f"   URL: {bookmark.url}")
        print(f"   Added: {added_date}")


def main() -> Optional[int]:
    """Main CLI entry point."""
    parser = setup_argparse()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
        
    # Get bookmarks file path
    bookmarks_file = get_bookmarks_file(args.profile)
    if not bookmarks_file.exists():
        print(f"Error: Bookmarks file not found at {bookmarks_file}")
        return 1
        
    # Initialize store
    store = BookmarkStore(str(bookmarks_file))
    try:
        store.load_data()
    except Exception as e:
        print(f"Error loading bookmarks: {e}")
        return 1
        
    # Execute command
    if args.command == "list":
        if args.format == "tree":
            tree = store.get_bookmark_tree()
            if tree:
                print_bookmark_tree(tree)
        else:
            # Flat format
            for bookmark in store._bookmarks:
                print(f"🔖 {bookmark.name} ({bookmark.url.full if bookmark.url else 'N/A'})")
                
    elif args.command == "stats":
        print_stats(store)
        
    elif args.command == "unvisited":
        print_unvisited(store)
        
    return 0


if __name__ == "__main__":
    sys.exit(main()) 