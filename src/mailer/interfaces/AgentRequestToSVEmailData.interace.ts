import { NewRequestEmailData } from "./NewRequestEmailData.interface";

export interface AgentRequestToSVEmailData extends NewRequestEmailData{
    agentIdRequested: string 
    agentEmailRequested: string
}