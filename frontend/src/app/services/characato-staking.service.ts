import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ethers } from 'ethers';
import { Web3Service } from './web3.service';

export interface StakingInfo {
  totalStaked: string;
  rewardRate: number;
  minimumStakeAmount: string;
  lockPeriod: number;
  rewardPool: string;
  isPaused: boolean;
}

export interface UserStakingInfo {
  stakedAmount: string;
  pendingReward: string;
  lastStakeTime: number;
  timeUntilUnlock: number;
  canUnstake: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CharacatoStakingService {
  
  // Direcciones de contratos por red
  private readonly STAKING_CONTRACT_ADDRESSES: { [key: number]: string } = {
    1337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // Localhost
    11155111: '0xe1757AFA916B83B6115D9D386ff162b3cCfE1558' // Sepolia
  };
  
  // ABI del contrato CharacatoStaking (versión simplificada)
  private readonly STAKING_ABI = [
    // Funciones de lectura
    "function totalStaked() view returns (uint256)",
    "function rewardRate() view returns (uint256)",
    "function minimumStakeAmount() view returns (uint256)",
    "function lockPeriod() view returns (uint256)",
    "function rewardPool() view returns (uint256)",
    "function paused() view returns (bool)",
    "function stakes(address) view returns (uint256, uint256, uint256)",
    "function pendingRewards(address) view returns (uint256)",
    "function getStakeInfo(address) view returns (uint256, uint256, uint256, uint256)",
    
    // Funciones de escritura
    "function stake(uint256 amount)",
    "function unstake(uint256 amount)",
    "function claimRewards()",
    
    // Funciones de administración
    "function updateRewardRate(uint256 newRate)",
    "function fundRewardPool(uint256 amount)",
    "function updateMinimumStakeAmount(uint256 newMinimum)",
    "function updateLockPeriod(uint256 newLockPeriod)",
    "function pause()",
    "function unpause()",
    
    // Eventos
    "event Staked(address indexed user, uint256 amount)",
    "event Unstaked(address indexed user, uint256 amount)",
    "event RewardClaimed(address indexed user, uint256 reward)"
  ];

  private contractAddress: string = '';
  private contract: ethers.Contract | null = null;
  
  private stakingInfoSubject = new BehaviorSubject<StakingInfo | null>(null);
  private userStakingInfoSubject = new BehaviorSubject<UserStakingInfo | null>(null);
  
  public stakingInfo$ = this.stakingInfoSubject.asObservable();
  public userStakingInfo$ = this.userStakingInfoSubject.asObservable();

  constructor(private web3Service: Web3Service) {
    // Suscribirse a cambios de wallet
    this.web3Service.walletInfo$.subscribe(walletInfo => {
      if (walletInfo.isConnected && this.contractAddress) {
        this.initializeContract();
        this.loadStakingInfo();
        this.loadUserStakingInfo();
      }
    });
  }

  /**
   * Configurar chain ID y dirección del contrato
   */
  public setChainId(chainId: number): void {
    const address = this.STAKING_CONTRACT_ADDRESSES[chainId];
    if (address) {
      this.setContractAddress(address);
    } else {
      console.warn(`No hay dirección de contrato de staking configurada para chainId: ${chainId}`);
    }
  }

  /**
   * Configurar dirección del contrato de staking
   */
  public setContractAddress(address: string): void {
    // Asegurar que la dirección tenga el checksum correcto
    this.contractAddress = ethers.getAddress(address);
    if (this.web3Service.getProvider()) {
      this.initializeContract();
      this.loadStakingInfo();
      this.loadUserStakingInfo();
    }
  }

  /**
   * Inicializar contrato
   */
  private initializeContract(): void {
    const provider = this.web3Service.getProvider();
    if (!provider || !this.contractAddress) {
      return;
    }

    this.contract = new ethers.Contract(
      this.contractAddress,
      this.STAKING_ABI,
      provider
    );
  }

  /**
   * Obtener contrato con signer
   */
  private getContractWithSigner(): ethers.Contract {
    const signer = this.web3Service.getSigner();
    if (!signer || !this.contract) {
      throw new Error('Wallet no conectado o contrato no inicializado');
    }
    return this.contract.connect(signer) as ethers.Contract;
  }

  /**
   * Cargar información general del staking
   */
  public async loadStakingInfo(): Promise<void> {
    try {
      if (!this.contract) {
        return;
      }

      const [totalStaked, rewardRate, minimumStakeAmount, lockPeriod, rewardPool, isPaused] = 
        await Promise.all([
          this.contract['totalStaked'](),
          this.contract['rewardRate'](),
          this.contract['minimumStakeAmount'](),
          this.contract['lockPeriod'](),
          this.contract['rewardPool'](),
          this.contract['paused']()
        ]);

      this.stakingInfoSubject.next({
        totalStaked: ethers.formatEther(totalStaked),
        rewardRate: Number(rewardRate),
        minimumStakeAmount: ethers.formatEther(minimumStakeAmount),
        lockPeriod: Number(lockPeriod),
        rewardPool: ethers.formatEther(rewardPool),
        isPaused
      });

    } catch (error) {
      console.error('Error cargando información de staking:', error);
      throw error;
    }
  }

  /**
   * Cargar información de staking del usuario
   */
  public async loadUserStakingInfo(): Promise<void> {
    try {
      if (!this.contract) {
        return;
      }

      const signer = this.web3Service.getSigner();
      if (!signer) {
        return;
      }

      const userAddress = await signer.getAddress();
      const stakeInfo = await this.contract['getStakeInfo'](userAddress);

      const stakedAmount = ethers.formatEther(stakeInfo[0]);
      const pendingReward = ethers.formatEther(stakeInfo[1]);
      const lastStakeTime = Number(stakeInfo[2]);
      const timeUntilUnlock = Number(stakeInfo[3]);

      this.userStakingInfoSubject.next({
        stakedAmount,
        pendingReward,
        lastStakeTime,
        timeUntilUnlock,
        canUnstake: timeUntilUnlock === 0
      });

    } catch (error) {
      console.error('Error cargando información de staking del usuario:', error);
      throw error;
    }
  }

  /**
   * Hacer staking de tokens
   */
  public async stake(amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['stake'](amountWei);
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadStakingInfo();
        this.loadUserStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error en staking:', error);
      throw error;
    }
  }

