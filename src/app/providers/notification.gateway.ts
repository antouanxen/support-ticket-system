import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Subject, takeUntil } from "rxjs";
import { Server } from "socket.io";
import { NotificationService } from "./notification.service";
import { OnModuleDestroy } from "@nestjs/common";

@WebSocketGateway()
export class NotificationGateway implements OnModuleDestroy {
  @WebSocketServer()
  // φτιαχνω ενα server για να μπορω να κανω αναμεταδοση
  private server: Server;

  // φτιαχνω εδω ενα αδειο Subject() για να μπορω αφου τελειωσω να καθαρισω τα υπολοιπα δεδομενα απο τον κωδικα της nest
  private destroy$ = new Subject<void>();

  constructor(private readonly notificationService: NotificationService) {
    // στον constructor της ιδιας της κλασης, παιρνω ολα τα δεδομενα απο το Subject που περιεχει τις ειδοποιησεις
    this.notificationService.notifications$

      // εφοσον περασει το response σε πρωτο χρονο, θελω με καποιο τροπο να καθαρισω το δεδομενα, αυτο θα γινει με τη βοηθεια του destroy$, το οποιο παιρνει τη θεση του notifications$
      .pipe(takeUntil(this.destroy$))

      // με το subscribe() κανω εκπομπη ολα τα δεδομενα που εχω μαζεψει στο Subject
      .subscribe({
        // στη περιπτωση που προχωρησει η απαντηση, κανω broadcast τις ειδοποιησεις
        next: async (notification) => {
          await this.broadcastNotification(notification);
        },
        error: (err) => console.log("Error broadcasting notification:", err),
      });
  }

  // εδω κανω την αναμεταδοση, με emit('το event', την ιδια την ειδοποιηση), και επειτα log-αρω
  public async broadcastNotification(notification: any): Promise<void> {
    this.server.emit("new-notification", notification);
    console.log("Nέα ειδοποίηση: ", notification.content);
  }

  // με τη βοηθεια του onmoduleDestroy(), οταν ερθει η ωρα του this.destroy$ θα παρει τη θεση του notifications$ και επειτα θα γινει complete() για να καθαρισει και τον υπολοιπο κωδικα.
  onModuleDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
