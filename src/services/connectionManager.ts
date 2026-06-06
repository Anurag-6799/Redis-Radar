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

    async getConnections(): Promise<RedisConnection[]> {
        const connections = this.context.globalState.get<RedisConnection[]>(ConnectionManager.KEY) || [];
        let needsMigration = false;
        
        for (const conn of connections) {
            if (conn.password !== undefined) {
                if (conn.password) {
                    await this.context.secrets.store(`redis.connection.${conn.id}.password`, conn.password);
                }
                delete conn.password;
                needsMigration = true;
            }
            const secretPassword = await this.context.secrets.get(`redis.connection.${conn.id}.password`);
            if (secretPassword) {
                conn.password = secretPassword;
            }
        }
        
        if (needsMigration) {
            const safeConnections = connections.map(c => {
                const copy = { ...c };
                delete copy.password;
                return copy;
            });
            await this.context.globalState.update(ConnectionManager.KEY, safeConnections);
        }
        
        return connections;
    }

    async addConnection(connection: Omit<RedisConnection, 'id'>): Promise<void> {
        const connections = await this.getConnections();
        const id = this.generateId();
        const newConnection = { ...connection, id };
        
        if (newConnection.password) {
            await this.context.secrets.store(`redis.connection.${id}.password`, newConnection.password);
        }
        
        connections.push(newConnection);
        
        const safeConnections = connections.map(c => {
            const copy = { ...c };
            delete copy.password;
            return copy;
        });
        await this.context.globalState.update(ConnectionManager.KEY, safeConnections);
    }

    async removeConnection(id: string): Promise<void> {
        const connections = await this.getConnections();
        const remaining = connections.filter(c => c.id !== id);
        
        await this.context.secrets.delete(`redis.connection.${id}.password`);
        
        const safeConnections = remaining.map(c => {
            const copy = { ...c };
            delete copy.password;
            return copy;
        });
        await this.context.globalState.update(ConnectionManager.KEY, safeConnections);
    }

    async editConnection(id: string, updates: Partial<RedisConnection>): Promise<void> {
        const connections = await this.getConnections();
        const index = connections.findIndex(c => c.id === id);
        if (index !== -1) {
            if (updates.password !== undefined) {
                if (updates.password) {
                    await this.context.secrets.store(`redis.connection.${id}.password`, updates.password);
                } else {
                    await this.context.secrets.delete(`redis.connection.${id}.password`);
                }
            }
            connections[index] = { ...connections[index], ...updates };
            
            const safeConnections = connections.map(c => {
                const copy = { ...c };
                delete copy.password;
                return copy;
            });
            await this.context.globalState.update(ConnectionManager.KEY, safeConnections);
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
