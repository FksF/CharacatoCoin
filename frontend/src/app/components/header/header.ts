import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Web3Service, WalletInfo } from '../../services/web3.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header implements OnInit, OnDestroy {
  
  walletInfo: WalletInfo = {
    address: '',
    balance: '0',
    chainId: 0,
    isConnected: false
  };

  isConnecting = false;
  isMetaMaskInstalled = false;
  
  private walletSubscription?: Subscription;

  constructor(private web3Service: Web3Service) {}

  ngOnInit(): void {
    this.isMetaMaskInstalled = this.web3Service.isMetaMaskInstalled();
    
    // Suscribirse a cambios de wallet
    this.walletSubscription = this.web3Service.walletInfo$.subscribe(
      walletInfo => {
        this.walletInfo = walletInfo;
        this.isConnecting = false;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe();
    }
  }

  /**
   * Conectar wallet
   */
  async connectWallet(): Promise<void> {
    if (!this.isMetaMaskInstalled) {
      alert('Por favor, instala MetaMask para continuar.');
      return;
    }

    this.isConnecting = true;
    
    try {
      await this.web3Service.connectWallet();
    } catch (error: any) {
      console.error('Error conectando wallet:', error);
      alert(error.message || 'Error conectando wallet');
      this.isConnecting = false;
    }
  }

  /**
   * Desconectar wallet
   */
  disconnectWallet(): void {
    this.web3Service.disconnectWallet();
  }

  /**
   * Formatear dirección para mostrar
   */
  formatAddress(address: string): string {
    return this.web3Service.formatAddress(address);
  }

  /**
   * Formatear balance
   */
  formatBalance(balance: string): string {
    const num = parseFloat(balance);
    return num.toFixed(4);
  }

  /**
   * Obtener nombre de la red
   */
  getNetworkName(): string {
    return this.web3Service.getNetworkName(this.walletInfo.chainId);
  }

  /**
   * Obtener clase CSS para la red
   */
  getNetworkClass(): string {
    switch (this.walletInfo.chainId) {
      case 1:
        return 'network-mainnet';
      case 11155111:
        return 'network-testnet';
      case 31337:
        return 'network-local';
      default:
        return 'network-unknown';
    }
  }

  /**
   * Verificar si la red está soportada
   */
  isSupportedNetwork(): boolean {
    const supportedChains = [1, 11155111, 31337]; // Mainnet, Sepolia, Localhost
    return supportedChains.includes(this.walletInfo.chainId);
  }

  /**
   * Cambiar a red soportada
   */
  async switchToSupportedNetwork(): Promise<void> {
    try {
      // Por defecto, cambiar a Sepolia testnet
      await this.web3Service.switchNetwork(11155111);
    } catch (error: any) {
      console.error('Error cambiando red:', error);
      alert('Error cambiando red: ' + error.message);
    }
  }
}
