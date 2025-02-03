// eslint-disable-next-line prettier/prettier
import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from "../dtos/create-ticket.dto";
import { ticket } from "@prisma/client";
import prisma from "prisma/prisma_Client";
import { UpdateTicketStatusDto } from "../dtos/update-ticket.dto";
import { Status } from "../enum/status.enum";
import { MetricsService } from "./metrics.service";
import { CommentsService } from "src/comments/provider/comments.service";
import { AddCommentDto } from "src/comments/dtos/add_comment.dto";
import { SortTicketsDto } from "../dtos/sort-tickets.dto";
import { CategoryService } from "src/category/provider/category.service";
import { CustomerService } from "src/customer/provider/customer.service";
import { NewTicketEmailData } from "src/mailer/interfaces/NewTicketeEmailData.interface";
import { EngineerService } from "src/engineer/provider/engineer.service";
import { MailService } from "src/mailer/provider/mail.service";
import { DependentTicketService } from "./dependent-ticket.service";
import { GenerateCustomTicketIdService } from "./generate-custom-ticket-id.service";
import { AssignTicketsByCatToEngsService } from "./assign-tickets-by-cat-to-engs.service";
import { isUUID } from "class-validator";
import { AuthRoles } from 'src/authentication/enums/roles.enum';
import { PaginationService } from 'src/pagination/provider/pagination.service';
import { Paginated } from 'src/pagination/interfaces/paginated.interface';

@Injectable()
export class TicketService {
  constructor(
    private readonly metricsService: MetricsService,
    @Inject(forwardRef(() => CommentsService) )
    private readonly commentsService: CommentsService,
    private readonly categoryService: CategoryService,
    private readonly customerService: CustomerService,
    @Inject(forwardRef(() => EngineerService))
    private readonly engineerService: EngineerService,
    private readonly dependentTicketService: DependentTicketService,
    private readonly mailService: MailService,
    private readonly generateCustomTicketIdService: GenerateCustomTicketIdService,
    private readonly assignTicketsByCatToEngsService: AssignTicketsByCatToEngsService,
    private readonly paginationService: PaginationService,
  ) {}

  public async createTicket(createTicketDto: CreateTicketDto, userId: string): Promise<ticket> {
    const {
      c_name,
      issue_description,
      priority,
      categoryName,
      file_description,
      file_id,
      due_date,
      dependent_ticketCustomId,
      engineerIds,
    } = createTicketDto;

    const userAgent = await prisma.user.findUnique({
      where: { userId: userId },
    });

    if (!userAgent) throw new NotFoundException("User does not exist");

    const customer = await this.customerService.getSingleCustomerByName(c_name);
    const category = await this.categoryService.getSingleCategoryByName(categoryName);
    const customTicketId = await this.generateCustomTicketIdService.generateCustomTicketId(categoryName);

    try {
      const newTicket = await prisma.ticket.create({
        data: {
          customerId: customer.id,
          userAgentId: userAgent.userId,
          issue_description: issue_description,
          priority: priority,
          categoryId: category.id,
          due_date: due_date ? due_date : null,
          status: Status.PENDING,
          customTicketId: customTicketId,
        },
        include: { customer: true },
      });

      // Έλεγχος dependent ticket
      if (dependent_ticketCustomId) {
        const dependent_ticket = await prisma.ticket.findUnique({
          where: { customTicketId: dependent_ticketCustomId },
        });

        if (!dependent_ticket)
          throw new NotFoundException("Dependent ticket was not found");
        if (newTicket.customTicketId === dependent_ticket.customTicketId)
          throw new BadRequestException("A ticket cannot depend on itself.");

        await this.dependentTicketService.getDependentTicket(
          newTicket.customTicketId,
          dependent_ticket.customTicketId,
        );
      } else {
        console.log("Δεν χρειαστηκε να φτιαχτει καποια σχεση μεταξυ tickets");
      }

      // Έλεγχος και ανάθεση engineers
      if (Array.isArray(engineerIds) && engineerIds.every((id) => isUUID(id))) {
        await this.assignTicketToEng(newTicket.customTicketId, engineerIds, userId);
      } else if (engineerIds === undefined) {
        console.log(`Δεν βρεθηκε engineer, προχωραει η αυτοματη αναθεση αναλογα το priority level`);
        const availableEngs = await this.assignTicketsByCatToEngsService.assignTicketsByCatToEngs(priority, categoryName, newTicket.id);

        if (availableEngs === undefined) {
          console.log("Δεν έγινε αυτόματη ανάθεση.");
          return newTicket;
        } else {
          await Promise.all(
            availableEngs.map(async (engineer) => await this.engineerService.getEngineerTicket(newTicket.customTicketId, engineer.userId)),
          );
          console.log("Εγινε αυτοματα η αναθεση");
        }
      } else {
        throw new BadRequestException("The ID of the engineer was wrong");
      }

        // Αν υπάρχει αρχείο, το συνδέουμε με το ticketId
      if (file_id) {
        const fileForTicket = await prisma.file.update({
            where: { file_id: file_id },
            data: {
                ticketId: newTicket.id,
                description: file_description || "",
                userName: userAgent.userName, 
            },
        });
        console.log("File successfully linked to ticket:", fileForTicket);
      } else {
        console.log("No file was provided for this ticket.");
      }

      return newTicket;
    } catch (err) {
      if (err instanceof NotFoundException) {
        console.log("Dependent ticket or engineer was not found:", err.message);
        await prisma.ticket.delete({
          where: { customTicketId: customTicketId },
        });
        throw err;
      } else if (err instanceof BadRequestException) {
        console.log("There was an error with the database:", err.message);
        await prisma.ticket.delete({
          where: { customTicketId: customTicketId },
        });
        throw err;
      }
      console.log("ticket was not created", err);
      await prisma.ticket.delete({ where: { customTicketId: customTicketId } });
      throw new InternalServerErrorException("There was an error with the server. Try again");
    }
  }

