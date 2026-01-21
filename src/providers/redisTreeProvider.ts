import * as vscode from 'vscode';
import * as path from 'path';
import { RedisService } from '../services/redisService';

export class RedisTreeProvider implements vscode.TreeDataProvider<RedisParams> {
    private _onDidChangeTreeData: vscode.EventEmitter<RedisParams | undefined | null | void> = new vscode.EventEmitter<RedisParams | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RedisParams | undefined | null | void> = this._onDidChangeTreeData.event;

    private allKeys: string[] = [];
    private currentCursor: string = '0';
    private filter: string = '*'; // Default filter pattern

    constructor() { }

    refresh(): void {
        this.allKeys = [];
        this.currentCursor = '0';
        this.filter = '*'; // Reset filter to show all keys
        this._onDidChangeTreeData.fire();
    }

    async search(pattern: string): Promise<void> {
        this.allKeys = [];
        this.currentCursor = '0';
        this.filter = pattern || '*';
        this._onDidChangeTreeData.fire();
    }

    async loadMore(): Promise<void> {
        if (this.currentCursor === '0') return;
        await this.loadNextBatch();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RedisParams): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: RedisParams): Promise<RedisParams[]> {
        if (!RedisService.getInstance().getActiveConnectionName()) {
            return []; // No active connection
        }

        if (!element) {
            // Root level
            // If we have no keys and cursor is 0 (initial state), fetch first batch
            if (this.allKeys.length === 0 && this.currentCursor === '0') {
                await this.loadNextBatch();
            }

            // Map keys to TreeItems (Flattened)
            const items: RedisParams[] = this.allKeys.map(key => {
                const item = new RedisParams(key, vscode.TreeItemCollapsibleState.None, false, key);
                item.contextValue = 'redisKey';

                item.command = {
                    command: 'redisLite.viewKey',
                    title: "Open Redis Key",
                    arguments: [key]
                };
                item.iconPath = new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.red'));
                return item;
            });

            // Add "Load More" button if there are more keys
            if (this.currentCursor !== '0') {
                const loadMoreItem = new RedisParams('Load More Keys...', vscode.TreeItemCollapsibleState.None, false, 'load_more_special_id');
                loadMoreItem.contextValue = 'loadMore';
                loadMoreItem.command = {
                    command: 'redisLite.loadMore',
                    title: "Load More Keys"
                };
                loadMoreItem.iconPath = new vscode.ThemeIcon('cloud-download');
                items.push(loadMoreItem);
            }

            return items;
        }

        return [];
    }

    private async loadNextBatch() {
        try {
            // Use current filter pattern
            const result = await RedisService.getInstance().scanKeys(this.currentCursor, this.filter, 100);
            this.allKeys.push(...result.keys);
            // Remove duplicates to be safe
            this.allKeys = [...new Set(this.allKeys)];
            this.currentCursor = result.nextCursor;
        } catch (e) {
            vscode.window.showErrorMessage('Failed to load keys');
        }
    }
    // Removed buildHierarchy
}

export class RedisParams extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isFolder: boolean,
        public readonly fullPath: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `Redis Key: ${fullPath}`;
        this.description = '';
    }
}
