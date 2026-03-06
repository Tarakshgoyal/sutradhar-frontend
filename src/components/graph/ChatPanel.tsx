import { useCallback, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendChatMessage, type ChatMessage } from "@/lib/api"
import { Send, Loader2, X, GripVertical } from "lucide-react"

const remarkPlugins = [remarkGfm]

interface DisplayMessage {
    role: "user" | "assistant" | "system"
    content: string
}

interface ChatPanelProps {
    onClose: () => void
}

const MIN_WIDTH = 320
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 400

export function ChatPanel({ onClose }: ChatPanelProps) {
    const [messages, setMessages] = useState<DisplayMessage[]>([
        {
            role: "system",
            content:
                "Ask questions about entities, relationships, events, and trends in the knowledge graph.",
        },
    ])
    const [input, setInput] = useState("")
    const [sending, setSending] = useState(false)
    const [history, setHistory] = useState<ChatMessage[]>([])
    const [width, setWidth] = useState(DEFAULT_WIDTH)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const isDragging = useRef(false)

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        })
    }

    // Drag-to-resize handler
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        isDragging.current = true
        const startX = e.clientX
        const startWidth = width

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return
            const delta = startX - e.clientX
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta))
            setWidth(newWidth)
        }

        const onMouseUp = () => {
            isDragging.current = false
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
        }

        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width])

    const handleSend = async () => {
        const q = input.trim()
        if (!q || sending) return

        setInput("")
        setMessages((prev) => [...prev, { role: "user", content: q }])
        setSending(true)

        try {
            const resp = await sendChatMessage(q, history)
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: resp.answer },
            ])
            setHistory((prev) => [
                ...prev,
                { role: "user", content: q },
                { role: "assistant", content: resp.answer },
            ])
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
                },
            ])
        } finally {
            setSending(false)
        }
    }

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom()
    }, [messages, sending])

    return (
        <div
            className="fixed top-[52px] right-0 bottom-0 z-20 flex flex-col border-l border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl"
            style={{ width }}
        >
            {/* Drag handle on left edge */}
            <div
                className="absolute top-0 -left-1 bottom-0 z-30 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:opacity-100"
                onMouseDown={onMouseDown}
            >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            {/* Invisible wider drag target */}
            <div
                className="absolute top-0 -left-2 bottom-0 z-20 w-4 cursor-col-resize"
                onMouseDown={onMouseDown}
            />

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
                <h2 className="text-xs font-semibold text-sky-400">
                    Intelligence Graph Chat
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-6 w-6 text-muted-foreground hover:text-white"
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Scrollable messages area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="flex flex-col gap-3 p-4">
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} message={msg} />
                    ))}
                    {sending && (
                        <div className="flex items-center gap-2 self-start rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px] text-muted-foreground italic">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Thinking…
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-white/10 px-3 py-2.5">
                <div className="flex gap-2">
                    <Input
                        id="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask about the knowledge graph..."
                        className="h-8 border-white/10 bg-white/5 text-xs"
                        disabled={sending}
                    />
                    <Button
                        id="chat-send"
                        size="icon"
                        onClick={handleSend}
                        disabled={sending || !input.trim()}
                        className="h-8 w-8 shrink-0"
                    >
                        <Send className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function MessageBubble({ message }: { message: DisplayMessage }) {
    if (message.role === "system") {
        return (
            <p className="text-center text-[11px] text-muted-foreground italic">
                {message.content}
            </p>
        )
    }

    const isUser = message.role === "user"

    return (
        <div
            className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${isUser
                    ? "self-end rounded-br-sm bg-sky-950/60 text-sky-100"
                    : "self-start rounded-bl-sm border border-white/5 bg-white/5 text-gray-200"
                }`}
        >
            {isUser ? (
                <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
                <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={remarkPlugins}>{message.content}</ReactMarkdown>
                </div>
            )}
        </div>
    )
}