  /**
   * Retirar tokens del staking
   */
  public async unstake(amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['unstake'](amountWei);
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadStakingInfo();
        this.loadUserStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error en unstaking:', error);
      throw error;
    }
  }

  /**
   * Reclamar recompensas
   */
  public async claimRewards(): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      
      const tx = await contract['claimRewards']();
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadStakingInfo();
        this.loadUserStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error reclamando recompensas:', error);
      throw error;
    }
  }

  /**
   * Actualizar tasa de recompensas (solo owner)
   */
  public async updateRewardRate(newRate: number): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      
      const tx = await contract['updateRewardRate'](newRate);
      
      tx.wait().then(() => {
        this.loadStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error actualizando tasa de recompensas:', error);
      throw error;
    }
  }

  /**
   * Financiar pool de recompensas (solo owner)
   */
  public async fundRewardPool(amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['fundRewardPool'](amountWei);
      
      tx.wait().then(() => {
        this.loadStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error financiando pool de recompensas:', error);
      throw error;
    }
  }

  /**
   * Actualizar monto mínimo de staking (solo owner)
   */
  public async updateMinimumStakeAmount(amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['updateMinimumStakeAmount'](amountWei);
      
      tx.wait().then(() => {
        this.loadStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error actualizando monto mínimo:', error);
      throw error;
    }
  }

  /**
   * Actualizar período de bloqueo (solo owner)
   */
  public async updateLockPeriod(periodInDays: number): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const periodInSeconds = periodInDays * 24 * 60 * 60;
      
      const tx = await contract['updateLockPeriod'](periodInSeconds);
      
      tx.wait().then(() => {
        this.loadStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error actualizando período de bloqueo:', error);
      throw error;
    }
  }

  /**
   * Pausar staking (solo owner)
   */
  public async pauseStaking(): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      
      const tx = await contract['pause']();
      
      tx.wait().then(() => {
        this.loadStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error pausando staking:', error);
      throw error;
    }
  }

  /**
   * Reanudar staking (solo owner)
   */
  public async unpauseStaking(): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      
      const tx = await contract['unpause']();
      
      tx.wait().then(() => {
        this.loadStakingInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error reanudando staking:', error);
      throw error;
    }
  }

  /**
   * Obtener APY calculado
   */
  public calculateAPY(): number {
    const stakingInfo = this.stakingInfoSubject.value;
    if (!stakingInfo) {
      return 0;
    }

    // Convertir basis points a porcentaje anual
    const dailyRate = stakingInfo.rewardRate / 10000; // basis points to decimal
    const annualRate = dailyRate * 365; // anualizar
    return annualRate * 100; // convertir a porcentaje
  }

  /**
   * Formatear tiempo restante hasta desbloqueo
   */
  public formatTimeUntilUnlock(seconds: number): string {
    if (seconds <= 0) {
      return 'Disponible para retirar';
    }

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Calcular recompensas estimadas por día
   */
  public calculateDailyRewards(stakedAmount: string): string {
    const stakingInfo = this.stakingInfoSubject.value;
    if (!stakingInfo || !stakedAmount) {
      return '0';
    }

    const amount = parseFloat(stakedAmount);
    const dailyRate = stakingInfo.rewardRate / 10000;
    const dailyReward = amount * dailyRate;

    return dailyReward.toFixed(4);
  }

  /**
   * Obtener información actual de staking
   */
  public getCurrentStakingInfo(): StakingInfo | null {
    return this.stakingInfoSubject.value;
  }

  /**
   * Obtener dirección del contrato de staking
   */
  public getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Obtener información actual de staking del usuario
   */
  public getCurrentUserStakingInfo(): UserStakingInfo | null {
    return this.userStakingInfoSubject.value;
  }
}
