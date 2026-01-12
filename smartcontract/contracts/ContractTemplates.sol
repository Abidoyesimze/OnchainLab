// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ContractTemplates
 * @dev A collection of secure contract templates for DeFi developers
 * These templates follow best practices and provide auditable starting points for common use cases
 * 
 * Security Features:
 * - Multi-signature wallets enforce proper multi-sig requirements
 * - All contracts use OpenZeppelin's battle-tested libraries
 * - Reentrancy protection on all external functions
 * - Proper access control and ownership patterns
 */
contract ContractTemplates is Ownable, ReentrancyGuard {
    // Template deployment events
    event StakingContractDeployed(address indexed contractAddress, address indexed owner);
    event VestingContractDeployed(address indexed contractAddress, address indexed beneficiary);
    event MultiSigDeployed(address indexed contractAddress, address[] owners);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Deploy a basic staking contract
     * @param stakingToken Address of the token to stake
     * @param rewardToken Address of the reward token
     * @param rewardRate Reward rate per second
     * @return contractAddress Address of the deployed staking contract
     */
    function deployStakingContract(
        address stakingToken,
        address rewardToken,
        uint256 rewardRate
    ) external nonReentrant returns (address contractAddress) {
        require(stakingToken != address(0), "Invalid staking token");
        require(rewardToken != address(0), "Invalid reward token");
        require(rewardRate > 0, "Reward rate must be greater than 0");

        // Deploy new staking contract
        BasicStaking staking = new BasicStaking(stakingToken, rewardToken, rewardRate, msg.sender);

        contractAddress = address(staking);
        emit StakingContractDeployed(contractAddress, msg.sender);

        return contractAddress;
    }

    /**
     * @dev Deploy a basic vesting contract
     * @param token Address of the token to vest
     * @param beneficiary Address that will receive the tokens
     * @param totalAmount Total amount to vest
     * @param startTime When vesting starts
     * @param duration How long vesting takes
     * @return contractAddress Address of the deployed vesting contract
     */
    function deployVestingContract(
        address token,
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 duration
    ) external nonReentrant returns (address contractAddress) {
        require(token != address(0), "Invalid token");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Total amount must be greater than 0");
        require(startTime > block.timestamp, "Start time must be in the future");
        require(duration > 0, "Duration must be greater than 0");

        // Deploy new vesting contract
        BasicVesting vesting = new BasicVesting(token, beneficiary, totalAmount, startTime, duration);

        contractAddress = address(vesting);
        emit VestingContractDeployed(contractAddress, beneficiary);

        return contractAddress;
    }

    /**
     * @dev Deploy a basic multi-signature wallet
     * @param owners Array of owner addresses
     * @param requiredSignatures Number of signatures required
     * @return contractAddress Address of the deployed multi-sig wallet
     */
    function deployMultiSigWallet(
        address[] memory owners,
        uint256 requiredSignatures
    ) external nonReentrant returns (address contractAddress) {
        require(owners.length >= 2, "Multi-sig wallet requires at least 2 owners");
        require(requiredSignatures > 0, "Required signatures must be greater than 0");
        require(requiredSignatures <= owners.length, "Required signatures cannot exceed owner count");

        // Deploy new multi-sig wallet
        BasicMultiSig multiSig = new BasicMultiSig(owners, requiredSignatures);

        contractAddress = address(multiSig);
        emit MultiSigDeployed(contractAddress, owners);

        return contractAddress;
    }
}

/**
 * @title BasicStaking
 * @dev A simple staking contract template
 */
contract BasicStaking is ReentrancyGuard, Ownable {
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    uint256 public rewardRate;
    uint256 public totalStaked;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userStaked;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _stakingToken, address _rewardToken, uint256 _rewardRate, address _owner) Ownable(_owner) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");

        updateReward(msg.sender);
        totalStaked += amount;
        userStaked[msg.sender] += amount;

        stakingToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot withdraw 0");
        require(userStaked[msg.sender] >= amount, "Insufficient staked amount");

        updateReward(msg.sender);
        totalStaked -= amount;
        userStaked[msg.sender] -= amount;

        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() external nonReentrant {
        updateReward(msg.sender);
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function updateReward(address account) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalStaked);
    }

    function earned(address account) public view returns (uint256) {
        return ((userStaked[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) + rewards[account];
    }
}

/**
 * @title BasicVesting
 * @dev A simple vesting contract template
 */
contract BasicVesting is Ownable {
    IERC20 public token;
    address public beneficiary;
    uint256 public totalAmount;
    uint256 public startTime;
    uint256 public duration;
    uint256 public released;

    event TokensReleased(address indexed beneficiary, uint256 amount);

    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAmount,
        uint256 _startTime,
        uint256 _duration
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAmount = _totalAmount;
        startTime = _startTime;
        duration = _duration;
    }

    function release() external {
        require(block.timestamp >= startTime, "Vesting has not started");

        uint256 releasable = vestedAmount() - released;
        require(releasable > 0, "No tokens to release");

        released += releasable;
        token.transfer(beneficiary, releasable);
        emit TokensReleased(beneficiary, releasable);
    }

    function releasableAmount() public view returns (uint256) {
        return vestedAmount() - released;
    }

    function vestedAmount() public view returns (uint256) {
        if (block.timestamp < startTime) {
            return 0;
        } else if (block.timestamp >= startTime + duration) {
            return totalAmount;
        } else {
            return (totalAmount * (block.timestamp - startTime)) / duration;
        }
    }

    function getVestingInfo()
        external
        view
        returns (
            address _beneficiary,
            uint256 _totalAmount,
            uint256 _startTime,
            uint256 _duration,
            uint256 _released,
            uint256 _vestedAmount
        )
    {
        return (beneficiary, totalAmount, startTime, duration, released, vestedAmount());
    }
}

