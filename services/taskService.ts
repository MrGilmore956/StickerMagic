/**
 * Task Service - Handles Kanban board task operations
 */

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    getDocs,
    getDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { KanbanTask, TaskStatus, TaskPriority } from '../types';

const TASKS_COLLECTION = 'kanban_tasks';

/**
 * Create a new task
 */
export const createTask = async (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    try {
        // Get current tasks to determine order
        const tasksQuery = query(collection(db, TASKS_COLLECTION), orderBy('order', 'desc'));
        const snapshot = await getDocs(tasksQuery);
        const lastOrder = snapshot.empty ? 0 : snapshot.docs[0].data().order || 0;

        const newTask = {
            ...task,
            order: lastOrder + 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
        return docRef.id;
    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
};

/**
 * Update an existing task
 */
export const updateTask = async (taskId: string, updates: Partial<KanbanTask>) => {
    try {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string) => {
    try {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await deleteDoc(taskRef);
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

/**
 * Get all tasks with real-time updates
 */
export const subscribeToTasks = (callback: (tasks: KanbanTask[]) => void) => {
    const q = query(collection(db, TASKS_COLLECTION), orderBy('order', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const tasks: KanbanTask[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as KanbanTask));
        callback(tasks);
    }, (error) => {
        console.error('Error subscribing to tasks:', error);
    });
};

/**
 * Get all tasks once
 */
export const getTasks = async (): Promise<KanbanTask[]> => {
    try {
        const q = query(collection(db, TASKS_COLLECTION), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as KanbanTask));
    } catch (error) {
        console.error('Error getting tasks:', error);
        return [];
    }
};

/**
 * Move task to a different status
 */
export const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    return updateTask(taskId, { status: newStatus });
};

/**
 * Reorder tasks within a column or across columns
 * This is a simplified version, in a real app you'd handle specific index repositioning
 */
export const reorderTask = async (taskId: string, newOrder: number) => {
    return updateTask(taskId, { order: newOrder });
};

/**
 * Seed initial tasks for demo
 */
export const seedTasks = async () => {
    const demoTasks: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt' | 'order'>[] = [
        { title: 'Update Logo in Header', description: 'Replace the old logo with the new Saucy Bottle in Flame logo.', status: 'done', priority: 'high' },
        { title: 'Implement AI Command Bar', description: 'Set up the Gemini integration for natural language board management.', status: 'in-progress', priority: 'high' },
        { title: 'Task Reordering', description: 'Add drag and drop support for reordering tasks within columns.', status: 'todo', priority: 'medium' },
        { title: 'Mobile Bottom Nav', description: 'Explore adding a bottom navigation specifically for the mobile board view.', status: 'todo', priority: 'low' },
        { title: 'User Assignees', description: 'Allow assigning tasks to team members.', status: 'todo', priority: 'medium' }
    ];

    for (const task of demoTasks) {
        await createTask(task);
    }
    return true;
};
