export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  groundingChunks?: GroundingChunk[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}