  public async assignTicketToEng(customTicketId: string, engineerIds: string[], userId: string) {
    const agent = await prisma.user.findUnique({
      where: { userId: userId },
    });

    if (!agent) throw new NotFoundException("User does not exist");

    const ticket = await prisma.ticket.findFirst({
      where: { customTicketId: customTicketId, cancelled_date: null },
      include: { customer: true },
    });

    if (!ticket) throw new NotFoundException("Ticket does not exist");

    if (engineerIds.length > 0 && engineerIds.every((id) => isUUID(id))) {
      try {
        const userEngineers = await prisma.user.findMany({
          where: {
            userId: {
              in: Array.isArray(engineerIds) ? engineerIds : [engineerIds],
            },
          },
          select: {
            userId: true, userName: true, userEmail: true, 
          },
        });

        if (!userEngineers || userEngineers.length !== engineerIds.length) {
          throw new BadRequestException("Some of the provided engineers do not exist in the database");
        }

        const existingAssignments = await Promise.all(userEngineers.map(async (userEngineer) => {
          return await prisma.assigned_engineers.findUnique({
              where: {
                ticketCustomId_userEngineerId: {
                  userEngineerId: userEngineer.userId,
                  ticketCustomId: ticket.customTicketId,
                }
              },
              include: { user: { select: { userName: true } } } 
            });
        }));
        
        const alreadyAssignedEngineers = userEngineers.filter((_, index) => existingAssignments[index] !== null)
        
        if (alreadyAssignedEngineers.length > 0) {
          const userNames = existingAssignments.map(eng => eng?.user?.userName).join(', ')
          throw new ConflictException(`Ticket is already assigned to the following engineer(s): ${userNames}. Pick a different one`);
        } 

        await Promise.all(userEngineers.map(async (userEngineer) => {
          await this.engineerService.getEngineerTicket(ticket.customTicketId, userEngineer.userId);

          const newTicketEmailData: NewTicketEmailData = {
            engineer_email: userEngineer.userEmail,
            engineer_name: userEngineer.userName,
            newTicket_id: ticket.id,
            c_name: ticket.customer.c_name,
            issue_description: ticket.issue_description,
            priority: ticket.priority,
          };
  
          await this.mailService.sendEmailForNewTicket(newTicketEmailData);
          console.log("πηγε το εμαιλ για το νεο ticket");
          console.log(`Φτιαχτηκε μια σχεση με τον engineer με ID: ${userEngineer.userId} και το ticket με ID: ${ticket.customTicketId}`)
        }))
       
        return true;
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        else if (err instanceof NotFoundException) throw err;
        else if (err instanceof ConflictException) throw err;
       
        console.log("ticket was not created due to engineer assignment issue", err);
        throw new InternalServerErrorException("There was an error with the server. Try again");
      }
    } else {
      throw new BadRequestException("Engineer IDs should be an array and not empty");
    }
  }

