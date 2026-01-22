import * as vscode from 'vscode';
import { RedisExplorerProvider } from './providers/redisExplorerProvider';
import { RedisContentProvider } from './providers/redisContentProvider';
import { RedisConnectionProvider, ResultItem } from './providers/connectionTreeProvider';
import { ConnectionManager } from './services/connectionManager';
import { RedisService } from './services/redisService';
import { KeyDetailPanel } from './panels/KeyDetailPanel';
import { addConnection, connectToRedis, deleteConnection, disconnectFromRedis } from './commands/connectionCommands';

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Redis Radar is active!');

        // Services
        const connectionManager = new ConnectionManager(context);

        // Set initial context
        vscode.commands.executeCommand('setContext', 'redisLite:isConnected', false);

        // Providers
        const redisExplorerProvider = new RedisExplorerProvider(context.extensionUri);
        const redisConnectionProvider = new RedisConnectionProvider(connectionManager);

        // Register Views
        // Hardcoded ID to be absolutely sure
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('redisExplorer', redisExplorerProvider)
        );
        vscode.window.registerTreeDataProvider('redisConnections', redisConnectionProvider);

        const redisContentProvider = new RedisContentProvider();
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('redis-read-only', redisContentProvider));

        // Register Commands
        context.subscriptions.push(
            vscode.commands.registerCommand('redisLite.refresh', () => redisExplorerProvider.refresh()),
            vscode.commands.registerCommand('redisLite.flushDb', async () => {
                const answer = await vscode.window.showWarningMessage(
                    'Are you sure you want to flush the entire database? This action cannot be undone.',
                    { modal: true },
                    'Yes', 'No'
                );
                if (answer === 'Yes') {
                    try {
                        await RedisService.getInstance().flushDb();
                        vscode.window.showInformationMessage('Database flushed.');
                        redisExplorerProvider.refresh();
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to flush database: ${error.message}`);
                    }
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
    } catch (e: any) {
        vscode.window.showErrorMessage(`Redis Radar Activation Error: ${e.message}`);
        console.error(e);
    }
}

export function deactivate() {
    // Clean up
}
