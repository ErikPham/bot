import { Client, TextChannel } from 'discord.js';
import { StockManager } from './stockManager';
import { PortfolioTracker } from './portfolioTracker';
import { FollowListTracker } from './followListTracker';

/**
 * Singleton class responsible for scheduling and managing tracking tasks
 */
export class Scheduler {
  private static instance: Scheduler;
  private stockManager: StockManager;
  private portfolioTracker: PortfolioTracker;
  private followListTracker: FollowListTracker;
  private client: Client | null = null;
  private isInitialized: boolean = false;
  
  // Default intervals
  private readonly checkInterval = 1000 * 60 * 2; // 2 minutes
  private readonly summaryInterval = 1000 * 60 * 5; // 5 minutes

  private constructor() {
    this.stockManager = new StockManager('system');
    this.portfolioTracker = new PortfolioTracker(this.stockManager, this.summaryInterval);
    this.followListTracker = new FollowListTracker(this.stockManager, this.checkInterval);
  }

  /**
   * Get the singleton instance of the scheduler
   */
  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  /**
   * Initialize the scheduler with a Discord client
   */
  public async initialize(client: Client): Promise<void> {
    if (this.isInitialized) {
      console.log('Scheduler already initialized');
      return;
    }
    
    this.client = client;
    this.isInitialized = true;
    
    try {
      await this.stockManager.ensureReady();
      console.log('Stock manager ready');
    } catch (error) {
      console.error('Failed to initialize stock manager:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Start the profit and follow list schedulers for all channels
   */
  public async startAllSchedulers(): Promise<void> {
    if (!this.isInitialized || !this.client) {
      throw new Error('Scheduler not initialized. Call initialize() first.');
    }
    
    try {
      const channels = await this.stockManager.getAllChannels();
      console.log(`Starting schedulers for ${channels.length} channels`);
      
      for (const channel of channels) {
        await this.startChannelTracking(channel);
      }
    } catch (error) {
      console.error('Error starting schedulers:', error);
      throw error;
    }
  }
  
  /**
   * Start tracking for a specific channel
   */
  public async startChannelTracking(channel: TextChannel): Promise<void> {
    try {
      console.log(`Starting tracking for channel: ${channel.name}`);
      await this.portfolioTracker.startTracking(channel);
      await this.followListTracker.startTracking(channel);
    } catch (error) {
      console.error(`Error starting tracking for channel ${channel.name}:`, error);
    }
  }
  
  /**
   * Stop tracking for a specific channel
   */
  public stopChannelTracking(channelId: string): void {
    try {
      console.log(`Stopping tracking for channel ID: ${channelId}`);
      this.portfolioTracker.stopTracking(channelId);
      this.followListTracker.stopTracking(channelId);
    } catch (error) {
      console.error(`Error stopping tracking for channel ${channelId}:`, error);
    }
  }

  /**
   * Cleanup and destroy all trackers and connections
   */
  public async destroy(): Promise<void> {
    try {
      this.portfolioTracker.stopAllTracking();
      this.followListTracker.stopAllTracking();
      await this.stockManager.destroy();
      this.isInitialized = false;
      console.log('Scheduler destroyed successfully');
    } catch (error) {
      console.error('Error destroying scheduler:', error);
      throw error;
    }
  }
} 