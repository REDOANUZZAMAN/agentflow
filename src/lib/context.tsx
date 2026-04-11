'use client';

import React, { createContext, useContext, useReducer, useCallback, type Dispatch } from 'react';
import { reducer, initialState, type AppState, type Action, createNode, createEdge, autoLayout } from './store';
import type { NodeType, ChatMessage, ExecutionEvent } from './types';

interface AppContextType {
  state: AppState;
  dispatch: Dispatch<Action>;
  // Helper actions
  addNode: (type: NodeType, config?: Record<string, unknown>, position?: { x: number; y: number }) => string;
  connectNodes: (fromId: string, toId: string) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>, label?: string) => void;
  deleteNode: (nodeId: string) => void;
  addMessage: (message: ChatMessage) => void;
  addExecutionEvent: (event: ExecutionEvent) => void;
  setNodeStatus: (nodeId: string, status: 'idle' | 'running' | 'success' | 'error', error?: string, output?: unknown) => void;
  runAutoLayout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addNode = useCallback((type: NodeType, config: Record<string, unknown> = {}, position?: { x: number; y: number }) => {
    const node = createNode(type, config, position);
    dispatch({ type: 'ADD_NODE', payload: node });
    return node.id;
  }, []);

  const connectNodes = useCallback((fromId: string, toId: string) => {
    const edge = createEdge(fromId, toId);
    dispatch({ type: 'ADD_EDGE', payload: edge });
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>, label?: string) => {
    dispatch({
      type: 'UPDATE_NODE',
      payload: {
        id: nodeId,
        data: {
          config,
          ...(label ? { label } : {}),
        } as Partial<AppState['nodes'][0]['data']>,
      },
    });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    dispatch({ type: 'DELETE_NODE', payload: nodeId });
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const addExecutionEvent = useCallback((event: ExecutionEvent) => {
    dispatch({ type: 'ADD_EXECUTION_EVENT', payload: event });
  }, []);

  const setNodeStatus = useCallback((nodeId: string, status: 'idle' | 'running' | 'success' | 'error', error?: string, output?: unknown) => {
    dispatch({ type: 'SET_NODE_STATUS', payload: { id: nodeId, status, error, output } });
  }, []);

  const runAutoLayout = useCallback(() => {
    const layouted = autoLayout(state.nodes, state.edges);
    dispatch({ type: 'SET_NODES', payload: layouted });
  }, [state.nodes, state.edges]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addNode,
        connectNodes,
        updateNodeConfig,
        deleteNode,
        addMessage,
        addExecutionEvent,
        setNodeStatus,
        runAutoLayout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
