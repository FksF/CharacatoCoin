import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

import { Web3Service, WalletInfo } from '../../services/web3.service';
import { CharacatoCoinService, TokenInfo, UserTokenInfo } from '../../services/characato-coin.service';
import { CharacatoStakingService, StakingInfo, UserStakingInfo } from '../../services/characato-staking.service';

@Component({
  selector: 'app-staking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staking.html',
  styleUrl: './staking.scss'
})
export class Staking implements OnInit, OnDestroy {

  walletInfo: WalletInfo = {
    address: '',
    balance: '0',
    chainId: 0,
    isConnected: false
  };

  tokenInfo: TokenInfo | null = null;
  userTokenInfo: UserTokenInfo | null = null;
  stakingInfo: StakingInfo | null = null;
  userStakingInfo: UserStakingInfo | null = null;

  // Estados de la UI
  loading = false;
  activeTab = 'stake'; // stake, unstake, admin
  statusMessage = '';
  statusType = '';

  // Formularios
  stakeForm = {
    amount: ''
  };

  unstakeForm = {
    amount: ''
  };

  adminForm = {
    rewardRate: '',
    minimumStake: '',
    lockPeriod: '',
    fundAmount: ''
  };

  // Timer para actualizar información
  private updateTimer?: Subscription;
  private subscriptions: Subscription[] = [];

