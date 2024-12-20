
// creating the notification content, based on the action, sent to the user who made that action
export enum Notification_ownAction {
    CREATED_TICKET = 'you created a ticket',
    RESOLVED_TICKET = 'you resolved the ticket',
    CANCELLED_TICKET = 'you cancelled the ticket',
    UPDATED_CATEGORY = 'you updated the category of',
    UPDATED_STATUS = 'you updated the status of',
    ADDED_COMMENT = 'you added a comment',
    CREATED_DEPENDENT = 'you created a ticket dependent on',
    ASSIGNED_ENGINEER = 'you have assigned the engineer',
    REMOVED_ENGINEER = 'you removed the assigned engineer',
    UPDATED_DUE_DATE = 'you updated the due date of',
    ADDED_ATTACHMENT = 'you have added an attachment to',
    UPDATED_ATTACHMENT = 'you updated an attachment on',
    REMOVED_ATTACHMENT = 'you removed an attachment from',
}