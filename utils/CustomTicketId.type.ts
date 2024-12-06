import { Categories } from "src/category/enums/categories.enum";

export const CustomTicketId: Record<Categories, string> = {
    [Categories.ACCOUNT_ACCESS]: 'AA-',
    [Categories.BILLING]: 'BI-',
    [Categories.COMPLAINT]: 'CO-',
    [Categories.FEEDBACK]: 'FE-',
    [Categories.OTHER]: 'OT-',
    [Categories.TECHNICAL_ISSUE]: 'TI-',
}