  constructor(
    private web3Service: Web3Service,
    private characatoCoinService: CharacatoCoinService,
    private stakingService: CharacatoStakingService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadData();
    this.startUpdateTimer();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.updateTimer) {
      this.updateTimer.unsubscribe();
    }
  }

  /**
   * Configurar suscripciones
   */
  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.web3Service.walletInfo$.subscribe(walletInfo => {
        const previousChainId = this.walletInfo.chainId;
        this.walletInfo = walletInfo;
        
        // Si cambió la red o se conectó por primera vez
        if (walletInfo.isConnected && (walletInfo.chainId !== previousChainId || previousChainId === 0)) {
          this.initializeContracts();
          this.loadData();
        } else if (walletInfo.isConnected) {
          this.loadData();
        }
      })
    );

    this.subscriptions.push(
      this.characatoCoinService.tokenInfo$.subscribe(tokenInfo => {
        this.tokenInfo = tokenInfo;
      })
    );

    this.subscriptions.push(
      this.characatoCoinService.userTokenInfo$.subscribe(userTokenInfo => {
        this.userTokenInfo = userTokenInfo;
      })
    );

    this.subscriptions.push(
      this.stakingService.stakingInfo$.subscribe(stakingInfo => {
        this.stakingInfo = stakingInfo;
      })
    );

    this.subscriptions.push(
      this.stakingService.userStakingInfo$.subscribe(userStakingInfo => {
        this.userStakingInfo = userStakingInfo;
      })
    );
  }

  /**
   * Inicializar contratos según la red activa
   */
  private initializeContracts(): void {
    this.stakingService.setChainId(this.walletInfo.chainId);
    console.log('Contratos inicializados para chainId:', this.walletInfo.chainId);
  }

  /**
   * Iniciar timer de actualización
   */
  private startUpdateTimer(): void {
    // Actualizar cada 30 segundos
    this.updateTimer = interval(30000).subscribe(() => {
      if (this.walletInfo.isConnected) {
        this.stakingService.loadUserStakingInfo();
      }
    });
  }

  /**
   * Cargar datos
   */
  private async loadData(): Promise<void> {
    if (!this.walletInfo.isConnected) {
      return;
    }

    try {
      await Promise.all([
        this.characatoCoinService.loadTokenInfo(),
        this.characatoCoinService.loadUserTokenInfo(),
        this.stakingService.loadStakingInfo(),
        this.stakingService.loadUserStakingInfo()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  }

  /**
   * Cambiar pestaña activa
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.clearStatus();
  }

  /**
   * Hacer staking
   */
  async stake(): Promise<void> {
    if (!this.validateStakeForm()) {
      return;
    }

    this.loading = true;
    try {
      // Obtener la dirección del contrato de staking
      const stakingContractAddress = this.stakingService.getContractAddress();
      
      if (!stakingContractAddress) {
        this.showMessage('Error: Dirección del contrato de staking no configurada', 'error');
        return;
      }

      // Primero aprobar tokens si es necesario
      const allowance = await this.characatoCoinService.getAllowance(
        this.walletInfo.address,
        stakingContractAddress
      );

      if (parseFloat(allowance) < parseFloat(this.stakeForm.amount)) {
        this.showMessage('Aprobando tokens para staking...', 'info');
        const approveTx = await this.characatoCoinService.approve(
          stakingContractAddress,
          this.stakeForm.amount.toString()
        );
        await approveTx.wait();
        this.showMessage('Tokens aprobados. Procediendo con el staking...', 'info');
      }

      // Hacer staking
      const tx = await this.stakingService.stake(this.stakeForm.amount.toString());
      this.showMessage('Staking enviado...', 'info');
      
      await tx.wait();
      this.showMessage('Staking completado exitosamente', 'success');
      this.resetStakeForm();
      
    } catch (error: any) {
      console.error('Error en staking:', error);
      this.showMessage('Error en staking: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Hacer unstaking
   */
  async unstake(): Promise<void> {
    if (!this.validateUnstakeForm()) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.stakingService.unstake(this.unstakeForm.amount.toString());
      this.showMessage('Unstaking enviado...', 'info');
      
      await tx.wait();
      this.showMessage('Unstaking completado exitosamente', 'success');
      this.resetUnstakeForm();
      
    } catch (error: any) {
      console.error('Error en unstaking:', error);
      this.showMessage('Error en unstaking: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Reclamar recompensas
   */
  async claimRewards(): Promise<void> {
    if (!this.userStakingInfo || parseFloat(this.userStakingInfo.pendingReward) === 0) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.stakingService.claimRewards();
      this.showMessage('Reclamando recompensas...', 'info');
      
      await tx.wait();
      this.showMessage('Recompensas reclamadas exitosamente', 'success');
      
    } catch (error: any) {
      console.error('Error reclamando recompensas:', error);
      this.showMessage('Error reclamando recompensas: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Actualizar tasa de recompensas
   */
  async updateRewardRate(): Promise<void> {
    if (!this.adminForm.rewardRate) {
      this.showMessage('Por favor, ingresa la nueva tasa de recompensas', 'error');
      return;
    }

    this.loading = true;
    try {
      const rate = parseInt(this.adminForm.rewardRate);
      const tx = await this.stakingService.updateRewardRate(rate);
      this.showMessage('Actualizando tasa de recompensas...', 'info');
      
      await tx.wait();
      this.showMessage('Tasa de recompensas actualizada exitosamente', 'success');
      this.adminForm.rewardRate = '';
      
    } catch (error: any) {
      console.error('Error actualizando tasa:', error);
      this.showMessage('Error actualizando tasa: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Financiar pool de recompensas
   */
  async fundRewardPool(): Promise<void> {
    if (!this.adminForm.fundAmount) {
      this.showMessage('Por favor, ingresa la cantidad a financiar', 'error');
      return;
    }

    this.loading = true;
    try {
      const tx = await this.stakingService.fundRewardPool(this.adminForm.fundAmount);
      this.showMessage('Financiando pool de recompensas...', 'info');
      
      await tx.wait();
      this.showMessage('Pool de recompensas financiado exitosamente', 'success');
      this.adminForm.fundAmount = '';
      
    } catch (error: any) {
      console.error('Error financiando pool:', error);
      this.showMessage('Error financiando pool: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Pausar/despausar staking
   */
  async toggleStakingPause(): Promise<void> {
    if (!this.stakingInfo) {
      return;
    }

    this.loading = true;
    try {
      let tx;
      if (this.stakingInfo.isPaused) {
        tx = await this.stakingService.unpauseStaking();
        this.showMessage('Reanudando staking...', 'info');
      } else {
        tx = await this.stakingService.pauseStaking();
        this.showMessage('Pausando staking...', 'info');
      }

      await tx.wait();
      
      const action = this.stakingInfo.isPaused ? 'reanudado' : 'pausado';
      this.showMessage(`Staking ${action} exitosamente`, 'success');
      
    } catch (error: any) {
      console.error('Error pausando/reanudando staking:', error);
      this.showMessage('Error pausando/reanudando staking: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  // Validaciones
  private validateStakeForm(): boolean {
    if (!this.stakeForm.amount) {
      this.showMessage('Por favor, ingresa la cantidad a hacer staking', 'error');
      return false;
    }

    if (parseFloat(this.stakeForm.amount) <= 0) {
      this.showMessage('La cantidad debe ser mayor a 0', 'error');
      return false;
    }

    if (this.stakingInfo && parseFloat(this.stakeForm.amount) < parseFloat(this.stakingInfo.minimumStakeAmount)) {
      this.showMessage(`La cantidad mínima es ${this.stakingInfo.minimumStakeAmount} CC`, 'error');
      return false;
    }

    if (this.userTokenInfo && parseFloat(this.stakeForm.amount) > parseFloat(this.userTokenInfo.balance)) {
      this.showMessage('Cantidad insuficiente de tokens', 'error');
      return false;
    }

    return true;
  }

  private validateUnstakeForm(): boolean {
    if (!this.unstakeForm.amount) {
      this.showMessage('Por favor, ingresa la cantidad a retirar', 'error');
      return false;
    }

    if (parseFloat(this.unstakeForm.amount) <= 0) {
      this.showMessage('La cantidad debe ser mayor a 0', 'error');
      return false;
    }

    if (this.userStakingInfo && parseFloat(this.unstakeForm.amount) > parseFloat(this.userStakingInfo.stakedAmount)) {
      this.showMessage('Cantidad insuficiente en staking', 'error');
      return false;
    }

    if (this.userStakingInfo && !this.userStakingInfo.canUnstake) {
      this.showMessage('Aún no puedes retirar. Período de bloqueo activo.', 'error');
      return false;
    }

    return true;
  }

  // Funciones auxiliares
  private resetStakeForm(): void {
    this.stakeForm = { amount: '' };
  }

  private resetUnstakeForm(): void {
    this.unstakeForm = { amount: '' };
  }

  private showMessage(message: string, type: string): void {
    this.statusMessage = message;
    this.statusType = type;

    setTimeout(() => {
      this.clearStatus();
    }, 5000);
  }

  private clearStatus(): void {
    this.statusMessage = '';
    this.statusType = '';
  }

  private getErrorMessage(error: any): string {
    if (error.code === 'ACTION_REJECTED') {
      return 'Transacción rechazada por el usuario';
    }
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return 'Fondos insuficientes';
    }
    if (error.reason) {
      return error.reason;
    }
    if (error.message) {
      return error.message;
    }
    return 'Error desconocido';
  }

  // Funciones públicas para templates
  formatAmount(amount: string): string {
    return this.characatoCoinService.formatAmount(amount);
  }

  formatTimeUntilUnlock(seconds: number): string {
    return this.stakingService.formatTimeUntilUnlock(seconds);
  }

  calculateAPY(): number {
    return this.stakingService.calculateAPY();
  }

  calculateDailyRewards(amount: string): string {
    return this.stakingService.calculateDailyRewards(amount);
  }

  parseFloat(value: string): number {
    return parseFloat(value || '0');
  }

  getLockPeriodInDays(): number {
    if (!this.stakingInfo) return 0;
    return Math.floor(this.stakingInfo.lockPeriod / (24 * 60 * 60));
  }
}
