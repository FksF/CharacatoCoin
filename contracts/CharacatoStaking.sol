// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CharacatoCoin.sol";

/**
 * @title CharacatoStaking
 * @dev Contrato para hacer staking de Characato Coins y ganar recompensas
 */
contract CharacatoStaking is ReentrancyGuard, Ownable, Pausable {
    CharacatoCoin public immutable characatoToken;
    
    // Estructura para el staking de un usuario
    struct StakeInfo {
        uint256 amount;           // Cantidad en staking
        uint256 rewardDebt;       // Deuda de recompensas
        uint256 lastStakeTime;    // Última vez que hizo stake
    }
    
    // Mapeo de dirección a información de staking
    mapping(address => StakeInfo) public stakes;
    
    // Variables del pool de staking
    uint256 public totalStaked;                    // Total de tokens en staking
    uint256 public rewardRate = 100;               // 1% por día (100 basis points)
    uint256 public constant REWARD_PRECISION = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public minimumStakeAmount = 100 * 10**18; // Mínimo 100 tokens
    uint256 public lockPeriod = 7 days;            // Período de bloqueo de 7 días
    
    // Pool de recompensas
    uint256 public rewardPool;
    
    // Eventos
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event RewardPoolFunded(uint256 amount);
    
    constructor(address _characatoToken, address initialOwner) Ownable(initialOwner) {
        characatoToken = CharacatoCoin(payable(_characatoToken));
    }
    
    /**
     * @dev Función para hacer staking de tokens
     * @param amount Cantidad de tokens a hacer staking
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= minimumStakeAmount, "Amount below minimum stake");
        require(characatoToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Calcular y pagar recompensas pendientes
        _claimRewards(msg.sender);
        
        // Transferir tokens al contrato
        require(characatoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Actualizar información de staking
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].lastStakeTime = block.timestamp;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    /**
     * @dev Función para retirar tokens del staking
     * @param amount Cantidad de tokens a retirar
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= userStake.lastStakeTime + lockPeriod,
            "Tokens are still locked"
        );
        
        // Calcular y pagar recompensas pendientes
        _claimRewards(msg.sender);
        
        // Actualizar información de staking
        userStake.amount -= amount;
        totalStaked -= amount;
        
        // Transferir tokens de vuelta al usuario
        require(characatoToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @dev Función para reclamar recompensas
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }
    
    /**
     * @dev Función interna para calcular y pagar recompensas
     * @param user Dirección del usuario
     */
    function _claimRewards(address user) internal {
        uint256 pending = pendingRewards(user);
        if (pending > 0 && rewardPool >= pending) {
            stakes[user].rewardDebt = calculateRewardDebt(user);
            rewardPool -= pending;
            
            require(characatoToken.transfer(user, pending), "Reward transfer failed");
            emit RewardClaimed(user, pending);
        }
    }
    
    /**
     * @dev Función para calcular recompensas pendientes
     * @param user Dirección del usuario
     * @return Cantidad de recompensas pendientes
     */
    function pendingRewards(address user) public view returns (uint256) {
        StakeInfo storage userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - userStake.lastStakeTime;
        uint256 dailyReward = (userStake.amount * rewardRate) / REWARD_PRECISION;
        uint256 totalReward = (dailyReward * timeStaked) / SECONDS_PER_DAY;
        
        return totalReward > userStake.rewardDebt ? totalReward - userStake.rewardDebt : 0;
    }
    
    /**
     * @dev Función para calcular la deuda de recompensas actual
     * @param user Dirección del usuario
     * @return Deuda de recompensas actual
     */
    function calculateRewardDebt(address user) public view returns (uint256) {
        StakeInfo storage userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - userStake.lastStakeTime;
        uint256 dailyReward = (userStake.amount * rewardRate) / REWARD_PRECISION;
        return (dailyReward * timeStaked) / SECONDS_PER_DAY;
    }
    
    /**
     * @dev Función para obtener información de staking de un usuario
     * @param user Dirección del usuario
     * @return stakedAmount Cantidad en staking
     * @return pendingReward Recompensas pendientes
     * @return lastStakeTime Último tiempo de staking
     * @return timeUntilUnlock Tiempo hasta desbloqueo
     */
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingReward,
        uint256 lastStakeTime,
        uint256 timeUntilUnlock
    ) {
        StakeInfo storage userStake = stakes[user];
        uint256 timeUntilUnlock_ = 0;
        
        if (userStake.lastStakeTime + lockPeriod > block.timestamp) {
            timeUntilUnlock_ = (userStake.lastStakeTime + lockPeriod) - block.timestamp;
        }
        
        return (
            userStake.amount,
            pendingRewards(user),
            userStake.lastStakeTime,
            timeUntilUnlock_
        );
    }
    
    // Funciones de administración
    
    /**
     * @dev Función para actualizar la tasa de recompensas (solo owner)
     * @param newRate Nueva tasa de recompensas en basis points
     */
    function updateRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "Reward rate too high"); // Máximo 10%
        uint256 oldRate = rewardRate;
        rewardRate = newRate;
        emit RewardRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Función para financiar el pool de recompensas (solo owner)
     * @param amount Cantidad de tokens para añadir al pool
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        require(characatoToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }
    
    /**
     * @dev Función para actualizar el monto mínimo de staking
     * @param newMinimum Nuevo monto mínimo
     */
    function updateMinimumStakeAmount(uint256 newMinimum) external onlyOwner {
        minimumStakeAmount = newMinimum;
    }
    
    /**
     * @dev Función para actualizar el período de bloqueo
     * @param newLockPeriod Nuevo período de bloqueo en segundos
     */
    function updateLockPeriod(uint256 newLockPeriod) external onlyOwner {
        require(newLockPeriod <= 30 days, "Lock period too long");
        lockPeriod = newLockPeriod;
    }
    
    /**
     * @dev Función para pausar el contrato
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Función para reanudar el contrato
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Función de emergencia para retirar tokens (solo owner)
     * @param amount Cantidad de tokens a retirar
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(characatoToken.transfer(owner(), amount), "Transfer failed");
    }
}
