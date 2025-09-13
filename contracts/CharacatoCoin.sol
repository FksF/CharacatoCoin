// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CharacatoCoin
 * @dev Implementación de la criptomoneda Characato Coin (CHCOIN)
 * Características:
 * - Token ERC20 estándar
 * - Funcionalidad de quema de tokens
 * - Capacidad de pausar transferencias
 * - Control de propietario
 * - Protección contra reentrada
 * - Emisión inicial de 1,000,000 tokens
 */
contract CharacatoCoin is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    // Eventos personalizados
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    
    // Constantes del token
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 millón de tokens
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18; // 10 millones de tokens máximo
    
    // Variables de estado
    uint256 private _totalMinted;
    mapping(address => bool) public minters;
    
    /**
     * @dev Constructor que inicializa el token
     * @param initialOwner Dirección del propietario inicial
     */
    constructor(address initialOwner) 
        ERC20("Characato Coin", "CHCOIN") 
        Ownable(initialOwner) 
    {
        // Mintear suministro inicial al propietario
        _mint(initialOwner, INITIAL_SUPPLY);
        _totalMinted = INITIAL_SUPPLY;
        
        // El owner es minter por defecto
        minters[initialOwner] = true;
        
        emit TokensMinted(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Modificador para verificar que el caller es un minter autorizado
     */
    modifier onlyMinter() {
        require(minters[msg.sender], "CharacatoCoin: caller is not a minter");
        _;
    }
    
    /**
     * @dev Función para mintear nuevos tokens
     * @param to Dirección que recibirá los tokens
     * @param amount Cantidad de tokens a mintear
     */
    function mint(address to, uint256 amount) public onlyMinter nonReentrant {
        require(to != address(0), "CharacatoCoin: cannot mint to zero address");
        require(amount > 0, "CharacatoCoin: amount must be greater than 0");
        require(_totalMinted + amount <= MAX_SUPPLY, "CharacatoCoin: would exceed max supply");
        
        _mint(to, amount);
        _totalMinted += amount;
        
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Función para quemar tokens del caller
     * @param amount Cantidad de tokens a quemar
     */
    function burn(uint256 amount) public override nonReentrant {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev Función para quemar tokens de una dirección específica (requiere allowance)
     * @param account Dirección de la cual quemar tokens
     * @param amount Cantidad de tokens a quemar
     */
    function burnFrom(address account, uint256 amount) public override nonReentrant {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }
    
    /**
     * @dev Función para pausar todas las transferencias de tokens
     */
    function pause() public onlyOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }
    
    /**
     * @dev Función para reanudar todas las transferencias de tokens
     */
    function unpause() public onlyOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }
    
    /**
     * @dev Función para añadir un nuevo minter
     * @param account Dirección que será autorizada para mintear
     */
    function addMinter(address account) public onlyOwner {
        require(account != address(0), "CharacatoCoin: cannot add zero address as minter");
        require(!minters[account], "CharacatoCoin: account is already a minter");
        
        minters[account] = true;
    }
    
    /**
     * @dev Función para remover un minter
     * @param account Dirección que perderá autorización para mintear
     */
    function removeMinter(address account) public onlyOwner {
        require(account != address(0), "CharacatoCoin: cannot remove zero address");
        require(minters[account], "CharacatoCoin: account is not a minter");
        require(account != owner(), "CharacatoCoin: cannot remove owner as minter");
        
        minters[account] = false;
    }
    
    /**
     * @dev Función para verificar si una dirección es minter
     * @param account Dirección a verificar
     * @return bool true si es minter, false en caso contrario
     */
    function isMinter(address account) public view returns (bool) {
        return minters[account];
    }
    
    /**
     * @dev Función para obtener el total de tokens minteados
     * @return uint256 Total de tokens minteados hasta ahora
     */
    function totalMinted() public view returns (uint256) {
        return _totalMinted;
    }
    
    /**
     * @dev Función para obtener los tokens restantes que se pueden mintear
     * @return uint256 Cantidad de tokens que aún se pueden mintear
     */
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - _totalMinted;
    }
    
    /**
     * @dev Override de _update para incluir funcionalidad de pausable
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
    
    /**
     * @dev Función de emergencia para retirar ETH accidentalmente enviado al contrato
     */
    function emergencyWithdraw() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "CharacatoCoin: no ETH to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "CharacatoCoin: ETH withdrawal failed");
    }
    
    /**
     * @dev Función receive para aceptar ETH
     */
    receive() external payable {
        // El contrato puede recibir ETH
    }
    
    /**
     * @dev Función para recuperar tokens ERC20 accidentalmente enviados al contrato
     * @param tokenAddress Dirección del contrato del token a recuperar
     * @param amount Cantidad de tokens a recuperar
     */
    function recoverERC20(address tokenAddress, uint256 amount) public onlyOwner nonReentrant {
        require(tokenAddress != address(this), "CharacatoCoin: cannot recover own tokens");
        require(tokenAddress != address(0), "CharacatoCoin: invalid token address");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(owner(), amount), "CharacatoCoin: token recovery failed");
    }
    
    /**
     * @dev Función para obtener información del token
     * @return name_ Nombre del token
     * @return symbol_ Símbolo del token  
     * @return decimals_ Decimales del token
     * @return totalSupply_ Suministro total
     * @return maxSupply_ Suministro máximo
     * @return totalMinted_ Total minteado
     * @return isPaused_ Si está pausado
     */
    function getTokenInfo() public view returns (
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 totalSupply_,
        uint256 maxSupply_,
        uint256 totalMinted_,
        bool isPaused_
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            MAX_SUPPLY,
            _totalMinted,
            paused()
        );
    }
}
