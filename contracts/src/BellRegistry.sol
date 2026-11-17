// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title BellRegistry
/// @notice ANGELUS seals each night's locked estimates (the Bell) on Robinhood Chain before Wall Street opens.
///
/// What it proves: for a trading session, the numbers ANGELUS scores itself on were written here
/// before 13:30 UTC that day, which is no later than the 09:30 ET opening bell (13:30 UTC in summer,
/// 14:30 UTC in winter). The contract refuses a seal for a session after that moment, refuses a second
/// seal for the same session, and has no function that edits or deletes one. So a published number can
/// never be quietly changed after the open.
///
/// What it does not do: hold funds, price anything, or decide anything. It stores a fingerprint (digest)
/// per session and emits the full numbers as an event, so anyone can rebuild the digest and compare.
///
/// Prices are US dollars with 6 decimals (e.g. 156_140000 = $156.14). Tickers are ASCII, left-aligned in a
/// bytes8 (e.g. "NVDA" = 0x4e56444100000000) and must be strictly ascending, which also rules out duplicates.
contract BellRegistry {
    struct Seal {
        bytes32 digest; // keccak256(abi.encode(session, tickers, closes, bells))
        uint64 sealedAt; // block timestamp of the seal
        uint16 count; // number of stocks sealed
    }

    uint256 public constant PRICE_DECIMALS = 6;
    uint256 public constant MAX_STOCKS = 64;
    /// @dev Seconds after 00:00 UTC of the session day. 09:30 ET is 13:30 UTC during daylight time
    /// and 14:30 UTC otherwise; taking the earlier one keeps every seal before the open all year.
    uint256 public constant DEADLINE_UTC = 13 hours + 30 minutes;

    address public owner;
    address public pendingOwner;
    /// @notice The only address allowed to seal. Rotated by the owner if its key is ever in doubt.
    address public keeper;
    /// @notice Latest sealed session, as yyyymmdd. Seals only move forward in time.
    uint32 public lastSession;

    mapping(uint32 session => Seal) private _seals;

    event BellSealed(uint32 indexed session, bytes32 digest, bytes8[] tickers, uint64[] closes, uint64[] bells);
    event KeeperChanged(address indexed previousKeeper, address indexed newKeeper);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error NotKeeper();
    error ZeroAddress();
    error BadLength();
    error BadDate();
    error NotNewer();
    error TooEarly();
    error TooLate();
    error BadTicker(uint256 index);
    error BadPrice(uint256 index);

    constructor(address initialOwner, address initialKeeper) {
        if (initialOwner == address(0) || initialKeeper == address(0)) revert ZeroAddress();
        owner = initialOwner;
        keeper = initialKeeper;
        emit OwnershipTransferred(address(0), initialOwner);
        emit KeeperChanged(address(0), initialKeeper);
    }

    // ---------------------------------------------------------------- sealing

    /// @notice Seal one session's locked numbers. Callable once per session, by the keeper, between
    /// 00:00 and 13:30 UTC of the session day.
    /// @param session Trading day as yyyymmdd (New York date of the opening bell being estimated).
    /// @param tickers Stock tickers, ASCII in bytes8, strictly ascending.
    /// @param closes Prior official close per stock, 6 decimals.
    /// @param bells The Bell (published estimate of the open) per stock, 6 decimals.
    function seal(uint32 session, bytes8[] calldata tickers, uint64[] calldata closes, uint64[] calldata bells)
        external
        returns (bytes32 digest)
    {
        if (msg.sender != keeper) revert NotKeeper();
        uint256 n = tickers.length;
        if (n == 0 || n > MAX_STOCKS || closes.length != n || bells.length != n) revert BadLength();
        if (session <= lastSession) revert NotNewer();

        uint256 dayStart = dayStartOf(session);
        if (block.timestamp < dayStart) revert TooEarly();
        if (block.timestamp >= dayStart + DEADLINE_UTC) revert TooLate();

        bytes8 prev;
        for (uint256 i; i < n; ++i) {
            bytes8 t = tickers[i];
            if (t == bytes8(0) || (i > 0 && t <= prev)) revert BadTicker(i);
            if (closes[i] == 0 || bells[i] == 0) revert BadPrice(i);
            prev = t;
        }

        digest = keccak256(abi.encode(session, tickers, closes, bells));
        _seals[session] = Seal({digest: digest, sealedAt: uint64(block.timestamp), count: uint16(n)});
        lastSession = session;
        emit BellSealed(session, digest, tickers, closes, bells);
    }

    // ---------------------------------------------------------------- reading

    function sealOf(uint32 session) external view returns (Seal memory) {
        return _seals[session];
    }

    /// @notice True when these exact numbers are what was sealed for the session.
    function verify(uint32 session, bytes8[] calldata tickers, uint64[] calldata closes, uint64[] calldata bells)
        external
        view
        returns (bool)
    {
        bytes32 d = _seals[session].digest;
        return d != bytes32(0) && d == keccak256(abi.encode(session, tickers, closes, bells));
    }

    /// @notice Unix time of 00:00 UTC on a yyyymmdd date. Reverts on a date that does not exist.
    function dayStartOf(uint32 yyyymmdd) public pure returns (uint256) {
        uint256 y = yyyymmdd / 10000;
        uint256 m = (yyyymmdd / 100) % 100;
        uint256 d = yyyymmdd % 100;
        if (y < 2000 || y > 2199 || m < 1 || m > 12 || d < 1 || d > _daysInMonth(y, m)) revert BadDate();
        return _daysFromCivil(y, m, d) * 1 days;
    }

    // ---------------------------------------------------------------- admin

    function setKeeper(address newKeeper) external {
        if (msg.sender != owner) revert NotOwner();
        if (newKeeper == address(0)) revert ZeroAddress();
        emit KeeperChanged(keeper, newKeeper);
        keeper = newKeeper;
    }

    /// @notice Two-step ownership transfer: the new owner must accept, so a typo cannot lose control.
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // ---------------------------------------------------------------- dates

    function _daysInMonth(uint256 y, uint256 m) private pure returns (uint256) {
        if (m == 2) return (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) ? 29 : 28;
        if (m == 4 || m == 6 || m == 9 || m == 11) return 30;
        return 31;
    }

    /// @dev Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's days_from_civil),
    /// valid for the years accepted above.
    function _daysFromCivil(uint256 y, uint256 m, uint256 d) private pure returns (uint256) {
        if (m <= 2) y -= 1;
        uint256 era = y / 400;
        uint256 yoe = y - era * 400;
        uint256 mp = m > 2 ? m - 3 : m + 9;
        uint256 doy = (153 * mp + 2) / 5 + d - 1;
        uint256 doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
        return era * 146097 + doe - 719468;
    }
}
