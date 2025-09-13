import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { Web3Service, WalletInfo } from '../../services/web3.service';
import { CharacatoCoinService, TokenInfo, UserTokenInfo } from '../../services/characato-coin.service';
import { CharacatoStakingService, StakingInfo, UserStakingInfo } from '../../services/characato-staking.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, OnDestroy {
  
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

  loading = false;
  statusMessage = '';
  statusType = '';

  // Direcciones de contratos (se cargarán dinámicamente)
  contractAddresses = {
    characatoCoin: '',
    characatoStaking: ''
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private web3Service: Web3Service,
    private characatoCoinService: CharacatoCoinService,
    private characatoStakingService: CharacatoStakingService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.initializeContracts();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Configurar suscripciones a observables
   */
  private setupSubscriptions(): void {
    // Suscribirse a cambios de wallet
    this.subscriptions.push(
      this.web3Service.walletInfo$.subscribe(walletInfo => {
        this.walletInfo = walletInfo;
        if (walletInfo.isConnected) {
          this.loadAllData();
        }
      })
    );

    // Suscribirse a información del token
    this.subscriptions.push(
      this.characatoCoinService.tokenInfo$.subscribe(tokenInfo => {
        this.tokenInfo = tokenInfo;
      })
    );

    // Suscribirse a información del usuario
    this.subscriptions.push(
      this.characatoCoinService.userTokenInfo$.subscribe(userTokenInfo => {
        this.userTokenInfo = userTokenInfo;
      })
    );

    // Suscribirse a información de staking
    this.subscriptions.push(
      this.characatoStakingService.stakingInfo$.subscribe(stakingInfo => {
        this.stakingInfo = stakingInfo;
      })
    );

    // Suscribirse a información de staking del usuario
    this.subscriptions.push(
      this.characatoStakingService.userStakingInfo$.subscribe(userStakingInfo => {
        this.userStakingInfo = userStakingInfo;
      })
    );
  }

  /**
   * Inicializar contratos con direcciones
   */
  private async initializeContracts(): Promise<void> {
    try {
      // En un entorno real, estas direcciones vendrían de un archivo de configuración
      // o se cargarían dinámicamente según la red
      const chainId = this.walletInfo.chainId;
      
      // Direcciones de ejemplo - en producción, cargar desde archivo de configuración
      if (chainId === 31337) { // Red local
        this.contractAddresses.characatoCoin = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
        this.contractAddresses.characatoStaking = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
      } else if (chainId === 11155111) { // Sepolia
        // Direcciones en Sepolia (actualizadas después del despliegue)
        this.contractAddresses.characatoCoin = '0x991bdf4132Fb68a7caA55d7240Cc02B29b268831';
        this.contractAddresses.characatoStaking = '0xe1757AFA916B83B6115D9D386ff162b3cCfE1558';
      }

      // Configurar servicios con las direcciones
      if (this.contractAddresses.characatoCoin) {
        this.characatoCoinService.setContractAddress(this.contractAddresses.characatoCoin);
      }
      
      if (this.contractAddresses.characatoStaking) {
        this.characatoStakingService.setContractAddress(this.contractAddresses.characatoStaking);
      }

    } catch (error) {
      console.error('Error inicializando contratos:', error);
    }
  }

  /**
   * Cargar todos los datos
   */
  private async loadAllData(): Promise<void> {
    if (!this.walletInfo.isConnected) {
      return;
    }

    this.loading = true;
    try {
      await Promise.all([
        this.characatoCoinService.loadTokenInfo(),
        this.characatoCoinService.loadUserTokenInfo(),
        this.characatoStakingService.loadStakingInfo(),
        this.characatoStakingService.loadUserStakingInfo()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.showMessage('Error cargando datos', 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Refrescar información del token
   */
  async refreshTokenInfo(): Promise<void> {
    this.loading = true;
    try {
      await this.characatoCoinService.loadTokenInfo();
      await this.characatoCoinService.loadUserTokenInfo();
      this.showMessage('Información actualizada', 'success');
    } catch (error) {
      console.error('Error refrescando información:', error);
      this.showMessage('Error actualizando información', 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Refrescar todos los datos
   */
  async refreshAllData(): Promise<void> {
    await this.loadAllData();
    this.showMessage('Todos los datos actualizados', 'success');
  }

  /**
   * Reclamar recompensas de staking
   */
  async claimRewards(): Promise<void> {
    if (!this.userStakingInfo || parseFloat(this.userStakingInfo.pendingReward) === 0) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.characatoStakingService.claimRewards();
      this.showMessage('Reclamando recompensas...', 'info');
      
      await tx.wait();
      this.showMessage('Recompensas reclamadas exitosamente', 'success');
      
    } catch (error: any) {
      console.error('Error reclamando recompensas:', error);
      this.showMessage('Error reclamando recompensas: ' + error.message, 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Calcular APY
   */
  calculateAPY(): number {
    return this.characatoStakingService.calculateAPY();
  }

  /**
   * Formatear cantidad
   */
  formatAmount(amount: string): string {
    return this.characatoCoinService.formatAmount(amount);
  }

  /**
   * Formatear dirección
   */
  formatAddress(address: string): string {
    return this.web3Service.formatAddress(address);
  }

  /**
   * Formatear tiempo hasta desbloqueo
   */
  formatTimeUntilUnlock(seconds: number): string {
    return this.characatoStakingService.formatTimeUntilUnlock(seconds);
  }

  /**
   * Obtener nombre de la red
   */
  getNetworkName(): string {
    return this.web3Service.getNetworkName(this.walletInfo.chainId);
  }

  /**
   * Función auxiliar para parseFloat
   */
  parseFloat(value: string): number {
    return parseFloat(value);
  }

  /**
   * Mostrar mensaje de estado
   */
  private showMessage(message: string, type: string): void {
    this.statusMessage = message;
    this.statusType = type;
    
    // Limpiar mensaje después de 5 segundos
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
    }, 5000);
  }
}
