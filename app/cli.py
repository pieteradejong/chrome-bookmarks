#!/usr/bin/env python3
import argparse
import json
import sys
from typing import Optional
from pathlib import Path
import os
import asyncio

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
        default="flat",
        help="Output format (default: flat)"
    )
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show bookmark statistics")
    
    # Unvisited command
    unvisited_parser = subparsers.add_parser(
        "unvisited",
        help="List unvisited bookmarks"
    )
    
    # Broken command
    broken_parser = subparsers.add_parser("broken", help="List broken bookmarks")
    broken_parser.add_argument(
        "--details",
        action="store_true",
        help="Include detailed URL check information"
    )
    
    # Analysis command
    analysis_parser = subparsers.add_parser("analyze", help="Show detailed bookmark analysis")
    
    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a bookmark")
    delete_parser.add_argument("title", help="Title of the bookmark to delete")
    
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


async def print_broken(store: BookmarkStore, include_details: bool = False) -> None:
    """Print broken bookmarks."""
    broken = await store.get_broken_bookmarks(include_details=include_details)
    if not broken:
        print("No broken bookmarks found.")
        return
        
    print(f"\nFound {len(broken)} broken bookmarks:")
    for bookmark, error, details in broken:
        added_date = store.chrome_time_to_str(bookmark.date_added)
        print(f"\n🔖 {bookmark.name}")
        print(f"   URL: {bookmark.url}")
        print(f"   Added: {added_date}")
        print(f"   Error: {error}")
        
        if include_details and details:
            print("   Details:")
            if details.get("dns_resolved") is not None:
                print(f"   - DNS Resolution: {'✓' if details['dns_resolved'] else '✗'}")
            if details.get("ssl_valid") is not None:
                print(f"   - SSL Valid: {'✓' if details['ssl_valid'] else '✗'}")
            if details.get("status_code"):
                print(f"   - Status Code: {details['status_code']}")
            if details.get("content_type"):
                print(f"   - Content Type: {details['content_type']}")
            if details.get("response_time"):
                print(f"   - Response Time: {details['response_time']:.2f}s")
            if details.get("final_url") and details["final_url"] != bookmark.url:
                print(f"   - Final URL: {details['final_url']}")


def print_analysis(store: BookmarkStore) -> None:
    """Print detailed bookmark analysis."""
    analysis = store.get_bookmark_analysis()
    
    print("\n📊 Bookmark Analysis")
    print("\nOverview:")
    print(f"Total Bookmarks: {analysis['total_bookmarks']}")
    print(f"Total Folders: {analysis['total_folders']}")
    
    print("\nBy Status:")
    for status, count in analysis["by_status"].items():
        print(f"  {status.title()}: {count}")
    
    print("\nBy Protocol:")
    for scheme, count in sorted(analysis["by_scheme"].items(), key=lambda x: x[1], reverse=True):
        print(f"  {scheme}: {count}")
    
    print("\nTop 10 TLDs:")
    for tld, count in sorted(analysis["by_tld"].items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  .{tld}: {count}")
    
    if analysis["empty_folders"]:
        print("\nEmpty Folders:")
        for folder in analysis["empty_folders"]:
            print(f"  📁 {folder['name']} (Added: {folder['date_added']})")
    
    if analysis["potential_duplicates"]:
        print("\nPotential Duplicates:")
        for dup in analysis["potential_duplicates"]:
            print(f"\n  URL: {dup['url']}")
            for bm in dup["bookmarks"]:
                print(f"  - {bm['name']}")


def delete_bookmark(store: BookmarkStore, title: str) -> None:
    """Delete a bookmark by title."""
    if store.delete_bookmark_by_title(title):
        print(f"Successfully deleted bookmark: {title}")
    else:
        print(f"Bookmark not found: {title}")


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
        
    elif args.command == "broken":
        asyncio.run(print_broken(store, args.details))
        
    elif args.command == "analyze":
        print_analysis(store)
        
    elif args.command == "delete":
        delete_bookmark(store, args.title)
        
    return 0


if __name__ == "__main__":
    sys.exit(main()) 