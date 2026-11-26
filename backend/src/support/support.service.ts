import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private async requirePlatformAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { id: true, isPlatformAdmin: true },
    });
    if (!user?.isPlatformAdmin) throw new ForbiddenException('Platform support access required');
  }

  private formatMessage(message: {
    id: string; authorId: string; body: string; createdAt: Date;
    author: { fullName: string; isPlatformAdmin: boolean };
  }) {
    return {
      id: message.id, body: message.body,
      createdAt: message.createdAt.toISOString(),
      fromSupport: message.author.isPlatformAdmin,
      senderName: message.author.isPlatformAdmin ? 'KASSA Support' : message.author.fullName,
    };
  }

  async ownThread(userId: string) {
    const thread = await this.prisma.supportThread.findUnique({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }, take: 100,
          include: { author: { select: { fullName: true, isPlatformAdmin: true } } },
        },
      },
    });
    return {
      id: thread?.id ?? null,
      status: thread?.status ?? 'NEW',
      messages: thread?.messages.map(message => this.formatMessage(message)) ?? [],
    };
  }

  async send(userId: string, body: string) {
    const message = body.trim();
    if (!message || message.length > 1000) {
      throw new BadRequestException('Enter a support message of 1 to 1,000 characters');
    }
    const thread = await this.prisma.supportThread.upsert({
      where: { userId }, create: { userId }, update: {},
    });
    const saved = await this.prisma.$transaction(async tx => {
      const posted = await tx.supportMessage.create({
        data: { threadId: thread.id, authorId: userId, body: message },
        include: { author: { select: { fullName: true, isPlatformAdmin: true } } },
      });
      await tx.supportThread.update({ where: { id: thread.id }, data: { status: 'OPEN' } });
      return posted;
    });
    return this.formatMessage(saved);
  }

  async inbox(adminId: string) {
    await this.requirePlatformAdmin(adminId);
    const threads = await this.prisma.supportThread.findMany({
      orderBy: { updatedAt: 'desc' }, take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return threads.map(thread => ({
      id: thread.id,
      status: thread.status,
      updatedAt: thread.updatedAt.toISOString(),
      user: thread.user,
      lastMessage: thread.messages[0] ? {
        body: thread.messages[0].body,
        createdAt: thread.messages[0].createdAt.toISOString(),
      } : null,
    }));
  }

  async threadForAgent(adminId: string, id: string) {
    await this.requirePlatformAdmin(adminId);
    const thread = await this.prisma.supportThread.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' }, take: 200,
          include: { author: { select: { fullName: true, isPlatformAdmin: true } } },
        },
      },
    });
    if (!thread) throw new NotFoundException('Support thread not found');
    return {
      id: thread.id, status: thread.status, user: thread.user,
      messages: thread.messages.map(message => this.formatMessage(message)),
    };
  }

  async reply(adminId: string, id: string, body: string) {
    await this.requirePlatformAdmin(adminId);
    const message = body.trim();
    if (!message || message.length > 1000) {
      throw new BadRequestException('Enter a reply of 1 to 1,000 characters');
    }
    const thread = await this.prisma.supportThread.findUnique({ where: { id }, select: { id: true } });
    if (!thread) throw new NotFoundException('Support thread not found');
    const reply = await this.prisma.$transaction(async tx => {
      const posted = await tx.supportMessage.create({
        data: { threadId: id, authorId: adminId, body: message },
        include: { author: { select: { fullName: true, isPlatformAdmin: true } } },
      });
      await tx.supportThread.update({ where: { id }, data: { status: 'REPLIED' } });
      return posted;
    });
    return this.formatMessage(reply);
  }
}
