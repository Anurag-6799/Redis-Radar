import * as vscode from 'vscode';
import { ConnectionManager, RedisConnection } from '../services/connectionManager';
import { RedisService } from '../services/redisService';

export class RedisConnectionProvider implements vscode.TreeDataProvider<ResultItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ResultItem | undefined | null | void> = new vscode.EventEmitter<ResultItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private connectionManager: ConnectionManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ResultItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ResultItem): Promise<ResultItem[]> {
        if (element) {
            return [];
        } else {
            const connections = this.connectionManager.getConnections();
            return connections.map(conn => {
                const item = new ResultItem(conn.name, vscode.TreeItemCollapsibleState.None);
                const isActive = RedisService.getInstance().getActiveConnectionId() === conn.id;

                item.description = `${conn.host}:${conn.port}`;
                item.connectionId = conn.id;

                if (isActive) {
                    item.description += ' (Active)';
                    item.contextValue = 'connectedContext'; // Special context for active
                    item.iconPath = new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed'));
                } else {
                    item.contextValue = 'disconnectedContext';
                    item.iconPath = new vscode.ThemeIcon('database');
                }

                return item;
            });
        }
    }
}

export class ResultItem extends vscode.TreeItem {
    public connectionId?: string;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}
