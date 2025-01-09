import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Notification_action } from "../enums/notification_action.enum";
import prisma from "prisma/prisma_Client";
import { AuthRoles } from "src/authentication/enums/roles.enum";
import { Notification_ownAction } from "../enums/notification_ownAction.enum";
import { audit, Subject } from "rxjs";
import { Notification } from "../interface/notification.interface";

@Injectable()
export class NotificationService {
  // φτιαχνω ενα Subject, με ενα interface Notification για type safe αργοτερα στο κωδικα, το οποιο να χρησιμοποιησω ως Observable για τις ειδοποιησεις σε live χρονο
  public notifications$ = new Subject<Notification>();

  constructor(private readonly reflector: Reflector) {}

  // η βασικη μεθοδο της κλασης με ολες τις ενεργειες μεσα, στο τελος θα τη καλεσω στον interceptor που εχω φτιαξει
  public async spreadNotifications(action: Notification_action | Notification_ownAction, customTicketId: string, userId: string, engineer_name: string) {
    // βρισκω τους υπολοιπους χρηστες αποδεκτες
    const usersListeners = await this.getUsersToNotify(action as Notification_action, userId, engineer_name);

    // βρισκω το χρηστη που κανει την ενεργεια αναλογα το userId
    const userWhoActed = await prisma.user.findUnique({
      where: { userId: userId },
    });

    // φτιαχνω ενα νεο Set<string> για να μπορω μετα να κανω το φιλτραρισμα αναλογα με το υπαρχον content που εχει να κανει σχεση με το ιδιο το action
    const NotificationsSent: Set<string> = new Set();

    // με μια Promise.all περιμενω να παρω πισω με τη μια ολους τους αποδεκτες + και τον ιδιο το χρηστη, κανοντας τους map
    const notifications = await Promise.all(
      usersListeners.map(async (userListener) => {
        let content: string;

        // ρυθμιζω αναλογα το action τις ενεργειες του χρηστη για να παρω το content, μενοντας type safe με Οbject.values/includes
        if (Object.values(Notification_ownAction).includes(
            action as Notification_ownAction,
          )
        ) {
          content = await this.createNotificationOwnContent(action as Notification_ownAction, customTicketId, engineer_name);

          // εφοσον θελω να γυρισω μια φορα το content στον ιδιο το χρηστη που κανει την ενεργεια, χρησιμοποιω τις δυνατοτητες του Set()
          if (content.startsWith("you")) {
            // εφοσον ξεκιναει ενα content με 'you', ελεγχω εαν το Set περιεχει ηδη το συγκεκριμενο content, εαν ναι, γυρναω null για να το φιλτραρω στο τελος αργοτερα
            if (NotificationsSent.has(content)) {
              return null;
            }
            // προσθετω το content, πριν γυρισει στον επομενο κυκλο του map, και περασει απο την απο πανω if()
            NotificationsSent.add(content);
          }
        } else {
          // δημιουργω και αποθηκευω το content για τις ειδοποιησεις των υπολοιπων χρηστων
          content = await this.createNotificationContent(action as Notification_action, customTicketId, userWhoActed.userId, engineer_name);
        }

        // φτιαχνω στη βαση το notification, σε περιπτωση που θελω να το κανω fetch στο μελλον
        const newNotification = await prisma.notification.create({
          data: {
            action: userId
              ? (action as Notification_action)
              : (action as Notification_ownAction),
            content: content,
            customTicketId: customTicketId ? customTicketId : null,
            userActed: userWhoActed.userId,
            notification_listeners: {
              create: { userId: userListener.userId },
            },
          },
        });

        // προσθετω με τη next() της Rxjs την καινουργια ειδοποιηση και επειτα τη γυρναω
        this.notifications$.next(newNotification);
        return newNotification;
      }),
    );
    // φιλτραρω τις ειδοποιησεις που εχουν γυρισει null απο το Set()
    const clearNotifications = notifications.filter(
      (notification) => notification !== null,
    );

    // γυρναω ολες τις υπολοιπες ειδοποιησεις
    return clearNotifications;
  }

