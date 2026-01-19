import * as vscode from 'vscode';
import { RedisTreeProvider, RedisParams } from './providers/redisTreeProvider';
import { RedisContentProvider } from './providers/redisContentProvider';
import { RedisConnectionProvider, ResultItem } from './providers/connectionTreeProvider';
import { ConnectionManager } from './services/connectionManager';
import { RedisService } from './services/redisService';
import { refresh } from './commands/refresh';
import { deleteKey } from './commands/deleteKey';
import { KeyDetailPanel } from './panels/KeyDetailPanel';
import { flushDb } from './commands/flushDb';
import { addConnection, connectToRedis, deleteConnection, disconnectFromRedis } from './commands/connectionCommands';

export function activate(context: vscode.ExtensionContext) {
    console.log('Redis Radar is active!');

    // Services
    const connectionManager = new ConnectionManager(context);

    // Set initial context
    vscode.commands.executeCommand('setContext', 'redisLite:isConnected', false);

    // Providers
    const redisTreeProvider = new RedisTreeProvider();
    const redisConnectionProvider = new RedisConnectionProvider(connectionManager);

    // Register Views
    vscode.window.registerTreeDataProvider('redisExplorer', redisTreeProvider);
    vscode.window.registerTreeDataProvider('redisConnections', redisConnectionProvider);

    const redisContentProvider = new RedisContentProvider();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('redis-read-only', redisContentProvider));

    // Register Commands
    context.subscriptions.push(
        // Explorer Commands
        vscode.commands.registerCommand('redisLite.refresh', () => refresh(redisTreeProvider)),
        vscode.commands.registerCommand('redisLite.deleteKey', (item: RedisParams) => deleteKey(item, redisTreeProvider)),
        vscode.commands.registerCommand('redisLite.flushDb', () => flushDb(redisTreeProvider)),
        vscode.commands.registerCommand('redisLite.loadMore', () => redisTreeProvider.loadMore()),
        vscode.commands.registerCommand('redisLite.search', async () => {
            const pattern = await vscode.window.showInputBox({
                prompt: 'Search Keys (Pattern)',
                value: '*',
                placeHolder: 'e.g. user:*'
            });
            if (pattern !== undefined) {
                await redisTreeProvider.search(pattern);
            }
        }),
        vscode.commands.registerCommand('redisLite.viewKey', async (key: string) => {
            try {
                const data = await RedisService.getInstance().getValue(key);
                KeyDetailPanel.render(context.extensionUri, key, data);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to load key: ${error.message}`);
            }
        }),

        // Connection Commands
        vscode.commands.registerCommand('redisLite.addConnection', () => addConnection(context, connectionManager)),
        vscode.commands.registerCommand('redisLite.connect', (item: ResultItem) => connectToRedis(item, connectionManager, redisConnectionProvider)),
        vscode.commands.registerCommand('redisLite.deleteConnection', (item: ResultItem) => deleteConnection(item, connectionManager, redisConnectionProvider)),
        vscode.commands.registerCommand('redisLite.disconnect', () => disconnectFromRedis(redisConnectionProvider)),
        vscode.commands.registerCommand('redisLite.refreshConnections', () => redisConnectionProvider.refresh())
    );
}

export function deactivate() {
    // Clean up
}
