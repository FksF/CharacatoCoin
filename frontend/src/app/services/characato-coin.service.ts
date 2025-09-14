import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { ethers } from 'ethers';
import { Web3Service } from './web3.service';

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  totalMinted: string;
  remainingSupply: string;
  isPaused: boolean;
}

export interface UserTokenInfo {
  balance: string;
  allowanceStaking: string;
  isMinter: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CharacatoCoinService {
  
  // Direcciones de contratos por red
  private readonly CONTRACT_ADDRESSES: { [key: number]: string } = {
    1337: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Localhost
    11155111: '0x991bdf4132Fb68a7caA55d7240Cc02B29b268831' // Sepolia
  };
  
  // ABI del contrato CharacatoCoin (versión simplificada)
  private readonly CONTRACT_ABI = [
    // Funciones de lectura
    "function name() view returns (string)",
    "function symbol() view returns (string)", 
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function getTokenInfo() view returns (string, string, uint8, uint256, uint256, uint256, bool)",
    "function remainingSupply() view returns (uint256)",
    "function isMinter(address) view returns (bool)",
    "function paused() view returns (bool)",
    "function owner() view returns (address)",
    
    // Funciones de escritura
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount)",
    "function burn(uint256 amount)",
    "function burnFrom(address account, uint256 amount)",
    
    // Funciones de administración
    "function addMinter(address account)",
    "function removeMinter(address account)",
    "function pause()",
    "function unpause()",
    
    // Eventos
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event TokensMinted(address indexed to, uint256 amount)",
    "event TokensBurned(address indexed from, uint256 amount)"
  ];

  private contractAddress: string = '';
  private contract: ethers.Contract | null = null;
  
  private tokenInfoSubject = new BehaviorSubject<TokenInfo | null>(null);
  private userTokenInfoSubject = new BehaviorSubject<UserTokenInfo | null>(null);
  
  public tokenInfo$ = this.tokenInfoSubject.asObservable();
  public userTokenInfo$ = this.userTokenInfoSubject.asObservable();

  constructor(private web3Service: Web3Service) {
    // Suscribirse a cambios de wallet para actualizar información
    this.web3Service.walletInfo$.subscribe(walletInfo => {
      if (walletInfo.isConnected && this.contractAddress) {
        this.initializeContract();
        this.loadTokenInfo();
        this.loadUserTokenInfo();
      }
    });
  }

  /**
   * Configurar chain ID y dirección del contrato
   */
  public setChainId(chainId: number): void {
    const address = this.CONTRACT_ADDRESSES[chainId];
    if (address) {
      this.setContractAddress(address);
    } else {
      console.warn(`No hay dirección de contrato de token configurada para chainId: ${chainId}`);
    }
  }

  /**
   * Configurar dirección del contrato
   */
  public setContractAddress(address: string): void {
    // Asegurar que la dirección tenga el checksum correcto
    this.contractAddress = ethers.getAddress(address);
    if (this.web3Service.getProvider()) {
      this.initializeContract();
      this.loadTokenInfo();
      this.loadUserTokenInfo();
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
      this.CONTRACT_ABI,
      provider
    );
  }

  /**
   * Obtener contrato con signer para transacciones
   */
  private getContractWithSigner(): ethers.Contract {
    const signer = this.web3Service.getSigner();
    if (!signer || !this.contract) {
      throw new Error('Wallet no conectado o contrato no inicializado');
    }
    return this.contract.connect(signer) as ethers.Contract;
  }

  /**
   * Cargar información del token
   */
  public async loadTokenInfo(): Promise<void> {
    try {
      if (!this.contract) {
        return;
      }

      const tokenInfo = await this.contract['getTokenInfo']();
      const remainingSupply = await this.contract['remainingSupply']();

      this.tokenInfoSubject.next({
        name: tokenInfo[0],
        symbol: tokenInfo[1],
        decimals: Number(tokenInfo[2]),
        totalSupply: ethers.formatEther(tokenInfo[3]),
        maxSupply: ethers.formatEther(tokenInfo[4]),
        totalMinted: ethers.formatEther(tokenInfo[5]),
        remainingSupply: ethers.formatEther(remainingSupply),
        isPaused: tokenInfo[6]
      });

    } catch (error) {
      console.error('Error cargando información del token:', error);
      throw error;
    }
  }

