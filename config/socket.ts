import { Socket } from 'socket.io';

export const SocketServer = (socket: Socket) => {
   socket.on('joinRoom', (id: string) => {
      console.log(`${socket.id} joined room ${id}`);
      socket.join(id);
   })

   socket.on("leaveRoom", (id: string) => {
      console.log(`${socket.id} joined room ${id}`);
      socket.leave(id);
   })

   socket.on('disconnect', () => {
      console.log(`${socket.id} disconnected`);
   });
};
