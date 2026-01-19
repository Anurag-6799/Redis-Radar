import * as vscode from 'vscode';
import { RedisTreeProvider } from '../providers/redisTreeProvider';

export function refresh(treeProvider: RedisTreeProvider): void {
    treeProvider.refresh();
}
