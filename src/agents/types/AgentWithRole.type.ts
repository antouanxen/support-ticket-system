export type AgentWithRole = {
    id: string
    userName: string
    role?: {
        role_id: string
        role_description: string
    }
    updated_at: Date
} 