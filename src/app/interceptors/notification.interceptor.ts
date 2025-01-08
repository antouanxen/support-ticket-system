import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { NotificationService } from '../providers/notification.service';
import { Notification_action } from '../enums/notification_action.enum';
import { Notification_ownAction } from '../enums/notification_ownAction.enum';

@Injectable()
export class NotificationInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private notificationService: NotificationService,
  ) {}

  // τωρα, χρησιμοποιω ενα interceptor για να παιρνω ολα τα metadata πριν περασει απο το request της μεθοδου στον controller, βαση του decorator Αction, και υστερα στελνω την απαντηση 
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // με τον reflector "τραβαω" ολα τα δεδομενα χαρης τον decorator μου που εχει να κανει με τις ενεργειες
    const actionMetadata = this.reflector.get<{ actions: (Notification_action | Notification_ownAction)[] }>('Action', context.getHandler())
    
    // παιρνω ολα τα δεδομεναμε την pipe(), και με την tap() προσθετω εξτρα πραγματα στο response χωρις να το τροποποιω περαιτερω
    return next.handle().pipe(
      tap({
        // σε περιπτωση που προχωρησει το response απο τον itc(interceptor) ελεγχω αν υπαρχουν metadata στο κωδικα της nest
        next: async (mainResponse) => {
          if (actionMetadata) {
            const { actions } = actionMetadata
            
            // σε περιπτωση που υπαρχουν metadata, παιρναω ολες τις ενεργειες που εχω δηλωσει στον decorator με μια Promise.all() για ταυτοχρονη αποκριση
            await Promise.all(actions.map(async action => {
              const request = context.switchToHttp().getRequest()
              const response = context.switchToHttp().getResponse()
              // παιρνω το userId απο res.locals.user? που εχω παρει απο τον Guard
              const userId = request.res.locals.user?.sub

              // υστερα, παιρνω το customTicketId, απο τις παραμετρους/ερωτηματα του request, ή απο το αντικειμενο του response.locals στη περιπτωση που δεν υπαρχει το ticket ακομη
              const customTicketId = request.params?.customTicketId || request.query?.customTicketId || response.locals.ticketCreated?.customTicketId

              // παλι αναλογα το action, δημιουργω τις ειδοποιησεις και για να τις κανω fetch αργοτερα αν το θελω, και τις κανω broadcast με WebSocket για live notifications, στο notification.getaway
              if (Object.values(Notification_action).includes(action as Notification_action)) {
                await this.notificationService.spreadNotifications(action, customTicketId, userId)
              } else {
                await this.notificationService.spreadNotifications(action, customTicketId, userId)
              }
            }));          
          }
          return mainResponse
        },
        //error: (err) => console.log('Πρόβλημα με τις ειδοποιήσεις:', err)
      })
    );
  }

}
