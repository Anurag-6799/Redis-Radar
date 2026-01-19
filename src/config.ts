import * as vscode from 'vscode';

export class Config {
    static get host(): string {
        return vscode.workspace.getConfiguration('redisLite').get('host', 'localhost');
    }

    static get port(): number {
        return vscode.workspace.getConfiguration('redisLite').get('port', 6379);
    }

    static get password(): string {
        return vscode.workspace.getConfiguration('redisLite').get('password', '');
    }
}
