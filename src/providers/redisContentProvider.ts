import * as vscode from 'vscode';
import { RedisService } from '../services/redisService';

export class RedisContentProvider implements vscode.TextDocumentContentProvider {
    onDidChange?: vscode.Event<vscode.Uri> | undefined;

    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        // uri format: redis-read-only://authority?key=<encodedKey>
        const query = new URLSearchParams(uri.query);
        const key = query.get('key') || uri.path; // Fallback

        if (!key) {
            return 'Key not found.';
        }

        try {
            const redisService = RedisService.getInstance();
            const { type, ttl, value } = await redisService.getValue(key);

            let formattedValue = '';

            if (typeof value === 'object') {
                formattedValue = JSON.stringify(value, null, 2);
            } else {
                try {
                    // Try to parse string value as JSON
                    const jsonValue = JSON.parse(value);
                    formattedValue = JSON.stringify(jsonValue, null, 2);
                } catch {
                    formattedValue = String(value);
                }
            }

            return `// KEY: ${key}
// TYPE: ${type}
// TTL: ${ttl}
// -----------------------------------------------------------------------------
${formattedValue}`;

        } catch (error: any) {
            return `Error fetching value for key '${key}': ${error.message}`;
        }
    }
}
