export type AgentWithRole = {
    userId: string
    userName: string
    role?: {
        role_id: string
        role_description: string
    }
    updated_at: Date
} 