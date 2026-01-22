import * as vscode from 'vscode';
import { RedisService } from '../services/redisService';

export class RedisExplorerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'redisExplorer';
    private _view?: vscode.WebviewView;

    private allKeys: string[] = [];
    private currentCursor: string = '0';
    private filter: string = '*';
    private batchSize: number = 100;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // Prepare initial search value for display
        let initialSearch = '';
        if (this.filter && this.filter !== '*') {
            // Remove leading/trailing *
            initialSearch = this.filter.replace(/^\*|\*$/g, '');
        }

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, initialSearch);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'ready':
                    // View is loaded, restore state
                    if (this.allKeys.length > 0 || (this.filter && this.filter !== '*')) {
                        this.updateWebview();
                    } else {
                        // First load
                        await this.refresh();
                    }
                    break;
                case 'search':
                    await this.search(data.value);
                    break;
                case 'loadMore':
                    await this.loadMore();
                    break;
                case 'openKey':
                    vscode.commands.executeCommand('redisLite.viewKey', data.key);
                    break;
                case 'refresh':
                    await this.refresh();
                    break;
                case 'deleteKey':
                    // Verify deletion
                    const answer = await vscode.window.showWarningMessage(`Are you sure you want to delete key: ${data.key}?`, 'Yes', 'No');
                    if (answer === 'Yes') {
                        await RedisService.getInstance().deleteKey(data.key);
                        // Refresh logic - ideally just remove from local list to avoid full reload
                        this.allKeys = this.allKeys.filter(k => k !== data.key);
                        this.updateWebview();
                    }
                    break;
            }
        });
    }

    public async refresh() {
        this.allKeys = [];
        this.currentCursor = '0';
        await this.loadNextBatch();
    }

    public async search(term: string) {
        this.filter = term ? `*${term}*` : '*'; // Partial match: prefix, suffix, in-between
        this.allKeys = [];
        this.currentCursor = '0';
        await this.loadNextBatch();
    }

    private async loadMore() {
        if (this.currentCursor === '0') return;
        await this.loadNextBatch();
    }

    private async loadNextBatch() {
        try {
            if (!RedisService.getInstance().getActiveConnectionName()) {
                this.updateWebview({ error: "No active connection" });
                return;
            }

            const result = await RedisService.getInstance().scanKeys(this.currentCursor, this.filter, this.batchSize);
            this.allKeys.push(...result.keys);
            this.allKeys = [...new Set(this.allKeys)]; // Dedup
            this.currentCursor = result.nextCursor;
            this.updateWebview();
        } catch (e: any) {
            this.updateWebview({ error: e.message || "Failed to load keys" });
        }
    }

    private updateWebview(state?: { error?: string }) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'update',
                keys: this.allKeys,
                count: this.allKeys.length,
                hasMore: this.currentCursor !== '0',
                error: state?.error
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, searchTerm: string = '') {
        // Use VS Code standard CSS vars
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redis Keys</title>
            <style>
                body {
                    padding: 0;
                    margin: 0;
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-editor-foreground);
                    background-color: var(--vscode-sideBar-background);
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                .search-header {
                    padding: 10px;
                    background-color: var(--vscode-sideBarSectionHeader-background);
                    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .search-row {
                    display: flex;
                    gap: 6px;
                }
                input[type="text"] {
                    flex: 1;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 4px 6px;
                    border-radius: 2px;
                    outline: none;
                }
                input[type="text"]:focus {
                    border-color: var(--vscode-focusBorder);
                }
                button.icon-btn {
                    background: none;
                    border: none;
                    color: var(--vscode-icon-foreground);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                button.icon-btn:hover {
                    background-color: var(--vscode-toolbar-hoverBackground);
                    border-radius: 3px;
                }
                .stats-row {
                    font-size: 0.8em;
                    color: var(--vscode-descriptionForeground);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .key-list {
                    flex: 1;
                    overflow-y: auto;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .key-item {
                    padding: 4px 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid transparent; 
                    font-size: 13px;
                }
                .key-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .key-label {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    flex: 1;
                }
                .delete-btn {
                    opacity: 0;
                    color: var(--vscode-charts-red);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 2px 6px;
                }
                .key-item:hover .delete-btn {
                    opacity: 1;
                }

                .load-more-container {
                    padding: 10px;
                    text-align: center;
                }
                .load-more-btn {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 2px;
                    cursor: pointer;
                    width: 100%;
                }
                .load-more-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .error-msg {
                    padding: 10px;
                    color: var(--vscode-errorForeground);
                    text-align: center;
                    font-size: 0.9em;
                }
                .empty-msg {
                    padding: 20px;
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="search-header">
                <div class="search-row">
                    <input type="text" id="searchInput" placeholder="Search keys (e.g. user)" value="${searchTerm}" />
                    <button class="icon-btn" id="refreshBtn" title="Refresh">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.6 2.3C12.2.9 10.2 0 8 0 3.6 0 0 3.6 0 8s3.6 8 8 8c3.7 0 6.8-2.5 7.7-6h-2.1c-.8 2.3-3 4-5.6 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.7 0 3.1.7 4.2 1.8L9 7h7V0l-2.4 2.3z"/></svg>
                    </button>
                </div>
                <div class="stats-row">
                    <span id="resultCount">0 keys</span>
                    <span id="connectionStatus"></span> 
                </div>
            </div>

            <ul class="key-list" id="keyList"></ul>
            
            <div class="load-more-container" id="loadMoreContainer" style="display: none;">
                <button class="load-more-btn" id="loadMoreBtn">Load More</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // Signal ready to restore state
                vscode.postMessage({ type: 'ready' });

                const searchInput = document.getElementById('searchInput');
                const keyList = document.getElementById('keyList');
                const loadMoreContainer = document.getElementById('loadMoreContainer');
                const loadMoreBtn = document.getElementById('loadMoreBtn');
                const resultCount = document.getElementById('resultCount');
                const refreshBtn = document.getElementById('refreshBtn');

                let debounceTimer;

                // Search Debounce
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        vscode.postMessage({ type: 'search', value: e.target.value });
                    }, 400);
                });

                // Load More
                loadMoreBtn.addEventListener('click', () => {
                    vscode.postMessage({ type: 'loadMore' });
                });

                // Refresh
                refreshBtn.addEventListener('click', () => {
                     // Optionally clear search? No, user wants persistent search.
                     // Just refresh with current term.
                     vscode.postMessage({ type: 'search', value: searchInput.value });
                });

                // Handle Messages
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'update':
                            renderKeys(message.keys, message.count, message.hasMore, message.error);
                            break;
                    }
                });

                function renderKeys(keys, count, hasMore, error) {
                    keyList.innerHTML = '';
                    
                    if (error) {
                         keyList.innerHTML = '<div class="error-msg">' + error + '</div>';
                         return;
                    }

                    if (keys.length === 0) {
                        keyList.innerHTML = '<div class="empty-msg">No keys found</div>';
                    } else {
                        keys.forEach(key => {
                            const li = document.createElement('li');
                            li.className = 'key-item';
                            li.innerHTML = \`
                                <span class="key-label">\${key}</span>
                                <button class="delete-btn" title="Delete Key">×</button>
                            \`;
                            
                            // Click to open
                            li.addEventListener('click', (e) => {
                                if (e.target.classList.contains('delete-btn')) return;
                                vscode.postMessage({ type: 'openKey', key: key });
                            });

                            // Click delete
                            li.querySelector('.delete-btn').addEventListener('click', (e) => {
                                e.stopPropagation();
                                vscode.postMessage({ type: 'deleteKey', key: key });
                            });

                            keyList.appendChild(li);
                        });
                    }

                    resultCount.textContent = count + ' keys';
                    loadMoreContainer.style.display = hasMore ? 'block' : 'none';
                }
            </script>
        </body>
        </html>`;
    }
}
