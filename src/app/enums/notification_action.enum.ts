// creating the notification content, based on the action, sent to all the other users who are meant to see that action
export enum Notification_action {
  CREATED_TICKET = "created a ticket",
  RE_OPEN_TICKET= "re-opened a ticket",
  RESOLVED_TICKET = "resolved the ticket",
  CANCELLED_TICKET = "cancelled the ticket",
  UPDATED_CATEGORY = "updated the category of",
  UPDATED_STATUS = "updated the status of",
  UPDATED_PRIORITY = "updated the priority of",
  ADDED_COMMENT = "added a comment to",
  CREATED_DEPENDENT = "created a ticket dependent on",
  ASSIGNED_ENGINEER = "has assigned an engineer to",
  UPDATED_ENGINEER_STATS = "has updated the stats of the engineer",
  REMOVED_ENGINEER = "removed the assigned engineer from",
  UPDATED_DUE_DATE = "updated the due date of",
  ADDED_ATTACHMENT = "added an attachment to",
  UPDATED_ATTACHMENT = "updated an attachment on",
  REMOVED_ATTACHMENT = "removed an attachment from",
}