  // δημιουργω εδω το content για τους υπολοιπους χρηστες που θα λαμβανουν το notification απο τον χρηστη που εκανε την ενεργεια, με ενα enum για επικυρωση
  public async createNotificationContent(
    action: Notification_action,
    customTicketId: string,
    userId: string,
    engineer_name: string
  ) {
    let content = "";

    // βρισκω τον χρηστη και το ticket απο το customTicketId
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: { userName: true },
    });
    const ticket = await prisma.ticket.findUnique({
      where: { customTicketId: customTicketId },
      select: { customTicketId: true },
    });

    // διαφοροποιωντας αναλογα το action με μια switch case
    switch (action) {
      case Notification_action.ADDED_ATTACHMENT:
        content = `${user.userName} ${Notification_action.ADDED_ATTACHMENT} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.ADDED_COMMENT:
        content = `${user.userName} ${Notification_action.ADDED_COMMENT} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.ASSIGNED_ENGINEER:
        content = `${user.userName} ${Notification_action.ASSIGNED_ENGINEER} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.CANCELLED_TICKET:
        content = `${user.userName} ${Notification_action.CANCELLED_TICKET}: ${ticket.customTicketId}`;
        break;
      case Notification_action.CREATED_DEPENDENT:
        content = `${user.userName} ${Notification_action.CREATED_DEPENDENT} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.CREATED_TICKET:
        content = `${user.userName} ${Notification_action.CREATED_TICKET}: ${ticket.customTicketId}`;
        break;
      case Notification_action.REMOVED_ATTACHMENT:
        content = `${user.userName} ${Notification_action.REMOVED_ATTACHMENT} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.REMOVED_ENGINEER:
        content = `${user.userName} ${Notification_action.REMOVED_ENGINEER} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.RE_OPEN_TICKET:
        content = `${user.userName} ${Notification_action.RE_OPEN_TICKET}: ${ticket.customTicketId}`;
        break;
      case Notification_action.RESOLVED_TICKET:
        content = `${user.userName} ${Notification_action.RESOLVED_TICKET}: ${ticket.customTicketId}`;
        break;
      case Notification_action.UPDATED_ATTACHMENT:
        content = `${user.userName} ${Notification_action.UPDATED_ATTACHMENT} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.UPDATED_CATEGORY:
        content = `${user.userName} ${Notification_action.UPDATED_CATEGORY} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.UPDATED_PRIORITY:
        content = `${user.userName} ${Notification_action.UPDATED_PRIORITY} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.UPDATED_ENGINEER_STATS:
          content = `${Notification_action.UPDATED_ENGINEER_STATS}: ${engineer_name}`;
        break;
      case Notification_action.UPDATED_DUE_DATE:
        content = `${user.userName} ${Notification_action.UPDATED_DUE_DATE} ticket: ${ticket.customTicketId}`;
        break;
      case Notification_action.UPDATED_STATUS:
        content = `${user.userName} ${Notification_action.UPDATED_STATUS} ticket: ${ticket.customTicketId}`;
        break;
    }

    return content;
  }

  // δημιουργω το content, αναλογα το action του ιδιου του χρηστη, και επικυρωνοντας με ενα enum
  public async createNotificationOwnContent(
    action: Notification_ownAction,
    customTicketId: string,
    engineer_name: string
  ) {
    let content = "";

    // διαχωριζοντας με μια switch case
    switch (action) {
      case Notification_ownAction.ADDED_ATTACHMENT:
        content = `${Notification_action.ADDED_ATTACHMENT} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.ADDED_COMMENT:
        content = `${Notification_ownAction.ADDED_COMMENT} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.ASSIGNED_ENGINEER:
        content = `${Notification_ownAction.ASSIGNED_ENGINEER} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.CANCELLED_TICKET:
        content = `${Notification_ownAction.CANCELLED_TICKET}: ${customTicketId}`;
        break;
      case Notification_ownAction.CREATED_DEPENDENT:
        content = `${Notification_ownAction.CREATED_DEPENDENT} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.CREATED_TICKET:
        content = `${Notification_ownAction.CREATED_TICKET}: ${customTicketId}`;
        break;
      case Notification_ownAction.REMOVED_ATTACHMENT:
        content = `${Notification_ownAction.REMOVED_ATTACHMENT} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.REMOVED_ENGINEER:
        content = `${Notification_ownAction.REMOVED_ENGINEER} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.RE_OPEN_TICKET:
        content = `${Notification_ownAction.RE_OPEN_TICKET}: ${customTicketId}`;
        break;
      case Notification_ownAction.RESOLVED_TICKET:
        content = `${Notification_ownAction.RESOLVED_TICKET}: ${customTicketId}`;
        break;
      case Notification_ownAction.UPDATED_ATTACHMENT:
        content = `${Notification_ownAction.UPDATED_ATTACHMENT} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.UPDATED_CATEGORY:
        content = `${Notification_ownAction.UPDATED_CATEGORY} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.UPDATED_PRIORITY:
          content = `${Notification_ownAction.UPDATED_PRIORITY} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.UPDATED_ENGINEER_STATS:
          content = `${Notification_ownAction.UPDATED_ENGINEER_STATS}: ${engineer_name}`;
        break;
      case Notification_ownAction.UPDATED_DUE_DATE:
        content = `${Notification_ownAction.UPDATED_DUE_DATE} ticket: ${customTicketId}`;
        break;
      case Notification_ownAction.UPDATED_STATUS:
        content = `${Notification_ownAction.UPDATED_STATUS} ticket: ${customTicketId}`;
        break;
    }

    return content;
  }

  // με τη μεθοδο εδω παιρνω ολους τους users/αποδεκτες εκτος του ιδιου του user που κανει την ενεργεια
  public async getUsersToNotify(action: Notification_action, userId: string, engineer_name: string) {
    const usersToNotify = await prisma.user.findMany({
      where: { userId: { not: userId } },
      include: { role: { select: { role_description: true } } },
    });

    // ρυθμιση αναλογα το action, τους αποδεκτες του notification
    if (action === Notification_action.REMOVED_ENGINEER) {
      const permittedUsers = usersToNotify.filter(
        (user) => user.role.role_description === AuthRoles.ADMIN,
      );

      return permittedUsers;
    } else if (action === Notification_action.UPDATED_ENGINEER_STATS) {
      const permittedUsers = usersToNotify.filter(
        (user) => (user.role.role_description === AuthRoles.ADMIN || AuthRoles.MODERATOR || AuthRoles.SUPERVISOR || AuthRoles.TEAM_LEADER_ENG) &&
        (user.userName === engineer_name)
      )

      return permittedUsers
    }

    return usersToNotify;
  }
}
