import * as vscode from 'vscode';

export interface RedisConnection {
    id: string;
    name: string;
    host: string;
    port: number;
    password?: string;
}

export class ConnectionManager {
    private static readonly KEY = 'redis.connections';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    getConnections(): RedisConnection[] {
        return this.context.globalState.get<RedisConnection[]>(ConnectionManager.KEY) || [];
    }

    async addConnection(connection: Omit<RedisConnection, 'id'>): Promise<void> {
        const connections = this.getConnections();
        const newConnection = { ...connection, id: this.generateId() };
        connections.push(newConnection);
        await this.context.globalState.update(ConnectionManager.KEY, connections);
    }

    async removeConnection(id: string): Promise<void> {
        const connections = this.getConnections().filter(c => c.id !== id);
        await this.context.globalState.update(ConnectionManager.KEY, connections);
    }

    async editConnection(id: string, updates: Partial<RedisConnection>): Promise<void> {
        const connections = this.getConnections();
        const index = connections.findIndex(c => c.id === id);
        if (index !== -1) {
            connections[index] = { ...connections[index], ...updates };
            await this.context.globalState.update(ConnectionManager.KEY, connections);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
