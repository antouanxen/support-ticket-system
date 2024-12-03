export type AgentWithRole = {
    id: string
    agentName: string
    role?: {
        role_id: string
        role_description: string
    }
    updated_at: Date
} 