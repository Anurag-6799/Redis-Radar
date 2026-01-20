import * as vscode from 'vscode';

export class KeyDetailPanel {
    public static currentPanel: KeyDetailPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, key: string, data: any) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(key, data);
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(extensionUri: vscode.Uri, key: string, data: any) {
        if (KeyDetailPanel.currentPanel) {
            KeyDetailPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
            // Update content logic could go here if we want to reuse the panel
            KeyDetailPanel.currentPanel._panel.webview.html = KeyDetailPanel.currentPanel._getWebviewContent(key, data);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'redisKeyDetail',
                `Key: ${key}`,
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            KeyDetailPanel.currentPanel = new KeyDetailPanel(panel, key, data);
        }
    }

    public dispose() {
        KeyDetailPanel.currentPanel = undefined;
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
            (message: any) => {
                switch (message.command) {
                    case 'copy':
                        vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage('Value copied to clipboard');
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private _getWebviewContent(key: string, data: any) {
        const { type, ttl, value } = data;
        let formattedValue = '';
        let isJson = false;
        let valueHtml = '';

        let parsedData: any = null;

        if (typeof value === 'object') {
            parsedData = value;
            formattedValue = JSON.stringify(value, null, 2);
            isJson = true;
        } else {
            try {
                parsedData = JSON.parse(value);
                formattedValue = JSON.stringify(parsedData, null, 2);
                isJson = true;
            } catch {
                formattedValue = String(value);
            }
        }

        // Generate Table or Pre block
        if (isJson && typeof parsedData === 'object' && parsedData !== null) {
            valueHtml = '<table class="value-table">';
            if (Array.isArray(parsedData)) {
                // Array handling
                valueHtml += '<thead><tr><th>Index</th><th>Value</th></tr></thead><tbody>';
                parsedData.forEach((item, index) => {
                    const itemStr = typeof item === 'object' ? JSON.stringify(item) : String(item);
                    valueHtml += `<tr><td class="key-col">${index}</td><td class="val-col">${this._escapeHtml(itemStr)}</td></tr>`;
                });
                valueHtml += '</tbody>';
            } else {
                // Object handling
                valueHtml += '<thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>';
                Object.keys(parsedData).forEach(k => {
                    const v = parsedData[k];
                    const vStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    valueHtml += `<tr><td class="key-col">${this._escapeHtml(k)}</td><td class="val-col">${this._escapeHtml(vStr)}</td></tr>`;
                });
                valueHtml += '</tbody>';
            }
            valueHtml += '</table>';
        } else {
            valueHtml = `<pre>${this._escapeHtml(formattedValue)}</pre>`;
        }


        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Key Details</title>
    <style>
        body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            padding: 20px;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .key-name {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-editor-foreground);
        }
        .badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            text-transform: uppercase;
        }
        .metadata-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
        .metadata-table th, .metadata-table td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .metadata-table th {
            color: var(--vscode-descriptionForeground);
            width: 150px;
        }
        .value-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 6px;
            position: relative;
            overflow-x: auto;
        }
        pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
            z-index: 10;
        }
        .copy-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        /* Vertical Table Styles */
        .value-table {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--vscode-editor-font-size);
            font-family: var(--vscode-editor-font-family);
        }
        .value-table th, .value-table td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
            vertical-align: top;
        }
        .value-table th {
             color: var(--vscode-descriptionForeground);
             border-bottom: 2px solid var(--vscode-panel-border);
             font-weight: bold; 
        }
        .key-col {
            font-weight: bold;
            color: var(--vscode-symbolIcon-propertyForeground);
            width: 30%;
            max-width: 200px;
            word-wrap: break-word;
        }
        .val-col {
            word-wrap: break-word;
            white-space: pre-wrap; 
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="key-name">${key}</span>
        <span class="badge">${type}</span>
    </div>

    <table class="metadata-table">
        <tr>
            <th>TTL</th>
            <td>${ttl === -1 ? 'Persistent' : ttl + 's'}</td>
        </tr>
         <tr>
            <th>Type</th>
            <td>${type}</td>
        </tr>
    </table>

    <h3>Value</h3>
    <div class="value-section">
        <button class="copy-btn" id="copyBtn">Copy JSON</button>
        ${valueHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('copyBtn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'copy',
                text: ${JSON.stringify(formattedValue)}
            });
        });
    </script>
</body>
</html>`;
    }

    private _escapeHtml(unsafe: string) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
