import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    MoreVertical,
    MessageSquare,
    Clock,
    CheckCircle2,
    Circle,
    Search,
    Sparkles,
    Send,
    Loader2,
    Filter,
    ArrowRight,
    AlertCircle
} from 'lucide-react';
import {
    KanbanTask,
    TaskStatus,
    TaskPriority
} from '../../types';
import {
    subscribeToTasks,
    createTask,
    moveTask,
    updateTask,
    deleteTask
} from '../../services/taskService';
import { processTaskCommand } from '../../services/geminiService';

export default function ProjectBoard() {
    const [tasks, setTasks] = useState<KanbanTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [command, setCommand] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const feedbackTimeout = useRef<any>(null);

    useEffect(() => {
        const unsubscribe = subscribeToTasks((updatedTasks) => {
            setTasks(updatedTasks);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const columns: { id: TaskStatus; label: string; icon: any; color: string }[] = [
        { id: 'todo', label: 'To Do', icon: Circle, color: 'text-slate-400' },
        { id: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-blue-400' },
        { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-400' }
    ];

    const showFeedback = (type: 'success' | 'error' | 'info', message: string) => {
        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        setAiFeedback({ type, message });
        feedbackTimeout.current = setTimeout(() => setAiFeedback(null), 5000);
    };

    const handleCommand = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!command.trim() || isProcessing) return;

        setIsProcessing(true);
        setAiFeedback(null);

        try {
            const result = await processTaskCommand(command, tasks);

            if (result.success) {
                // Execute actions returned by AI
                for (const action of result.actions) {
                    switch (action.type) {
                        case 'create':
                            await createTask(action.payload);
                            break;
                        case 'update':
                            await updateTask(action.taskId, action.payload);
                            break;
                        case 'move':
                            await moveTask(action.taskId, action.payload.status);
                            break;
                        case 'delete':
                            await deleteTask(action.taskId);
                            break;
                    }
                }
                showFeedback('success', result.message || 'Commands executed successfully!');
                setCommand('');
            } else {
                showFeedback('error', result.message || 'I couldn\'t understand that command. Try "Move task X to Done" or "Create a task for Y".');
            }
        } catch (error) {
            console.error('AI Command Error:', error);
            showFeedback('error', 'Something went wrong processing your request.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
                <p className="text-slate-400">Loading project board...</p>
            </div>
        );
    }

    const handleSeed = async () => {
        setIsProcessing(true);
        try {
            const { seedTasks } = await import('../../services/taskService');
            await seedTasks();
            showFeedback('success', 'Board seeded with demo tasks!');
        } catch (error) {
            showFeedback('error', 'Failed to seed board.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Project Board</h1>
                    <p className="text-slate-400">Manage tasks with natural language AI</p>
                </div>

                {tasks.length === 0 && (
                    <button
                        onClick={handleSeed}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-red-500" />
                        Seed Demo Board
                    </button>
                )}

                {/* AI Command Bar */}
                <div className="flex-1 max-w-2xl">
                    <form
                        onSubmit={handleCommand}
                        className="relative group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center bg-black border border-white/10 group-focus-within:border-red-500/50 rounded-2xl p-1.5 transition-all duration-300 shadow-2xl">
                            <div className="px-3">
                                <Sparkles className="w-5 h-5 text-red-500" />
                            </div>
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder="E.g., 'Create a task to fix the logo' or 'Move all done tasks to completed'"
                                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 text-sm py-2"
                                disabled={isProcessing}
                            />
                            <button
                                type="submit"
                                disabled={!command.trim() || isProcessing}
                                className="p-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl transition-all shadow-lg shadow-red-500/20"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </form>

                    {/* AI Feedback message */}
                    {aiFeedback && (
                        <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${aiFeedback.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            aiFeedback.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                            {aiFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                                aiFeedback.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                                    <Sparkles className="w-4 h-4" />}
                            {aiFeedback.message}
                        </div>
                    )}
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-10">
                {columns.map((column) => (
                    <div
                        key={column.id}
                        className="flex flex-col bg-white/5 rounded-3xl border border-white/10 overflow-hidden"
                    >
                        {/* Column Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <column.icon className={`w-5 h-5 ${column.color}`} />
                                <h2 className="font-bold">{column.label}</h2>
                                <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-400 font-medium">
                                    {tasks.filter(t => t.status === column.id).length}
                                </span>
                            </div>
                            <button className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Column Content */}
                        <div className="p-4 space-y-4 overflow-y-auto min-h-[500px] custom-scrollbar">
                            {tasks
                                .filter(t => t.status === column.id)
                                .map((task) => (
                                    <TaskCard key={task.id} task={task} />
                                ))
                            }

                            {tasks.filter(t => t.status === column.id).length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/5 rounded-2xl">
                                    <p className="text-slate-500 text-sm">No tasks here</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TaskCard({ task }: { task: KanbanTask }) {
    const priorityColors = {
        low: 'bg-green-500/20 text-green-400 border-green-500/20',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
        high: 'bg-red-500/20 text-red-400 border-red-500/20'
    };

    return (
        <div className="group bg-black/40 hover:bg-black/60 border border-white/10 hover:border-red-500/30 p-4 rounded-2xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${priorityColors[task.priority]}`}>
                    {task.priority}
                </span>
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-lg transition-all text-slate-400">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>

            <h3 className="font-bold text-white mb-1 group-hover:text-red-400 transition-colors leading-tight">
                {task.title}
            </h3>

            {task.description && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                    {task.description}
                </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                <div className="flex -space-x-2">
                    {task.assignee ? (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-purple-600 border border-black flex items-center justify-center text-[10px] font-bold">
                            {task.assignee.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-black flex items-center justify-center">
                            <Circle className="w-3 h-3 text-slate-500" />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 text-slate-500">
                    <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span className="text-[10px]">2</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
