import { Client, TextChannel } from 'discord.js';
import { StockManager } from './stockManager';
import { PortfolioTracker } from './portfolioTracker';
import { FollowListTracker } from './followListTracker';

export class Scheduler {
  private static instance: Scheduler;
  private stockManager: StockManager;
  private checkInterval = 1000 * 60 * 2;
  private summaryInterval = 1000 * 60 * 5;
  private client: Client | null = null;
  private portfolioTracker: PortfolioTracker;
  private followListTracker: FollowListTracker;

  private constructor() {
    this.stockManager = new StockManager('system');
    this.portfolioTracker = new PortfolioTracker(this.stockManager, this.summaryInterval);
    this.followListTracker = new FollowListTracker(this.stockManager, this.checkInterval);
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public async startProfitScheduler(client: Client): Promise<void> {
    this.client = client;
    try {
      await this.stockManager.ensureReady()
      const channels = await this.stockManager.getAllChannels();
      for (const channel of channels) {
        this.startPriceCheck(channel);
      }
    } catch (error) {
      console.error('Error in profit scheduler:', error);
    }
  }

  public startPriceCheck(channel: TextChannel){
    this.portfolioTracker.startTracking(channel);
    this.followListTracker.startTracking(channel);
  }

  public async destroy(): Promise<void> {
    await this.stockManager.destroy();
  }
} 