import * as vscode from 'vscode';
import { ConnectionManager } from '../services/connectionManager';
import { RedisConnectionProvider, ResultItem } from '../providers/connectionTreeProvider';
import { RedisService } from '../services/redisService';
import { AddConnectionPanel } from '../panels/AddConnectionPanel';

// Add Connection
export function addConnection(context: vscode.ExtensionContext, manager: ConnectionManager) {
    AddConnectionPanel.render(context.extensionUri, manager);
}

// Connect
export async function connectToRedis(item: ResultItem, manager: ConnectionManager, provider: RedisConnectionProvider) {
    if (!item.connectionId) return;

    const connections = manager.getConnections();
    const conn = connections.find(c => c.id === item.connectionId);

    if (conn) {
        try {
            RedisService.getInstance().connect(conn);
            provider.refresh();
            // Also need to refresh the keys view - we will handle this via event in extension.ts
            vscode.commands.executeCommand('redisLite.refresh');
            vscode.commands.executeCommand('setContext', 'redisLite:isConnected', true);
            vscode.window.showInformationMessage(`Connected to ${conn.name}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to connect: ${error.message}`);
        }
    }
}

// Delete
export async function deleteConnection(item: ResultItem, manager: ConnectionManager, provider: RedisConnectionProvider) {
    if (!item.connectionId) return;

    const answer = await vscode.window.showWarningMessage(`Delete connection '${item.label}'?`, { modal: true }, 'Yes', 'No');
    if (answer === 'Yes') {
        const activeId = RedisService.getInstance().getActiveConnectionId();
        if (activeId && activeId === item.connectionId) {
            await disconnectFromRedis(provider);
        }
        await manager.removeConnection(item.connectionId);
        provider.refresh();
    }
}

// Disconnect
export async function disconnectFromRedis(provider: RedisConnectionProvider) {
    try {
        RedisService.getInstance().disconnect();
        provider.refresh();
        vscode.commands.executeCommand('redisLite.refresh'); // Clear explorer
        vscode.commands.executeCommand('setContext', 'redisLite:isConnected', false);
        vscode.window.showInformationMessage('Disconnected from Redis');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to disconnect: ${error.message}`);
    }
}