/**
 * @title BasicMultiSig
 * @dev A secure multi-signature wallet template following best practices
 * 
 * Best Practices Enforced:
 * - Minimum 2 owners required for true multi-signature functionality
 * - Required signatures must be less than total owners (prevents single-point-of-failure)
 * - Unique owner addresses (no duplicates)
 * - Non-zero addresses only
 * 
 * Common Configurations:
 * - 2-of-3: 3 owners, 2 signatures required (most common)
 * - 3-of-5: 5 owners, 3 signatures required (high security)
 * - 1-of-2: 2 owners, 1 signature required (simple shared wallet)
 */
contract BasicMultiSig is Ownable {
    mapping(address => bool) public isOwner;
    address[] public owners;
    uint256 public requiredSignatures;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    event TransactionSubmitted(uint256 indexed txId, address indexed owner, address to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event TransactionRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId, address indexed owner);

    modifier onlyMultiSigOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint256 _txId) {
        require(_txId < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 _txId) {
        require(!isConfirmed[_txId][msg.sender], "Transaction already confirmed");
        _;
    }

    constructor(address[] memory _owners, uint256 _requiredSignatures) Ownable(msg.sender) {
        require(_owners.length >= 2, "Multi-sig wallet requires at least 2 owners");
        require(_requiredSignatures > 0, "Required signatures must be greater than 0");
        require(_requiredSignatures <= _owners.length, "Required signatures cannot exceed owner count");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        requiredSignatures = _requiredSignatures;
    }

    function submitTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyMultiSigOwner returns (uint256 txId) {
        txId = transactions.length;
        transactions.push(Transaction({ to: _to, value: _value, data: _data, executed: false, numConfirmations: 0 }));

        emit TransactionSubmitted(txId, msg.sender, _to, _value, _data);
    }

    function confirmTransaction(
        uint256 _txId
    ) external onlyMultiSigOwner txExists(_txId) notExecuted(_txId) notConfirmed(_txId) {
        Transaction storage transaction = transactions[_txId];
        transaction.numConfirmations += 1;
        isConfirmed[_txId][msg.sender] = true;

        emit TransactionConfirmed(_txId, msg.sender);
    }

    function executeTransaction(uint256 _txId) external onlyMultiSigOwner txExists(_txId) notExecuted(_txId) {
        Transaction storage transaction = transactions[_txId];
        require(transaction.numConfirmations >= requiredSignatures, "Cannot execute transaction");

        transaction.executed = true;

        (bool success, ) = transaction.to.call{ value: transaction.value }(transaction.data);
        require(success, "Transaction execution failed");

        emit TransactionExecuted(_txId, msg.sender);
    }

    function revokeConfirmation(uint256 _txId) external onlyMultiSigOwner txExists(_txId) notExecuted(_txId) {
        Transaction storage transaction = transactions[_txId];
        require(isConfirmed[_txId][msg.sender], "Transaction already confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txId][msg.sender] = false;

        emit TransactionRevoked(_txId, msg.sender);
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(
        uint256 _txId
    ) external view returns (address to, uint256 value, bytes memory data, bool executed, uint256 numConfirmations) {
        Transaction storage transaction = transactions[_txId];
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }

    /**
     * @dev Get multi-sig configuration
     * @return _owners Array of owner addresses
     * @return _requiredSignatures Number of signatures required
     * @return _totalOwners Total number of owners
     */
    function getMultiSigConfig() external view returns (
        address[] memory _owners,
        uint256 _requiredSignatures,
        uint256 _totalOwners
    ) {
        return (owners, requiredSignatures, owners.length);
    }

    /**
     * @dev Check if an address is an owner
     * @param _address Address to check
     * @return True if address is an owner
     */
    function isMultiSigOwner(address _address) external view returns (bool) {
        return isOwner[_address];
    }

    receive() external payable {}
}
