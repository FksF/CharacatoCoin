import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Web3Service, WalletInfo } from '../../services/web3.service';
import { CharacatoCoinService, TokenInfo, UserTokenInfo } from '../../services/characato-coin.service';

@Component({
  selector: 'app-token-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './token-management.html',
  styleUrl: './token-management.scss'
})
export class TokenManagement implements OnInit, OnDestroy {

  walletInfo: WalletInfo = {
    address: '',
    balance: '0',
    chainId: 0,
    isConnected: false
  };

  tokenInfo: TokenInfo | null = null;
  userTokenInfo: UserTokenInfo | null = null;

  // Estados de la UI
  loading = false;
  activeTab = 'transfer'; // transfer, mint, burn, admin
  statusMessage = '';
  statusType = '';

  // Formularios
  transferForm = {
    to: '',
    amount: ''
  };

  mintForm = {
    to: '',
    amount: ''
  };

  burnForm = {
    amount: ''
  };

  approveForm = {
    spender: '',
    amount: ''
  };

  adminForm = {
    minterAddress: '',
    action: 'add' // add, remove
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private web3Service: Web3Service,
    private characatoCoinService: CharacatoCoinService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.initializeContracts();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Configurar suscripciones
   */
  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.web3Service.walletInfo$.subscribe(walletInfo => {
        const previousChainId = this.walletInfo.chainId;
        this.walletInfo = walletInfo;
        
        // Si cambió la red o se conectó por primera vez, inicializar contratos
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
  }

  /**
   * Inicializar contratos según la red activa
   */
  private initializeContracts(): void {
    this.characatoCoinService.setChainId(this.walletInfo.chainId);
    console.log('Contratos de token inicializados para chainId:', this.walletInfo.chainId);
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
        this.characatoCoinService.loadUserTokenInfo()
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
   * Transferir tokens
   */
  async transfer(): Promise<void> {
    if (!this.validateTransferForm()) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.characatoCoinService.transfer(
        this.transferForm.to,
        this.transferForm.amount.toString()
      );

      this.showMessage('Transferencia enviada...', 'info');
      await tx.wait();
      
      this.showMessage('Transferencia completada exitosamente', 'success');
      this.resetTransferForm();
      
    } catch (error: any) {
      console.error('Error en transferencia:', error);
      this.showMessage('Error en transferencia: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Aprobar tokens
   */
  async approve(): Promise<void> {
    if (!this.validateApproveForm()) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.characatoCoinService.approve(
        this.approveForm.spender,
        this.approveForm.amount.toString()
      );

      this.showMessage('Aprobación enviada...', 'info');
      await tx.wait();
      
      this.showMessage('Aprobación completada exitosamente', 'success');
      this.resetApproveForm();
      
    } catch (error: any) {
      console.error('Error en aprobación:', error);
      this.showMessage('Error en aprobación: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Mintear tokens
   */
  async mint(): Promise<void> {
    if (!this.validateMintForm()) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.characatoCoinService.mint(
        this.mintForm.to,
        this.mintForm.amount.toString()
      );

      this.showMessage('Minteo enviado...', 'info');
      await tx.wait();
      
      this.showMessage('Tokens minteados exitosamente', 'success');
      this.resetMintForm();
      
    } catch (error: any) {
      console.error('Error en minteo:', error);
      this.showMessage('Error en minteo: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Quemar tokens
   */
  async burn(): Promise<void> {
    if (!this.validateBurnForm()) {
      return;
    }

    this.loading = true;
    try {
      const tx = await this.characatoCoinService.burn(this.burnForm.amount.toString());

      this.showMessage('Quema enviada...', 'info');
      await tx.wait();
      
      this.showMessage('Tokens quemados exitosamente', 'success');
      this.resetBurnForm();
      
    } catch (error: any) {
      console.error('Error quemando tokens:', error);
      this.showMessage('Error quemando tokens: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Gestionar minters
   */
  async manageMinter(): Promise<void> {
    if (!this.validateAdminForm()) {
      return;
    }

    this.loading = true;
    try {
      let tx;
      if (this.adminForm.action === 'add') {
        tx = await this.characatoCoinService.addMinter(this.adminForm.minterAddress);
        this.showMessage('Añadiendo minter...', 'info');
      } else {
        tx = await this.characatoCoinService.removeMinter(this.adminForm.minterAddress);
        this.showMessage('Removiendo minter...', 'info');
      }

      await tx.wait();
      
      const action = this.adminForm.action === 'add' ? 'añadido' : 'removido';
      this.showMessage(`Minter ${action} exitosamente`, 'success');
      this.resetAdminForm();
      
    } catch (error: any) {
      console.error('Error gestionando minter:', error);
      this.showMessage('Error gestionando minter: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  /**
   * Pausar/despausar contrato
   */
  async togglePause(): Promise<void> {
    if (!this.tokenInfo) {
      return;
    }

    this.loading = true;
    try {
      let tx;
      if (this.tokenInfo.isPaused) {
        tx = await this.characatoCoinService.unpauseContract();
        this.showMessage('Reanudando contrato...', 'info');
      } else {
        tx = await this.characatoCoinService.pauseContract();
        this.showMessage('Pausando contrato...', 'info');
      }

      await tx.wait();
      
      const action = this.tokenInfo.isPaused ? 'reanudado' : 'pausado';
      this.showMessage(`Contrato ${action} exitosamente`, 'success');
      
    } catch (error: any) {
      console.error('Error pausando/reanudando:', error);
      this.showMessage('Error pausando/reanudando: ' + this.getErrorMessage(error), 'error');
    } finally {
      this.loading = false;
    }
  }

  // Validaciones
  private validateTransferForm(): boolean {
    if (!this.transferForm.to || !this.transferForm.amount) {
      this.showMessage('Por favor, completa todos los campos', 'error');
      return false;
    }

    if (!this.characatoCoinService.isValidAddress(this.transferForm.to)) {
      this.showMessage('Dirección de destinatario inválida', 'error');
      return false;
    }

    if (parseFloat(this.transferForm.amount) <= 0) {
      this.showMessage('La cantidad debe ser mayor a 0', 'error');
      return false;
    }

    if (this.userTokenInfo && parseFloat(this.transferForm.amount) > parseFloat(this.userTokenInfo.balance)) {
      this.showMessage('Cantidad insuficiente de tokens', 'error');
      return false;
    }

    return true;
  }

  private validateApproveForm(): boolean {
    if (!this.approveForm.spender || !this.approveForm.amount) {
      this.showMessage('Por favor, completa todos los campos', 'error');
      return false;
    }

    if (!this.characatoCoinService.isValidAddress(this.approveForm.spender)) {
      this.showMessage('Dirección del spender inválida', 'error');
      return false;
    }

    if (parseFloat(this.approveForm.amount) < 0) {
      this.showMessage('La cantidad no puede ser negativa', 'error');
      return false;
    }

    return true;
  }

  private validateMintForm(): boolean {
    if (!this.userTokenInfo?.isMinter) {
      this.showMessage('No tienes permisos para mintear tokens', 'error');
      return false;
    }

    if (!this.mintForm.to || !this.mintForm.amount) {
      this.showMessage('Por favor, completa todos los campos', 'error');
      return false;
    }

    if (!this.characatoCoinService.isValidAddress(this.mintForm.to)) {
      this.showMessage('Dirección de destinatario inválida', 'error');
      return false;
    }

    if (parseFloat(this.mintForm.amount) <= 0) {
      this.showMessage('La cantidad debe ser mayor a 0', 'error');
      return false;
    }

    return true;
  }

  private validateBurnForm(): boolean {
    if (!this.burnForm.amount) {
      this.showMessage('Por favor, ingresa la cantidad a quemar', 'error');
      return false;
    }

    if (parseFloat(this.burnForm.amount) <= 0) {
      this.showMessage('La cantidad debe ser mayor a 0', 'error');
      return false;
    }

    if (this.userTokenInfo && parseFloat(this.burnForm.amount) > parseFloat(this.userTokenInfo.balance)) {
      this.showMessage('Cantidad insuficiente de tokens', 'error');
      return false;
    }

    return true;
  }

  private validateAdminForm(): boolean {
    if (!this.adminForm.minterAddress) {
      this.showMessage('Por favor, ingresa la dirección del minter', 'error');
      return false;
    }

    if (!this.characatoCoinService.isValidAddress(this.adminForm.minterAddress)) {
      this.showMessage('Dirección inválida', 'error');
      return false;
    }

    return true;
  }

  // Funciones auxiliares
  private resetTransferForm(): void {
    this.transferForm = { to: '', amount: '' };
  }

  private resetApproveForm(): void {
    this.approveForm = { spender: '', amount: '' };
  }

  private resetMintForm(): void {
    this.mintForm = { to: '', amount: '' };
  }

  private resetBurnForm(): void {
    this.burnForm = { amount: '' };
  }

  private resetAdminForm(): void {
    this.adminForm = { minterAddress: '', action: 'add' };
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

  formatAddress(address: string): string {
    return this.web3Service.formatAddress(address);
  }

  parseFloat(value: string): number {
    return parseFloat(value || '0');
  }
}
