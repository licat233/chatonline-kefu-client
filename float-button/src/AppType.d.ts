
export interface PostMessage {
    content: string,
    source?: string,
    type?: "message" | "tip",
}