  public async unAssignTicketFromEng(customTicketId: string, engineerIds: string[], userId: string) {
    const agent = await prisma.user.findUnique({
      where: { userId: userId }
    })

    if (!agent) throw new NotFoundException('User does not exist')

    const ticket = await prisma.ticket.findFirst({
      where: { customTicketId: customTicketId, cancelled_date: null }
    })

    if (!ticket) throw new NotFoundException('Ticket does not exist')

    if (engineerIds.length > 0 && engineerIds.every((id) => isUUID(id))) {
      try {
        const userEngineers = await prisma.user.findMany({
          where: {
            userId: {
              in: Array.isArray(engineerIds) ? engineerIds : [engineerIds],
            },
          },
          select: {
            userId: true, userName: true, userEmail: true 
          },
        });

        if (!userEngineers || userEngineers.length !== engineerIds.length) {
          throw new BadRequestException("Some of the provided engineers do not exist in the database");
        }

        const engineersToBeUnassigned = await Promise.all(userEngineers.map(async (userEngineer) => {
          return await prisma.assigned_engineers.delete({
            where: {
              ticketCustomId_userEngineerId: {
                userEngineerId: userEngineer.userId,
                ticketCustomId: ticket.customTicketId
              }
            },
            select: {
              user: {
                select: { 
                  userId: true, userName: true, userEmail: true 
                } 
              } 
            }
          })
        }))

        if (engineersToBeUnassigned.length > 0) {
          const unAssignmentLogs = engineersToBeUnassigned.map(userEngineer => userEngineer.user.userName).join(', ')
          console.log(`You have unassigned the following engineer/s: ${unAssignmentLogs} from ticket ${ticket.customTicketId}`)

          return `You have unassigned the following engineer/s: ${unAssignmentLogs} from ticket ${ticket.customTicketId}`
        }
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err
        if (err instanceof BadRequestException) throw err

        console.log("the unassignement was failed due to server issue", err);
        throw new InternalServerErrorException("There was an error with the server. Try again");
      }
    }
  }

  public async getAllTickets(sortTicketsDto: SortTicketsDto, userId: string) {
    const agent = await prisma.user.findFirst({
      where: { userId: userId, role: { role_description: { notIn: [AuthRoles.ENGINEER, AuthRoles.TEAM_LEADER_ENG] } } },
      include: { role: true, category: true }
    });

    const engineerByCategory = await prisma.user.findUnique({
      where: { userId: userId },
      include: { role: true, category: true },
    });

    if (!agent && !engineerByCategory) throw new NotFoundException("User does not exist");

    const categoryId = engineerByCategory?.category?.id;
    const { page, pageSize } = sortTicketsDto

    try {
    /*   const paginatedResponse = await this.paginationService.paginateResults(
        prisma.ticket.count,
        prisma.ticket.findMany,
        { page, pageSize },
        {
          where: agent ? { cancelled_date: null } : { categoryId, cancelled_date: null },
          orderBy: [{ created_at: "desc" }, { customTicketId: "asc" }],
           include: {
            category: true,
            customer: true,
            dependent_tickets_parent: true ,
            dependent_tickets_child: true ,
            assigned_engineers: {
              select: {
                user: {
                  select: {
                    userId: true, userName: true, userEmail: true 
                  },             
                },
              },
            },
            userAgent: {
              select: {
                userId: true, userName: true, userEmail: true 
              },
            },
          } 
        }
      ) */

      const ticketListToBeFound = await prisma.ticket.findMany({
        where: agent ? { cancelled_date: null } : { categoryId, cancelled_date: null },
        orderBy: [{ created_at: "desc" }, { customTicketId: "asc" }],
        include: {
          customer: true,
          category: true,
          dependent_tickets_parent: true,
          dependent_tickets_child: true,
          file: {
            select: {
              publicUrl: true,
            }
          },
          assigned_engineers: {
            select: {
              user: {
                select: {
                  userId: true, userName: true, userEmail: true 
                },             
              },
            },
          },
          userAgent: {
            select: {
               userId: true, userName: true, userEmail: true 
              },
            },
          },
      });

      //const { data: ticketListToBeFound } = paginatedResponse

      const ticketListFound = async (ticketData: typeof ticketListToBeFound) => {
        return await Promise.all(ticketData.map(ticket => {
         return {
            ...ticket,
            file: ticket.file.map(f => f.publicUrl),
            dependent_tickets_child: ticket.dependent_tickets_parent.map(parent => parent.dependentTicketCustomId),
            dependent_tickets_parent: ticket.dependent_tickets_child.map(child => child.ticketCustomId)
          }
        })
      )} 

      const ticketsFetched = await ticketListFound(ticketListToBeFound)

      /* if (ticketsFetched && ticketsFetched.length > 0) {
        return { ...paginatedResponse, data: ticketsFetched };
      } else return { ...paginatedResponse, data: [] };  */
      if (ticketsFetched && ticketsFetched.length > 0) {
        return ticketsFetched;
      } else return []; 
    } catch (err: any) {
      console.log("No tickets were returned", err);
      throw new InternalServerErrorException("There was an error with the server. Try again");
    }
  }

