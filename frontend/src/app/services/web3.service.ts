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
  private isUpdating = false;
  private updateTimeout: any = null;
  private eventListenersSetup = false;
  private lastAccountChange = 0;
  private accountMonitoringInterval: any = null;

  constructor() {
    this.checkWalletConnection();
    this.setupEventListeners();
    
    // Detectar cambios más frecuentemente durante los primeros segundos
    this.startAccountMonitoring();
  }

  /**
   * Monitoreo adicional de cambios de cuenta
   */
  private startAccountMonitoring(): void {
    if (!this.isMetaMaskInstalled()) {
      return;
    }

    // Limpiar monitoring previo si existe
    if (this.accountMonitoringInterval) {
      clearInterval(this.accountMonitoringInterval);
    }

    // Monitorear cambios de cuenta cada 2 segundos durante los primeros 20 segundos
    let checks = 0;
    const maxChecks = 10;
    
    this.accountMonitoringInterval = setInterval(async () => {
      checks++;
      
      if (checks >= maxChecks) {
        clearInterval(this.accountMonitoringInterval);
        this.accountMonitoringInterval = null;
        return;
      }

      // Skip si ya está actualizando
      if (this.isUpdating) {
        return;
      }

      try {
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        
        if (this.walletInfoSubject.value.isConnected && accounts.length > 0) {
          const currentAddress = this.walletInfoSubject.value.address;
          const activeAccount = accounts[0];
          
          // Si la cuenta activa cambió, actualizar
          if (currentAddress && currentAddress.toLowerCase() !== activeAccount.toLowerCase()) {
            console.log('Discrepancia detectada por monitoreo - Current:', currentAddress, 'Active:', activeAccount);
            await this.forceAccountSync();
          }
        }
      } catch (error) {
        // Ignorar errores silenciosamente durante el monitoreo
      }
    }, 2000);
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
      
      // Solicitar conexión y permisos
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No se encontraron cuentas. Por favor, desbloquea MetaMask.');
      }

      // Crear provider y signer
      this.provider = new ethers.BrowserProvider(ethereum);
      this.signer = await this.provider.getSigner();

      // Verificar que el signer está usando la cuenta correcta
      const signerAddress = await this.signer.getAddress();
      console.log('Conectando con cuenta:', signerAddress);
      console.log('Cuentas disponibles:', accounts);

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
    console.log('Desconectando wallet...');
    
    // Limpiar timeouts e intervals
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    
    if (this.accountMonitoringInterval) {
      clearInterval(this.accountMonitoringInterval);
      this.accountMonitoringInterval = null;
    }
    
    // Reset estado
    this.isUpdating = false;
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
   * Forzar sincronización con la cuenta actual de MetaMask
   */
  public async forceAccountSync(): Promise<void> {
    // Evitar múltiples sincronizaciones simultáneas
    if (this.isUpdating) {
      console.log('Sincronización ya en progreso, esperando...');
      return;
    }

    console.log('Forzando sincronización de cuenta...');
    this.isUpdating = true;

    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask no está instalado');
      }

      const ethereum = (window as any).ethereum;
      
      // Limpiar timeouts previos
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = null;
      }

      // Obtener cuentas actuales
      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length === 0) {
        this.disconnectWallet();
        return;
      }

      // Recrear provider y signer completamente
      this.provider = null;
      this.signer = null;
      
      this.provider = new ethers.BrowserProvider(ethereum);
      this.signer = await this.provider.getSigner();

      // Verificar que estamos usando la cuenta correcta
      const signerAddress = await this.signer.getAddress();
      console.log('Sincronizado con cuenta:', signerAddress);

      // Actualizar información con un pequeño delay para evitar problemas de timing
      this.updateTimeout = setTimeout(async () => {
        await this.updateWalletInfo();
        this.isUpdating = false;
      }, 100);

    } catch (error) {
      console.error('Error sincronizando cuenta:', error);
      this.isUpdating = false;
      throw error;
    }
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
        console.log('Cuenta detectada automáticamente:', accounts[0]);
        
        // Crear provider y signer
        this.provider = new ethers.BrowserProvider(ethereum);
        this.signer = await this.provider.getSigner();
        
        // Verificar que el signer coincide con la cuenta seleccionada
        const signerAddress = await this.signer.getAddress();
        if (signerAddress.toLowerCase() !== accounts[0].toLowerCase()) {
          console.warn('La cuenta del signer no coincide con la seleccionada en MetaMask');
          // Intentar recrear el signer
          this.signer = await this.provider.getSigner();
        }
        
        await this.updateWalletInfo();
      } else {
        // No hay cuentas conectadas
        this.disconnectWallet();
      }
    } catch (error) {
      console.error('Error verificando conexión de wallet:', error);
      this.disconnectWallet();
    }
  }

  /**
   * Actualizar información de wallet
   */
  private async updateWalletInfo(): Promise<void> {
    // Evitar actualizaciones simultáneas
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;

    try {
      if (!this.provider || !this.signer) {
        this.isUpdating = false;
        return;
      }

      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();

      const newWalletInfo = {
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        isConnected: true
      };

      console.log('Actualizando wallet info:', newWalletInfo);
      this.walletInfoSubject.next(newWalletInfo);

    } catch (error) {
      console.error('Error actualizando información de wallet:', error);
      // En caso de error, desconectar para evitar estados inconsistentes
      this.disconnectWallet();
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Configurar event listeners
   */
  private setupEventListeners(): void {
    if (!this.isMetaMaskInstalled() || this.eventListenersSetup) {
      return;
    }

    const ethereum = (window as any).ethereum;

    // Limpiar listeners existentes si los hay
    try {
      ethereum.removeAllListeners('accountsChanged');
      ethereum.removeAllListeners('chainChanged');
      ethereum.removeAllListeners('disconnect');
      ethereum.removeAllListeners('connect');
    } catch (error) {
      // Ignorar errores al limpiar listeners
    }

    // Cambio de cuenta con debouncing
    ethereum.on('accountsChanged', async (accounts: string[]) => {
      const now = Date.now();
      this.lastAccountChange = now;
      
      console.log('Accounts changed event:', accounts);
      
      // Debounce para evitar múltiples cambios rápidos
      setTimeout(async () => {
        // Solo procesar si este es el último cambio
        if (this.lastAccountChange !== now) {
          return;
        }

        if (accounts.length === 0) {
          // No hay cuentas disponibles
          console.log('No accounts available, disconnecting...');
          this.disconnectWallet();
        } else {
          // Hay cuentas disponibles, actualizar a la nueva cuenta
          console.log('Processing account change to:', accounts[0]);
          try {
            await this.forceAccountSync();
          } catch (error) {
            console.error('Error processing account change:', error);
            this.disconnectWallet();
          }
        }
      }, 300); // Delay de 300ms para debouncing
    });

    // Cambio de red
    ethereum.on('chainChanged', async (chainId: string) => {
      console.log('Chain changed event:', chainId);
      
      // Pequeño delay para permitir que MetaMask se estabilice
      setTimeout(async () => {
        try {
          if (this.provider && this.signer) {
            await this.updateWalletInfo();
          }
        } catch (error) {
          console.error('Error updating after chain change:', error);
          // Forzar reconexión si hay error
          this.disconnectWallet();
        }
      }, 500);
    });

    // Desconexión
    ethereum.on('disconnect', (error: any) => {
      console.log('MetaMask disconnected:', error);
      this.disconnectWallet();
    });

    // Conexión
    ethereum.on('connect', async (connectInfo: any) => {
      console.log('MetaMask connected:', connectInfo);
      setTimeout(async () => {
        await this.checkWalletConnection();
      }, 100);
    });

    this.eventListenersSetup = true;
    console.log('Event listeners configurados');
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

  /**
   * Limpiar y reinicializar completamente el servicio
   */
  public async fullReset(): Promise<void> {
    console.log('Realizando reset completo del servicio Web3...');
    
    // Limpiar todo el estado
    this.disconnectWallet();
    
    // Reset flags
    this.eventListenersSetup = false;
    this.isUpdating = false;
    this.lastAccountChange = 0;
    
    // Reconfigurar event listeners
    this.setupEventListeners();
    
    // Verificar conexión
    setTimeout(async () => {
      await this.checkWalletConnection();
    }, 500);
  }

  /**
   * Obtener estado de debugging
   */
  public getDebugInfo(): any {
    return {
      isConnected: this.walletInfoSubject.value.isConnected,
      address: this.walletInfoSubject.value.address,
      chainId: this.walletInfoSubject.value.chainId,
      isUpdating: this.isUpdating,
      hasProvider: !!this.provider,
      hasSigner: !!this.signer,
      eventListenersSetup: this.eventListenersSetup,
      lastAccountChange: this.lastAccountChange
    };
  }
}
