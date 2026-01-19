import * as vscode from 'vscode';
import { RedisService } from '../services/redisService';
import { RedisTreeProvider, RedisParams } from '../providers/redisTreeProvider';

export async function deleteKey(item: RedisParams | undefined, treeProvider: RedisTreeProvider): Promise<void> {
    if (!item) {
        return;
    }

    const key = item.label;

    // Show confirmation box
    const answer = await vscode.window.showWarningMessage(
        `Are you sure you want to delete key: ${key}?`,
        { modal: true },
        'Yes',
        'No'
    );

    if (answer === 'Yes') {
        try {
            const redisService = RedisService.getInstance();
            await redisService.deleteKey(key);
            vscode.window.showInformationMessage(`Key '${key}' deleted.`);
            treeProvider.refresh();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to delete key: ${error.message}`);
        }
    }
}