  public async getSingleTicket(customTicketId: string): Promise<ticket> {
    try {
      const singleTicket = await prisma.ticket.findFirst({
        where: { customTicketId: customTicketId, cancelled_date: null },
        include: {
          category: true,
          customer: true,
          comment: { select: { id: true, content: true, created_at: true, user: { select: { userName: true } }, ticket: { select: { customTicketId: true } } } },
          dependent_tickets_parent: true,
          dependent_tickets_child: true,
          file: {
            select: {
              publicUrl: true
            }
          },
          assigned_engineers: {
            select: {
              user: {
                select: {
                  userId: true, userName: true, userEmail: true            
                },
              },
            },
          },
          userAgent: {
            select: {
                userId: true, userName: true, userEmail: true 
              }
            },
          },
      });

      if (!singleTicket) {
        throw new NotFoundException(`Could not find the ticket with customTicketId: ${customTicketId}`);
      }

      const commentForTicket = singleTicket?.comment?.map(com => ({
        id: com.id,
        content: com.content,
        created_at: com.created_at,
        userName: com.user.userName,
        customTicketId: com.ticket.customTicketId,
      }))

      const ticketFetched = {
        ...singleTicket,
        file: singleTicket.file ? singleTicket.file.map(f => f.publicUrl): null,
        comment: singleTicket.comment ? commentForTicket : null,
        dependent_tickets_child: singleTicket.dependent_tickets_parent ? singleTicket.dependent_tickets_parent.map(parent => parent.dependentTicketCustomId) : null,
        dependent_tickets_parent: singleTicket.dependent_tickets_child ? singleTicket.dependent_tickets_child.map(child => child.ticketCustomId) : null
      }

      return ticketFetched;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err

      console.log("Could not find the ticket", err);
      throw new InternalServerErrorException("There was an error with the server. Try again");
    }
  }

