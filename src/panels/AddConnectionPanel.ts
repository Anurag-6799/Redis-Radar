import * as vscode from 'vscode';
import Redis from 'ioredis';
import { ConnectionManager } from '../services/connectionManager';

export class AddConnectionPanel {
    public static currentPanel: AddConnectionPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _connectionManager: ConnectionManager;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, connectionManager: ConnectionManager) {
        this._panel = panel;
        this._connectionManager = connectionManager;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent();
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(extensionUri: vscode.Uri, connectionManager: ConnectionManager) {
        if (AddConnectionPanel.currentPanel) {
            AddConnectionPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'addRedisConnection',
                'Add Redis Connection',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            AddConnectionPanel.currentPanel = new AddConnectionPanel(panel, extensionUri, connectionManager);
        }
    }

    public dispose() {
        AddConnectionPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                const command = message.command;
                const data = message.data;

                switch (command) {
                    case 'test':
                        this._testConnection(data);
                        return;
                    case 'save':
                        this._saveConnection(data);
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private async _testConnection(data: any) {
        const options: any = {
            host: data.host,
            port: parseInt(data.port),
            retryStrategy: () => null // Don't retry
        };
        if (data.password) options.password = data.password;

        const client = new Redis(options);

        client.on('ready', () => {
            this._panel.webview.postMessage({ command: 'testResult', success: true, message: 'Connection Successful!' });
            client.disconnect();
        });

        client.on('error', (err) => {
            this._panel.webview.postMessage({ command: 'testResult', success: false, message: `Failed: ${err.message}` });
            client.disconnect();
        });
    }

    private async _saveConnection(data: any) {
        await this._connectionManager.addConnection({
            name: data.name,
            host: data.host,
            port: parseInt(data.port),
            password: data.password
        });
        vscode.window.showInformationMessage(`Connection '${data.name}' saved.`);
        vscode.commands.executeCommand('redisLite.refreshConnections');
        this.dispose();
    }

    private _getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Redis Connection</title>
    <style>
        body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            padding: 20px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        .buttons {
            margin-top: 20px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        #btn-test {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        #btn-save {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        #status {
            margin-top: 15px;
            font-style: italic;
        }
        .success { color: var(--vscode-testing-iconPassed); }
        .error { color: var(--vscode-testing-iconFailed); }
    </style>
</head>
<body>
    <h2>Add New Connection</h2>
    <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" placeholder="e.g. Local Redis" required>
    </div>
    <div class="form-group">
        <label for="host">Host</label>
        <input type="text" id="host" value="localhost" required>
    </div>
    <div class="form-group">
        <label for="port">Port</label>
        <input type="number" id="port" value="6379" required>
    </div>
    <div class="form-group">
        <label for="password">Password (Optional)</label>
        <input type="password" id="password" placeholder="******">
    </div>

    <div class="buttons">
        <button id="btn-test">Test Connection</button>
        <button id="btn-save">Save Connection</button>
    </div>

    <div id="status"></div>

    <script>
        const vscode = acquireVsCodeApi();
        const btnTest = document.getElementById('btn-test');
        const btnSave = document.getElementById('btn-save');
        const statusDiv = document.getElementById('status');

        function getData() {
            return {
                name: document.getElementById('name').value,
                host: document.getElementById('host').value,
                port: document.getElementById('port').value,
                password: document.getElementById('password').value
            };
        }

        btnTest.addEventListener('click', () => {
            const data = getData();
            if (!data.host || !data.port) {
                statusDiv.innerHTML = '<span class="error">Host and Port are required</span>';
                return;
            }
            statusDiv.innerHTML = 'Testing...';
            vscode.postMessage({ command: 'test', data: data });
        });

        btnSave.addEventListener('click', () => {
            const data = getData();
            if (!data.name || !data.host || !data.port) {
                statusDiv.innerHTML = '<span class="error">Name, Host, and Port are required</span>';
                return;
            }
            vscode.postMessage({ command: 'save', data: data });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'testResult':
                    statusDiv.innerHTML = \`<span class="\${message.success ? 'success' : 'error'}">\${message.message}</span>\`;
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
