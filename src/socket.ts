import { io } from 'socket.io-client';

// 'autoConnect: true' by default
export const socket = io(window.location.origin);