  public async updateTicketStatusPriority(updateTicketStatusDto: UpdateTicketStatusDto, userId: string): Promise<ticket> {
    const { customTicketId, status } = updateTicketStatusDto;
    const validStatus = ["pending", "resolved", "in_progress"];

    const agentId = userId;

    if (!agentId) throw new NotFoundException("User does not exist");

    if (!customTicketId) throw new NotFoundException("Ticket ID is required");

    if (!validStatus.includes(status))
      throw new BadRequestException("Cannot use more than one status");

    try {
      const ticketToBeUpdated = await prisma.ticket.findUnique({
        where: { customTicketId: customTicketId },
        include: {
          comment: true,
          dependent_tickets_child: {
            select: { ticketCustomId: true },
          },
          dependent_tickets_parent: {
            select: { dependentTicketCustomId: true },
          },
          assigned_engineers: { select: { userEngineerId: true } },
        },
      });

      if (!ticketToBeUpdated) throw new NotFoundException("Ticket not found");

      if (!ticketToBeUpdated.comment) ticketToBeUpdated.comment = [];

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketToBeUpdated.id },
        data: {
          status: status,
          updated_at: new Date(),
          comment:
            ticketToBeUpdated.comment?.length > 0
              ? {
                  upsert: ticketToBeUpdated.comment.map((comment) => ({
                    where: { id: comment.id || "" },
                    update: { content: comment.content },
                    create: { content: comment.content },
                  })),
                }
              : undefined,
        },
      });
      return updatedTicket;
    } catch (err: any) {
      console.log("Error updating the ticket status", err);
      throw new InternalServerErrorException(
        "Ticket status was not updated due to server error",
      );
    }
  }

  public async addNewCommentForTicket(addCommentDto: AddCommentDto, userId: string) {
    const { content, customTicketId } = addCommentDto;
    const agentId = userId;

    if (!agentId) throw new NotFoundException("User does not exist");

    try {
      const newComment = await this.commentsService.AddComment(
        content,
        customTicketId,
        userId,
      );

      return newComment;
    } catch (err) {
      console.log("Error creating the comment", err);
      throw new InternalServerErrorException("Comment was not created due to server error");
    }
  }

  public async getTicketsMetrics(userId: string): Promise<object | undefined> {
    const agentId = userId;

    if (!agentId) throw new NotFoundException("User does not exist");

    const ticketVolume = await this.metricsService.getTicketVolume();
    const avgResolutionTimeInHours = await this.metricsService.getAverageResolutionTime();
    const pendingTickets = await this.metricsService.getPendingTicketCount();
    const resolvedTickets = await this.metricsService.getResolvedTicketCount();
    const inProgressTickets = await this.metricsService.getInProgressTicketCount();
    const pendingRequests = await this.metricsService.getPendingRequestsCount();
    const approvedRequests = await this.metricsService.getApprovedRequestsCount();
    const rejectedRequests = await this.metricsService.getRejectedRequestsCount();

    return {
      ticketVolume,
      avgResolutionTimeInHours,
      pendingTickets,
      resolvedTickets,
      inProgressTickets,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
    };
  }

  public async cancelTicket(customTicketId: string, userId: string) {
    try {
      const userAgent = await prisma.user.findUnique({
        where: { userId: userId }
      })

      if (!userAgent) throw new NotFoundException('This user does not exist')

      const ticketToGetRemovedTemp = await prisma.ticket.findUnique({
        where: { customTicketId: customTicketId }
      })

      if (!ticketToGetRemovedTemp) throw new NotFoundException('That ticket does not exist')

      const ticketRemovedTemp = await prisma.ticket.update({
        where: { customTicketId: ticketToGetRemovedTemp.customTicketId },
        data: {
          cancelled_date: new Date()
        },
        select: {
          customTicketId: true,
          cancelled_date: true
        }
      })

      return ticketRemovedTemp
    } catch(err: any) {
      if (err instanceof NotFoundException) throw err
      
      console.log(`There was an error soft-removing the ticket ${customTicketId}`)
      throw new InternalServerErrorException(`There was an error soft-removing the ticket ${customTicketId}. Please try again later.`)
    }
  }

  public async re_openTicket(customTicketId: string, userId: string) {
    try {
      const userAgent = await prisma.user.findUnique({
        where: { userId: userId }
      })

      if (!userAgent) throw new NotFoundException('This user does not exist')

      const ticketToGetReOpened = await prisma.ticket.findFirst({
        where: { customTicketId: customTicketId, cancelled_date: { not: null } }
      })

      if (!ticketToGetReOpened) throw new NotFoundException('That ticket does not exist')

      const ticketReOpened = await prisma.ticket.update({
        where: { customTicketId: ticketToGetReOpened.customTicketId },
        data: {
          re_opened_date: new Date()
        },
        select: {
          customTicketId: true,
          cancelled_date: true
        }
      })

      return ticketReOpened
    } catch(err: any) {
      if (err instanceof NotFoundException) throw err
      
      console.log(`There was an error re-opening the ticket ${customTicketId}`)
      throw new InternalServerErrorException(`There was an error re-opening the ticket ${customTicketId}. Please try again later.`)
    }
  }
}
