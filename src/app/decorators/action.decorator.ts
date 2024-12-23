import { SetMetadata } from "@nestjs/common";
import { Notification_action } from "../enums/notification_action.enum";
import { Notification_ownAction } from "../enums/notification_ownAction.enum";

// φτιαχνω εδω τον decorator για να παιρνω τα δεδομενα
export const Action = (
  actions: (Notification_action | Notification_ownAction)[],
) => {
  console.log(actions);
  return SetMetadata("Action", { actions });
};