  /**
   * Cargar información del usuario
   */
  public async loadUserTokenInfo(): Promise<void> {
    try {
      if (!this.contract) {
        return;
      }

      const signer = this.web3Service.getSigner();
      if (!signer) {
        return;
      }

      const userAddress = await signer.getAddress();
      const balance = await this.contract['balanceOf'](userAddress);
      const isMinter = await this.contract['isMinter'](userAddress);

      this.userTokenInfoSubject.next({
        balance: ethers.formatEther(balance),
        allowanceStaking: '0', // Se actualizará cuando se configure staking
        isMinter
      });

    } catch (error) {
      console.error('Error cargando información del usuario:', error);
      throw error;
    }
  }

  /**
   * Transferir tokens
   */
  public async transfer(to: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['transfer'](to, amountWei);
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadTokenInfo();
        this.loadUserTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error en transferencia:', error);
      throw error;
    }
  }

  /**
   * Aprobar tokens para gasto
   */
  public async approve(spender: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['approve'](spender, amountWei);
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadUserTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error en aprobación:', error);
      throw error;
    }
  }

  /**
   * Mintear tokens (solo para minters)
   */
  public async mint(to: string, amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['mint'](to, amountWei);
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadTokenInfo();
        this.loadUserTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error en minteo:', error);
      throw error;
    }
  }

  /**
   * Quemar tokens
   */
  public async burn(amount: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const amountWei = ethers.parseEther(amount);
      
      const tx = await contract['burn'](amountWei);
      
      // Actualizar información después de la transacción
      tx.wait().then(() => {
        this.loadTokenInfo();
        this.loadUserTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error quemando tokens:', error);
      throw error;
    }
  }

  /**
   * Pausar contrato (solo owner)
   */
  public async pauseContract(): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract['pause']();
      
      tx.wait().then(() => {
        this.loadTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error pausando contrato:', error);
      throw error;
    }
  }

  /**
   * Reanudar contrato (solo owner)
   */
  public async unpauseContract(): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract['unpause']();
      
      tx.wait().then(() => {
        this.loadTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error reanudando contrato:', error);
      throw error;
    }
  }

  /**
   * Añadir minter (solo owner)
   */
  public async addMinter(address: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract['addMinter'](address);
      
      tx.wait().then(() => {
        this.loadUserTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error añadiendo minter:', error);
      throw error;
    }
  }

  /**
   * Remover minter (solo owner)
   */
  public async removeMinter(address: string): Promise<ethers.TransactionResponse> {
    try {
      const contract = this.getContractWithSigner();
      const tx = await contract['removeMinter'](address);
      
      tx.wait().then(() => {
        this.loadUserTokenInfo();
      });
      
      return tx;
    } catch (error) {
      console.error('Error removiendo minter:', error);
      throw error;
    }
  }

  /**
   * Obtener balance de una dirección específica
   */
  public async getBalance(address: string): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contrato no inicializado');
      }
      
      const balance = await this.contract['balanceOf'](address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error obteniendo balance:', error);
      throw error;
    }
  }

  /**
   * Verificar allowance
   */
  public async getAllowance(owner: string, spender: string): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Contrato no inicializado');
      }
      
      const allowance = await this.contract['allowance'](owner, spender);
      return ethers.formatEther(allowance);
    } catch (error) {
      console.error('Error obteniendo allowance:', error);
      throw error;
    }
  }

  /**
   * Formatear cantidad para mostrar
   */
  public formatAmount(amount: string, decimals: number = 4): string {
    const num = parseFloat(amount);
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Validar dirección Ethereum
   */
  public isValidAddress(address: string): boolean {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtener información actual del token
   */
  public getCurrentTokenInfo(): TokenInfo | null {
    return this.tokenInfoSubject.value;
  }

  /**
   * Obtener información actual del usuario
   */
  public getCurrentUserTokenInfo(): UserTokenInfo | null {
    return this.userTokenInfoSubject.value;
  }
}
