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

        // Try to parse JSON
        if (typeof value === 'object') {
            parsedData = value;
            formattedValue = JSON.stringify(value, null, 2);
            isJson = true;
        } else {
            try {
                parsedData = JSON.parse(value);
                // Handle case where JSON.parse returns a number or string but not an object/array
                if (typeof parsedData === 'object' && parsedData !== null) {
                    formattedValue = JSON.stringify(parsedData, null, 2);
                    isJson = true;
                } else {
                    formattedValue = String(value);
                    isJson = false;
                }
            } catch {
                formattedValue = String(value);
            }
        }

        // Generate HTML based on data type
        if (isJson && parsedData) {
            valueHtml = `<div class="property-list">`;

            if (Array.isArray(parsedData)) {
                // Array Array Data
                valueHtml += `<div class="list-header">Array (${parsedData.length} items)</div>`;
                parsedData.forEach((item, index) => {
                    const val = typeof item === 'object' ? JSON.stringify(item) : String(item);
                    valueHtml += `
                        <div class="property-row">
                            <div class="property-key index-key">${index}</div>
                            <div class="property-value">${this._escapeHtml(val)}</div>
                        </div>`;
                });
            } else {
                // Object Data
                const keys = Object.keys(parsedData);
                if (keys.length === 0) {
                    valueHtml += `<div class="empty-state">Empty Object</div>`;
                } else {
                    keys.forEach(k => {
                        const val = parsedData[k];
                        // If value is a complex object, render it as pretty JSON to maintain "Vertical" flow but show detail
                        const displayVal = typeof val === 'object'
                            ? `<pre class="nested-json">${this._escapeHtml(JSON.stringify(val, null, 2))}</pre>`
                            : this._escapeHtml(String(val));

                        valueHtml += `
                            <div class="property-row">
                                <div class="property-key">${this._escapeHtml(k)}</div>
                                <div class="property-value">${displayVal}</div>
                            </div>`;
                    });
                }
            }
            valueHtml += `</div>`;
        } else {
            // Raw String Data
            valueHtml = `
                <div class="code-card">
                    <pre>${this._escapeHtml(formattedValue)}</pre>
                </div>
            `;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Key Details</title>
    <style>
        :root {
            --row-hover-bg: var(--vscode-list-hoverBackground);
            --key-color: var(--vscode-textPreformat-foreground); 
            --border-color: var(--vscode-panel-border);
            --header-bg: var(--vscode-editor-inactiveSelectionBackground);
        }
        body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            padding: 20px;
            margin: 0;
            line-height: 1.5;
        }

        /* Header Section */
        .header-container {
            display: flex;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border-color);
        }
        .key-name {
            font-size: 1.6em;
            font-weight: 600;
            word-break: break-all;
            color: var(--vscode-foreground);
        }
        .badges {
            display: flex;
            gap: 8px;
        }
        .badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Actions */
        .actions-bar {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 12px;
        }
        .action-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            transition: opacity 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .action-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        /* Property List Style */
        .property-list {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
        }
        .list-header {
            background-color: var(--header-bg);
            padding: 8px 16px;
            font-size: 0.85em;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            border-bottom: 1px solid var(--border-color);
        }
        .property-row {
            display: flex;
            border-bottom: 1px solid var(--border-color);
        }
        .property-row:last-child {
            border-bottom: none;
        }
        .property-row:hover {
            background-color: var(--row-hover-bg);
        }
        .property-key {
            width: 30%;
            min-width: 120px;
            max-width: 250px;
            padding: 10px 16px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            border-right: 1px solid var(--border-color);
            word-break: break-word; /* Ensure long keys wrap */
            background-color: rgba(128, 128, 128, 0.05); /* Slight tint for keys */
        }
        .index-key {
            font-family: var(--vscode-editor-font-family);
            color: var(--vscode-symbolIcon-numberForeground);
        }
        .property-value {
            flex: 1;
            padding: 10px 16px;
            font-family: var(--vscode-editor-font-family);
            word-break: break-word;
            white-space: pre-wrap;
            color: var(--vscode-editor-foreground);
        }
        
        /* Special formatting for nested JSON */
        .nested-json {
            margin: 0;
            font-size: 0.9em;
            background: rgba(0,0,0,0.1);
            padding: 8px;
            border-radius: 4px;
        }

        /* Code Card for raw strings */
        .code-card {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 16px;
            border-radius: 4px;
        }
        .code-card pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: var(--vscode-editor-font-family);
        }
        
        .empty-state {
            padding: 24px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

    </style>
</head>
<body>
    <div class="header-container">
        <span class="key-name">${key}</span>
        <div class="badges">
            <span class="badge">${type}</span>
            <span class="badge">${ttl === -1 ? 'Persistent' : ttl + 's'}</span>
            <span class="badge">${new Blob([formattedValue]).size} bytes</span>
        </div>
    </div>

    <div class="actions-bar">
        <button class="action-btn" id="copyBtn">
            <span>Copy Raw JSON</span>
        </button>
    </div>

    ${valueHtml}

    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('copyBtn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'copy',
                text: ${JSON.stringify(formattedValue)} // Send the raw stringified value
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
