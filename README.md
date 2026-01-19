# Redis Radar

A lightweight, professional, and efficient Redis client built directly into Visual Studio Code. Manage your Redis connections and data without leaving your editor.

![Redis Radar](https://raw.githubusercontent.com/placeholder/logo.png)

## Features

- **Multiple Connection Management**: Save and manage multiple Redis connection profiles including local and remote servers.
- **Secure Handling**: Supports password authentication and secure connection settings.
- **Efficient Explorer**:
    - **Lazy Loading**: Handles large datasets efficiently with pagination ("Load More").
    - **Search**: Quickly find keys using glob patterns (e.g., `user:*`).
    - **Visual Indicators**: Color-coded keys and status indicators.
- **Data Viewer**: View key details (Type, TTL) and values (JSON pretty-printing supported).
- **Integrated Control**: Connect, Disconnect, Flush DB, and Delete Keys directly from the UI.

## Getting Started

1.  Open the **Redis Radar** view in the sidebar (Redis icon).
2.  Click **"Add Connection"** (`+`) to create a new profile.
    - Enter a Name, Host (e.g., `localhost`), Port (default `6379`), and optional Password.
    - Test the connection and Save.
3.  Click the **Connect** (Play) icon on your profile.
4.  Browse keys, search, or view values in the Explorer.

## Requirements

- **VS Code**: v1.85.0 or higher.
- **Redis Server**: Use a local instance or remote URL.

## Extension Settings

This extension contributes the following settings:
- `redisLite.host`: Default host (if not using profiles).
- `redisLite.port`: Default port.

## Release Notes

### 1.0.0
- Initial release with Connection Management, Explorer, and Data Viewing features.
- Support for Large Datasets and Search.

---
**Enjoying Redis Insight?** Please rate us on the marketplace!
