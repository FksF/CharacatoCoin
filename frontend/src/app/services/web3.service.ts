import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { ethers } from 'ethers';

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  isConnected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Web3Service {
  private walletInfoSubject = new BehaviorSubject<WalletInfo>({
    address: '',
    balance: '0',
    chainId: 0,
    isConnected: false
  });

  public walletInfo$ = this.walletInfoSubject.asObservable();
  
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor() {
    this.checkWalletConnection();
    this.setupEventListeners();
  }

  /**
   * Verificar si MetaMask está instalado
   */
  public isMetaMaskInstalled(): boolean {
    return typeof (window as any).ethereum !== 'undefined';
  }

  /**
   * Conectar wallet
   */
  public async connectWallet(): Promise<void> {
    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask no está instalado. Por favor, instala MetaMask para continuar.');
      }

      const ethereum = (window as any).ethereum;
      
      // Solicitar conexión
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No se encontraron cuentas. Por favor, desbloquea MetaMask.');
      }

      // Crear provider y signer
      this.provider = new ethers.BrowserProvider(ethereum);
      this.signer = await this.provider.getSigner();

      // Actualizar información de wallet
      await this.updateWalletInfo();

    } catch (error: any) {
      console.error('Error conectando wallet:', error);
      throw new Error(error.message || 'Error desconocido al conectar wallet');
    }
  }

  /**
   * Desconectar wallet
   */
  public disconnectWallet(): void {
    this.provider = null;
    this.signer = null;
    
    this.walletInfoSubject.next({
      address: '',
      balance: '0',
      chainId: 0,
      isConnected: false
    });
  }

  /**
   * Obtener provider
   */
  public getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  /**
   * Obtener signer
   */
  public getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  /**
   * Cambiar red
   */
  public async switchNetwork(chainId: number): Promise<void> {
    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask no está instalado');
      }

      const ethereum = (window as any).ethereum;
      const hexChainId = '0x' + chainId.toString(16);

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }]
      });

    } catch (error: any) {
      // Si la red no está añadida, intentar añadirla
      if (error.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Añadir red a MetaMask
   */
  private async addNetwork(chainId: number): Promise<void> {
    const networkParams = this.getNetworkParams(chainId);
    if (!networkParams) {
      throw new Error('Red no soportada');
    }

    const ethereum = (window as any).ethereum;
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkParams]
    });
  }

  /**
   * Obtener parámetros de red
   */
  private getNetworkParams(chainId: number): any {
    const networks: { [key: number]: any } = {
      1: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io/']
      },
      11155111: {
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
        rpcUrls: ['https://sepolia.infura.io/v3/'],
        blockExplorerUrls: ['https://sepolia.etherscan.io/']
      },
      31337: {
        chainId: '0x7a69',
        chainName: 'Hardhat Local',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['http://127.0.0.1:8545'],
        blockExplorerUrls: ['']
      }
    };

    return networks[chainId];
  }

  /**
   * Verificar conexión existente
   */
  private async checkWalletConnection(): Promise<void> {
    try {
      if (!this.isMetaMaskInstalled()) {
        return;
      }

      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length > 0) {
        this.provider = new ethers.BrowserProvider(ethereum);
        this.signer = await this.provider.getSigner();
        await this.updateWalletInfo();
      }
    } catch (error) {
      console.error('Error verificando conexión de wallet:', error);
    }
  }

  /**
   * Actualizar información de wallet
   */
  private async updateWalletInfo(): Promise<void> {
    try {
      if (!this.provider || !this.signer) {
        return;
      }

      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();

      this.walletInfoSubject.next({
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        isConnected: true
      });

    } catch (error) {
      console.error('Error actualizando información de wallet:', error);
    }
  }

  /**
   * Configurar event listeners
   */
  private setupEventListeners(): void {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    const ethereum = (window as any).ethereum;

    // Cambio de cuenta
    ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnectWallet();
      } else {
        this.checkWalletConnection();
      }
    });

    // Cambio de red
    ethereum.on('chainChanged', (chainId: string) => {
      window.location.reload(); // Recargar para evitar problemas de estado
    });

    // Desconexión
    ethereum.on('disconnect', () => {
      this.disconnectWallet();
    });
  }

  /**
   * Formatear dirección para mostrar
   */
  public formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Obtener nombre de la red
   */
  public getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'Mainnet',
      11155111: 'Sepolia',
      31337: 'Localhost'
    };
    return networks[chainId] || `Chain ${chainId}`;
  }

  /**
   * Verificar si está en red local
   */
  public isLocalNetwork(): boolean {
    const currentWallet = this.walletInfoSubject.value;
    return currentWallet.chainId === 31337;
  }

  /**
   * Verificar si está en testnet
   */
  public isTestnet(): boolean {
    const currentWallet = this.walletInfoSubject.value;
    return currentWallet.chainId === 11155111;
  }

  /**
   * Verificar si está en mainnet
   */
  public isMainnet(): boolean {
    const currentWallet = this.walletInfoSubject.value;
    return currentWallet.chainId === 1;
  }
}
