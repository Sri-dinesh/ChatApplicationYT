// import { Injectable } from '@angular/core';
// import * as signalR from '@microsoft/signalr';
// import { BehaviorSubject } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class ChatService {

//   public connection : signalR.HubConnection = new signalR.HubConnectionBuilder()
//   .withUrl("http://localhost:5000/chat")
//   .configureLogging(signalR.LogLevel.Information)
//   .build();

//   public messages$ = new BehaviorSubject<any>([]);
//   public connectedUsers$ = new BehaviorSubject<string[]>([]);
//   public messages: any[] = [];
//   public users: string[] = [];

//   constructor() {
//     this.start();
//     this.connection.on("ReceiveMessage", (user: string, message: string, messageTime: string)=>{
//       this.messages = [...this.messages, {user, message, messageTime} ];
//       this.messages$.next(this.messages);
//     });

//     this.connection.on("ConnectedUser", (users: any)=>{
//       this.connectedUsers$.next(users);
//     });
//    }

//   //start connection
//   public async start(){
//     try {
//       await this.connection.start();
//       console.log("Connection is established!")
//     } catch (error) {
//       console.log(error);
//     }
//   }

//   //Join Room
//   public async joinRoom(user: string, room: string){
//     return this.connection.invoke("JoinRoom", {user, room})
//   }


//   // Send Messages
//   public async sendMessage(message: string){
//     return this.connection.invoke("SendMessage", message)
//   }

//   //leave
//   public async leaveChat(){
//     return this.connection.stop();
//   }

// }

import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private readonly hubUrl = "http://localhost:5000/chat";
  public connection: signalR.HubConnection;
  
  public messages$ = new BehaviorSubject<any[]>([]);
  public connectedUsers$ = new BehaviorSubject<string[]>([]);
  private messages: any[] = [];
  private users: string[] = [];

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect() // Enable automatic reconnection
      .build();

    this.registerHandlers();
    this.startConnection();
  }

  // Start connection with retry logic
  private async startConnection(): Promise<void> {
    try {
      await this.connection.start();
      console.log("SignalR connection established!");
    } catch (error) {
      console.error("Error while starting connection:", error);
      setTimeout(() => this.startConnection(), 5000); // Retry logic
    }
  }

  // Register event handlers
  private registerHandlers(): void {
    this.connection.on("ReceiveMessage", (user: string, message: string, messageTime: string) => {
      this.messages = [...this.messages, { user, message, messageTime }];
      this.messages$.next(this.messages);
    });

    this.connection.on("ConnectedUser", (users: string[]) => {
      this.users = users;
      this.connectedUsers$.next(users);
    });

    this.connection.onreconnecting(() => {
      console.warn("Reconnecting to SignalR...");
    });

    this.connection.onclose(async () => {
      console.error("SignalR connection lost. Attempting to reconnect...");
      await this.startConnection();
    });

    this.connection.onreconnected(() => {
      console.log("SignalR reconnected successfully.");
    });
  }

  // Join Room
  public async joinRoom(user: string, room: string): Promise<void> {
    try {
      await this.connection.invoke("JoinRoom", { user, room });
      console.log(`${user} joined room: ${room}`);
    } catch (error) {
      console.error("Error joining room:", error);
    }
  }

  // Send Messages
  public async sendMessage(message: string): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke("SendMessage", message);
        console.log("Message sent:", message);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      console.warn("Cannot send message. Connection is not established.");
    }
  }

  // Leave Chat
  public async leaveChat(): Promise<void> {
    try {
      await this.connection.stop();
      console.log("SignalR connection stopped.");
    } catch (error) {
      console.error("Error while leaving chat:", error);
    }
  }
}
