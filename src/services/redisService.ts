import Redis from 'ioredis';
import { RedisConnection } from './connectionManager';

export interface RedisValue {
    type: string;
    ttl: number;
    value: any;
}

export class RedisService {
    private static instance: RedisService;
    private client: Redis | null = null;
    private activeConnection: RedisConnection | null = null;

    private _onDidConnect = new Set<() => void>();

    private constructor() { }

    static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    // Allow subscribing to connection changes
    onDidConnect(callback: () => void) {
        this._onDidConnect.add(callback);
    }

    connect(connection: RedisConnection): void {
        // Disconnect existing
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }

        this.activeConnection = connection;

        const options: any = {
            host: connection.host,
            port: connection.port,
            retryStrategy: (times: number) => Math.min(times * 50, 2000)
        };

        if (connection.password) {
            options.password = connection.password;
        }

        this.client = new Redis(options);

        this.client.on('connect', () => {
            this._onDidConnect.forEach(cb => cb());
        });

        this.client.on('error', (err) => {
            // console.error handled by ioredis usually, but we can hook here
        });
    }

    disconnect(): void {
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
        this.activeConnection = null;
        this._onDidConnect.forEach(cb => cb());
    }

    getActiveConnectionName(): string | undefined {
        return this.activeConnection?.name;
    }

    getActiveConnectionId(): string | undefined {
        return this.activeConnection?.id;
    }

    async scanKeys(cursor: string = '0', pattern: string = '*', count: number = 100): Promise<{ keys: string[], nextCursor: string }> {
        if (!this.client) {
            throw new Error('No active Redis connection. Please connect to a server.');
        }

        try {
            const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
            const nextCursor = result[0];
            const keys = result[1];
            return { keys, nextCursor };
        } catch (error) {
            console.error('Error scanning keys:', error);
            throw error;
        }
    }

    async getValue(key: string): Promise<RedisValue> {
        if (!this.client) {
            throw new Error('No active Redis connection.');
        }

        const type = await this.client.type(key);
        const ttl = await this.client.ttl(key);
        let value: any;

        switch (type) {
            case 'string':
                value = await this.client.get(key);
                break;
            case 'hash':
                value = await this.client.hgetall(key);
                break;
            case 'list':
                value = await this.client.lrange(key, 0, -1);
                break;
            case 'set':
                value = await this.client.smembers(key);
                break;
            case 'zset':
                value = await this.client.zrange(key, 0, -1, 'WITHSCORES');
                break;
            default:
                value = `Unsupported type: ${type}`;
        }

        return { type, ttl, value };
    }

    async deleteKey(key: string): Promise<void> {
        if (!this.client) throw new Error("No active connection");
        await this.client.del(key);
    }

    async flushDb(): Promise<void> {
        if (!this.client) throw new Error("No active connection");
        await this.client.flushdb();
    }
}
