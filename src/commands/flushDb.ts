import * as vscode from 'vscode';
import { RedisService } from '../services/redisService';
import { RedisTreeProvider } from '../providers/redisTreeProvider';

export async function flushDb(treeProvider: RedisTreeProvider): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
        'Are you sure you want to flush the entire database? This action cannot be undone.',
        { modal: true },
        'Yes',
        'No'
    );

    if (answer === 'Yes') {
        try {
            const redisService = RedisService.getInstance();
            await redisService.flushDb();
            vscode.window.showInformationMessage('Database flushed.');
            treeProvider.refresh();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to flush database: ${error.message}`);
        }
    }
}
