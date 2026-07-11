import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { Observable } from "rxjs";
import { SUREBET_EVENTS_CHANNEL, type SurebetLiveEvent } from "@rataria/shared";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private subscriber!: Redis;

  onModuleInit(): void {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.client = new Redis(url);
    this.subscriber = new Redis(url);
    void this.subscriber.subscribe(SUREBET_EVENTS_CHANNEL);
  }

  onModuleDestroy(): void {
    this.client.disconnect();
    this.subscriber.disconnect();
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  /** Stream de eventos de oportunidade publicados pelo worker. */
  liveEvents(): Observable<SurebetLiveEvent> {
    return new Observable((observer) => {
      const handler = (channel: string, message: string) => {
        if (channel !== SUREBET_EVENTS_CHANNEL) return;
        try {
          observer.next(JSON.parse(message) as SurebetLiveEvent);
        } catch {
          // mensagem malformada é ignorada com registro implícito no worker
        }
      };
      this.subscriber.on("message", handler);
      return () => this.subscriber.off("message", handler);
    });
  }
}
